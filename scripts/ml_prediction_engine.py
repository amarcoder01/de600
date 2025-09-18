#!/usr/bin/env python3
"""
Advanced Machine Learning Prediction Engine
Implements LSTM, XGBoost, and ensemble models for stock prediction
"""

import numpy as np
import pandas as pd
import yfinance as yf
import warnings
warnings.filterwarnings('ignore')

from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import TimeSeriesSplit
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Try to import advanced ML libraries
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
    print("XGBoost loaded successfully")
except ImportError as e:
    print(f"XGBoost not available: {str(e)}")
    XGBOOST_AVAILABLE = False

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
    print("LightGBM loaded successfully")
except ImportError as e:
    print(f"LightGBM not available: {str(e)}")
    LIGHTGBM_AVAILABLE = False

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    # Suppress TensorFlow warnings
    tf.get_logger().setLevel('ERROR')
    TENSORFLOW_AVAILABLE = True
    print("TensorFlow loaded successfully")
except ImportError as e:
    print(f"TensorFlow not available: {str(e)}. LSTM models will be disabled.")
    TENSORFLOW_AVAILABLE = False

import json
import logging
from datetime import datetime, timedelta
import os
import sys

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TechnicalIndicators:
    """Calculate various technical indicators for feature engineering"""
    
    @staticmethod
    def calculate_rsi(prices, period=14):
        """Calculate Relative Strength Index"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    @staticmethod
    def calculate_macd(prices, fast=12, slow=26, signal=9):
        """Calculate MACD"""
        ema_fast = prices.ewm(span=fast).mean()
        ema_slow = prices.ewm(span=slow).mean()
        macd = ema_fast - ema_slow
        signal_line = macd.ewm(span=signal).mean()
        histogram = macd - signal_line
        return macd, signal_line, histogram
    
    @staticmethod
    def calculate_bollinger_bands(prices, period=20, std_dev=2):
        """Calculate Bollinger Bands"""
        sma = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        upper = sma + (std * std_dev)
        lower = sma - (std * std_dev)
        return upper, sma, lower
    
    @staticmethod
    def calculate_stochastic(high, low, close, period=14):
        """Calculate Stochastic Oscillator"""
        lowest_low = low.rolling(window=period).min()
        highest_high = high.rolling(window=period).max()
        k_percent = 100 * ((close - lowest_low) / (highest_high - lowest_low))
        d_percent = k_percent.rolling(window=3).mean()
        return k_percent, d_percent
    
    @staticmethod
    def calculate_williams_r(high, low, close, period=14):
        """Calculate Williams %R"""
        highest_high = high.rolling(window=period).max()
        lowest_low = low.rolling(window=period).min()
        williams_r = -100 * ((highest_high - close) / (highest_high - lowest_low))
        return williams_r
    
    @staticmethod
    def calculate_atr(high, low, close, period=14):
        """Calculate Average True Range"""
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        return atr

class DataProcessor:
    """Handle data fetching and feature engineering"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.price_scaler = MinMaxScaler()
        
    def fetch_stock_data(self, symbol, period='2y'):
        """Fetch stock data from Yahoo Finance"""
        try:
            logger.info(f"Fetching data for {symbol}...")
            stock = yf.Ticker(symbol)
            df = stock.history(period=period)
            
            if df.empty:
                raise ValueError(f"No data found for symbol {symbol}")
            
            logger.info(f"Fetched {len(df)} days of data for {symbol}")
            return df
        
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            return None
    
    def create_features(self, df):
        """Create comprehensive feature set"""
        features_df = df.copy()
        
        # Price-based features
        features_df['returns'] = df['Close'].pct_change()
        features_df['log_returns'] = np.log(df['Close'] / df['Close'].shift(1))
        features_df['price_change'] = df['Close'] - df['Open']
        features_df['price_range'] = df['High'] - df['Low']
        features_df['gap'] = df['Open'] - df['Close'].shift(1)
        
        # Moving averages
        for period in [5, 10, 20, 50, 200]:
            features_df[f'sma_{period}'] = df['Close'].rolling(window=period).mean()
            features_df[f'ema_{period}'] = df['Close'].ewm(span=period).mean()
            features_df[f'price_vs_sma_{period}'] = df['Close'] / features_df[f'sma_{period}'] - 1
        
        # Volatility features
        features_df['volatility_5'] = df['Close'].pct_change().rolling(window=5).std()
        features_df['volatility_20'] = df['Close'].pct_change().rolling(window=20).std()
        features_df['volatility_50'] = df['Close'].pct_change().rolling(window=50).std()
        
        # Volume features
        features_df['volume_sma_20'] = df['Volume'].rolling(window=20).mean()
        features_df['volume_ratio'] = df['Volume'] / features_df['volume_sma_20']
        features_df['price_volume'] = df['Close'] * df['Volume']
        
        # Technical indicators
        features_df['rsi'] = TechnicalIndicators.calculate_rsi(df['Close'])
        macd, macd_signal, macd_hist = TechnicalIndicators.calculate_macd(df['Close'])
        features_df['macd'] = macd
        features_df['macd_signal'] = macd_signal
        features_df['macd_histogram'] = macd_hist
        
        bb_upper, bb_middle, bb_lower = TechnicalIndicators.calculate_bollinger_bands(df['Close'])
        features_df['bb_upper'] = bb_upper
        features_df['bb_middle'] = bb_middle
        features_df['bb_lower'] = bb_lower
        features_df['bb_width'] = (bb_upper - bb_lower) / bb_middle
        features_df['bb_position'] = (df['Close'] - bb_lower) / (bb_upper - bb_lower)
        
        stoch_k, stoch_d = TechnicalIndicators.calculate_stochastic(df['High'], df['Low'], df['Close'])
        features_df['stoch_k'] = stoch_k
        features_df['stoch_d'] = stoch_d
        
        features_df['williams_r'] = TechnicalIndicators.calculate_williams_r(df['High'], df['Low'], df['Close'])
        features_df['atr'] = TechnicalIndicators.calculate_atr(df['High'], df['Low'], df['Close'])
        
        # Lag features
        for lag in [1, 2, 3, 5, 10]:
            features_df[f'close_lag_{lag}'] = df['Close'].shift(lag)
            features_df[f'volume_lag_{lag}'] = df['Volume'].shift(lag)
            features_df[f'returns_lag_{lag}'] = features_df['returns'].shift(lag)
        
        # Time-based features
        features_df['day_of_week'] = df.index.dayofweek
        features_df['month'] = df.index.month
        features_df['quarter'] = df.index.quarter
        
        # Drop rows with NaN values
        features_df = features_df.dropna()
        
        logger.info(f"Created {len(features_df.columns)} features")
        return features_df
    
    def prepare_lstm_data(self, df, target_col='Close', sequence_length=60, forecast_horizon=1):
        """Prepare data for LSTM model"""
        # Scale the data
        scaled_data = self.price_scaler.fit_transform(df[[target_col]])
        
        X, y = [], []
        for i in range(sequence_length, len(scaled_data) - forecast_horizon + 1):
            X.append(scaled_data[i-sequence_length:i, 0])
            y.append(scaled_data[i + forecast_horizon - 1, 0])
        
        return np.array(X), np.array(y)
    
    def prepare_ml_data(self, features_df, target_col='Close', forecast_horizon=1):
        """Prepare data for traditional ML models"""
        # Select relevant features (exclude target and non-numeric columns)
        feature_cols = [col for col in features_df.columns if col not in [target_col, 'Dividends', 'Stock Splits']]
        feature_cols = [col for col in feature_cols if features_df[col].dtype in ['float64', 'int64']]
        
        X = features_df[feature_cols].values
        y = features_df[target_col].shift(-forecast_horizon).values
        
        # Remove NaN values
        mask = ~np.isnan(y)
        X = X[mask]
        y = y[mask]
        
        return X, y, feature_cols

class LSTMModel:
    """LSTM Neural Network for time series prediction"""
    
    def __init__(self, sequence_length=60, units=50):
        self.sequence_length = sequence_length
        self.units = units
        self.model = None
        self.is_trained = False
        
    def build_model(self, input_shape):
        """Build LSTM model architecture"""
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for LSTM models")
        
        model = Sequential([
            LSTM(self.units, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            BatchNormalization(),
            
            LSTM(self.units, return_sequences=True),
            Dropout(0.2),
            BatchNormalization(),
            
            LSTM(self.units),
            Dropout(0.2),
            
            Dense(25),
            Dense(1)
        ])
        
        model.compile(optimizer=Adam(learning_rate=0.001), loss='mse', metrics=['mae'])
        return model
    
    def train(self, X_train, y_train, X_val, y_val, epochs=100, batch_size=32):
        """Train the LSTM model"""
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for LSTM models")
        
        # Reshape data for LSTM
        X_train = X_train.reshape((X_train.shape[0], X_train.shape[1], 1))
        X_val = X_val.reshape((X_val.shape[0], X_val.shape[1], 1))
        
        # Build model
        self.model = self.build_model((X_train.shape[1], 1))
        
        # Callbacks
        early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
        reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=5, min_lr=0.0001)
        
        # Train model
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stopping, reduce_lr],
            verbose=1
        )
        
        self.is_trained = True
        return history
    
    def predict(self, X):
        """Make predictions"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        X = X.reshape((X.shape[0], X.shape[1], 1))
        return self.model.predict(X)

class MLEnsemble:
    """Ensemble of multiple ML models"""
    
    def __init__(self):
        self.models = {
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
            'gradient_boosting': GradientBoostingRegressor(n_estimators=100, random_state=42)
        }
        
        # Add XGBoost if available
        if XGBOOST_AVAILABLE:
            self.models['xgboost'] = xgb.XGBRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        
        # Add LightGBM if available
        if LIGHTGBM_AVAILABLE:
            self.models['lightgbm'] = lgb.LGBMRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        
        # Add LSTM if TensorFlow is available
        if TENSORFLOW_AVAILABLE:
            self.models['lstm'] = LSTMModel()
        
        self.trained_models = {}
        self.feature_importance = {}
        self.model_weights = {}
        
    def train_traditional_models(self, X_train, y_train, X_val, y_val):
        """Train traditional ML models"""
        # Only train models that are available
        available_traditional_models = [name for name in ['random_forest', 'gradient_boosting', 'xgboost', 'lightgbm'] 
                                       if name in self.models]
        
        for name in available_traditional_models:
            logger.info(f"Training {name}...")
            model = self.models[name]
            model.fit(X_train, y_train)
            
            # Validate
            val_pred = model.predict(X_val)
            val_mse = mean_squared_error(y_val, val_pred)
            val_mae = mean_absolute_error(y_val, val_pred)
            val_r2 = r2_score(y_val, val_pred)
            
            self.trained_models[name] = model
            
            # Store feature importance if available
            if hasattr(model, 'feature_importances_'):
                self.feature_importance[name] = model.feature_importances_
            
            logger.info(f"{name} - MSE: {val_mse:.6f}, MAE: {val_mae:.6f}, R²: {val_r2:.4f}")
    
    def train_lstm_model(self, X_lstm_train, y_lstm_train, X_lstm_val, y_lstm_val):
        """Train LSTM model"""
        if not TENSORFLOW_AVAILABLE:
            logger.warning("Skipping LSTM training - TensorFlow not available")
            return
        
        logger.info("Training LSTM...")
        lstm_model = self.models['lstm']
        lstm_model.train(X_lstm_train, y_lstm_train, X_lstm_val, y_lstm_val, epochs=50)
        self.trained_models['lstm'] = lstm_model
    
    def calculate_model_weights(self, X_val, y_val, X_lstm_val, y_lstm_val, price_scaler):
        """Calculate ensemble weights based on validation performance"""
        weights = {}
        
        for name, model in self.trained_models.items():
            if name == 'lstm':
                if TENSORFLOW_AVAILABLE:
                    pred_scaled = model.predict(X_lstm_val)
                    pred = price_scaler.inverse_transform(pred_scaled.reshape(-1, 1)).flatten()
                    actual = price_scaler.inverse_transform(y_lstm_val.reshape(-1, 1)).flatten()
                else:
                    continue
            else:
                pred = model.predict(X_val)
                actual = y_val
            
            mse = mean_squared_error(actual, pred)
            weights[name] = 1 / (1 + mse)  # Inverse MSE weighting
        
        # Normalize weights
        total_weight = sum(weights.values())
        self.model_weights = {name: weight / total_weight for name, weight in weights.items()}
        
        logger.info(f"Model weights: {self.model_weights}")
    
    def predict(self, X, X_lstm, price_scaler):
        """Make ensemble predictions"""
        predictions = {}
        
        for name, model in self.trained_models.items():
            if name == 'lstm':
                if TENSORFLOW_AVAILABLE:
                    pred_scaled = model.predict(X_lstm)
                    pred = price_scaler.inverse_transform(pred_scaled.reshape(-1, 1)).flatten()
                    predictions[name] = pred
            else:
                predictions[name] = model.predict(X)
        
        # Weighted ensemble
        if predictions:
            ensemble_pred = np.zeros(len(list(predictions.values())[0]))
            for name, pred in predictions.items():
                weight = self.model_weights.get(name, 0)
                ensemble_pred += weight * pred
            
            return ensemble_pred, predictions
        else:
            return None, {}

class MLPredictionEngine:
    """Main ML Prediction Engine"""
    
    def __init__(self):
        self.data_processor = DataProcessor()
        self.ensemble = MLEnsemble()
        self.is_trained = False
        
    def train_models(self, symbol, period='2y', test_size=0.2):
        """Train all models on historical data"""
        logger.info(f"Training ML models for {symbol}...")
        
        # Fetch and prepare data
        df = self.data_processor.fetch_stock_data(symbol, period)
        if df is None:
            return False
        
        features_df = self.data_processor.create_features(df)
        
        # Prepare data for traditional ML models
        X, y, feature_cols = self.data_processor.prepare_ml_data(features_df)
        
        # Train-test split (time series aware)
        split_idx = int(len(X) * (1 - test_size))
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        
        # Scale features
        X_train_scaled = self.data_processor.scaler.fit_transform(X_train)
        X_val_scaled = self.data_processor.scaler.transform(X_val)
        
        # Train traditional models
        self.ensemble.train_traditional_models(X_train_scaled, y_train, X_val_scaled, y_val)
        
        # Prepare and train LSTM if available
        if TENSORFLOW_AVAILABLE:
            X_lstm, y_lstm = self.data_processor.prepare_lstm_data(features_df)
            lstm_split = int(len(X_lstm) * (1 - test_size))
            X_lstm_train, X_lstm_val = X_lstm[:lstm_split], X_lstm[lstm_split:]
            y_lstm_train, y_lstm_val = y_lstm[:lstm_split], y_lstm[lstm_split:]
            
            self.ensemble.train_lstm_model(X_lstm_train, y_lstm_train, X_lstm_val, y_lstm_val)
        else:
            X_lstm_val, y_lstm_val = None, None
        
        # Calculate ensemble weights
        self.ensemble.calculate_model_weights(X_val_scaled, y_val, X_lstm_val, y_lstm_val, self.data_processor.price_scaler)
        
        self.is_trained = True
        logger.info("Model training completed!")
        return True
    
    def predict_next_day(self, symbol):
        """Predict next day price"""
        if not self.is_trained:
            logger.error("Models must be trained before making predictions")
            return None
        
        # Fetch latest data
        df = self.data_processor.fetch_stock_data(symbol, period='1y')
        if df is None:
            return None
        
        features_df = self.data_processor.create_features(df)
        
        # Prepare data for prediction
        X, _, _ = self.data_processor.prepare_ml_data(features_df)
        X_scaled = self.data_processor.scaler.transform(X[-1:])  # Latest data point
        
        # LSTM data
        X_lstm = None
        if TENSORFLOW_AVAILABLE:
            X_lstm, _ = self.data_processor.prepare_lstm_data(features_df)
            X_lstm = X_lstm[-1:]  # Latest sequence
        
        # Make ensemble prediction
        ensemble_pred, individual_preds = self.ensemble.predict(X_scaled, X_lstm, self.data_processor.price_scaler)
        
        current_price = df['Close'].iloc[-1]
        
        if ensemble_pred is not None:
            predicted_price = ensemble_pred[0]
            change_percent = ((predicted_price - current_price) / current_price) * 100
            
            return {
                'current_price': float(current_price),
                'predicted_price': float(predicted_price),
                'change_percent': float(change_percent),
                'individual_predictions': {name: float(pred[0]) for name, pred in individual_preds.items()},
                'model_weights': self.ensemble.model_weights,
                'confidence': self._calculate_prediction_confidence(individual_preds)
            }
        
        return None
    
    def _calculate_prediction_confidence(self, predictions):
        """Calculate confidence based on model agreement"""
        if len(predictions) < 2:
            return 0.5
        
        pred_values = list(predictions.values())
        mean_pred = np.mean([pred[0] for pred in pred_values])
        std_pred = np.std([pred[0] for pred in pred_values])
        
        # Lower standard deviation = higher confidence
        confidence = max(0.3, min(0.95, 1 - (std_pred / mean_pred)))
        return float(confidence)

def main():
    """Main function for CLI usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description='ML Stock Prediction Engine')
    parser.add_argument('command', choices=['train', 'predict'], help='Command to execute')
    parser.add_argument('--symbol', required=True, help='Stock symbol')
    parser.add_argument('--period', default='2y', help='Data period for training')
    parser.add_argument('--output', help='Output file for results')
    
    args = parser.parse_args()
    
    engine = MLPredictionEngine()
    
    if args.command == 'train':
        success = engine.train_models(args.symbol, args.period)
        result = {'success': success, 'message': 'Training completed' if success else 'Training failed'}
    
    elif args.command == 'predict':
        # For prediction, we need to train first (in a real system, we'd load pre-trained models)
        logger.info("Training models before prediction...")
        success = engine.train_models(args.symbol, args.period)
        
        if success:
            prediction = engine.predict_next_day(args.symbol)
            result = {'success': True, 'prediction': prediction}
        else:
            result = {'success': False, 'message': 'Training failed'}
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)
    else:
        print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
