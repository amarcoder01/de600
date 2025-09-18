#!/usr/bin/env python3
"""
Advanced AI-Powered Market Predictions Engine
Uses multiple machine learning models for accurate predictions
"""

import argparse
import json
import sys
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import yfinance as yf
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import warnings
warnings.filterwarnings('ignore')

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class AdvancedAIPredictor:
    def __init__(self):
        self.models = {
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'gradient_boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'linear_regression': LinearRegression(),
            'ridge': Ridge(alpha=1.0)
        }
        self.scaler = StandardScaler()
        self.feature_columns = []
        
    def get_technical_indicators(self, df):
        """Calculate advanced technical indicators"""
        # Price-based features
        df['SMA_5'] = df['Close'].rolling(window=5).mean()
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['EMA_12'] = df['Close'].ewm(span=12).mean()
        df['EMA_26'] = df['Close'].ewm(span=26).mean()
        
        # RSI
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # MACD
        df['MACD'] = df['EMA_12'] - df['EMA_26']
        df['MACD_Signal'] = df['MACD'].ewm(span=9).mean()
        df['MACD_Histogram'] = df['MACD'] - df['MACD_Signal']
        
        # Bollinger Bands
        df['BB_Middle'] = df['Close'].rolling(window=20).mean()
        bb_std = df['Close'].rolling(window=20).std()
        df['BB_Upper'] = df['BB_Middle'] + (bb_std * 2)
        df['BB_Lower'] = df['BB_Middle'] - (bb_std * 2)
        df['BB_Position'] = (df['Close'] - df['BB_Lower']) / (df['BB_Upper'] - df['BB_Lower'])
        
        # Volume indicators
        df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
        
        # Price momentum
        df['Price_Change'] = df['Close'].pct_change()
        df['Price_Change_5'] = df['Close'].pct_change(periods=5)
        df['Price_Change_20'] = df['Close'].pct_change(periods=20)
        
        # Volatility
        df['Volatility'] = df['Price_Change'].rolling(window=20).std()
        
        # Support and Resistance levels
        df['Support'] = df['Low'].rolling(window=20).min()
        df['Resistance'] = df['High'].rolling(window=20).max()
        df['Price_Position'] = (df['Close'] - df['Support']) / (df['Resistance'] - df['Support'])
        
        return df
    
    def prepare_features(self, df):
        """Prepare features for ML models"""
        # Get technical indicators
        df = self.get_technical_indicators(df)
        
        # Define feature columns
        self.feature_columns = [
            'Open', 'High', 'Low', 'Close', 'Volume',
            'SMA_5', 'SMA_20', 'EMA_12', 'EMA_26',
            'RSI', 'MACD', 'MACD_Signal', 'MACD_Histogram',
            'BB_Position', 'Volume_Ratio',
            'Price_Change', 'Price_Change_5', 'Price_Change_20',
            'Volatility', 'Price_Position'
        ]
        
        # Remove rows with NaN values
        df = df.dropna()
        
        return df
    
    def train_models(self, df):
        """Train multiple ML models"""
        # Prepare features
        df = self.prepare_features(df)
        
        # Create target variable (next day's close price)
        df['Target'] = df['Close'].shift(-1)
        
        # Remove the last row (no target) and first few rows (NaN from indicators)
        df = df.dropna()
        
        # Prepare X and y
        X = df[self.feature_columns]
        y = df['Target']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train models
        trained_models = {}
        for name, model in self.models.items():
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
            mae = mean_absolute_error(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            trained_models[name] = {
                'model': model,
                'mae': mae,
                'mse': mse,
                'rmse': np.sqrt(mse)
            }
        
        return trained_models, df
    
    def predict_next_day(self, df, trained_models):
        """Predict next day's price"""
        # Get the latest data point
        latest_data = df[self.feature_columns].iloc[-1:].values
        latest_data_scaled = self.scaler.transform(latest_data)
        
        # Get predictions from all models
        predictions = []
        weights = []
        
        for name, model_info in trained_models.items():
            pred = model_info['model'].predict(latest_data_scaled)[0]
            predictions.append(pred)
            # Weight based on model performance (lower RMSE = higher weight)
            weight = 1 / (1 + model_info['rmse'])
            weights.append(weight)
        
        # Calculate weighted average prediction
        weights = np.array(weights) / np.sum(weights)
        weighted_prediction = np.sum(np.array(predictions) * weights)
        
        # Calculate confidence based on model agreement
        prediction_std = np.std(predictions)
        confidence = max(0.1, min(0.95, 1 - (prediction_std / weighted_prediction)))
        
        return weighted_prediction, confidence, predictions
    
    def generate_signal(self, current_price, predicted_price, confidence):
        """Generate buy/sell/hold signal"""
        change_percent = (predicted_price - current_price) / current_price
        
        if change_percent > 0.02 and confidence > 0.6:  # 2% increase with high confidence
            signal = 'buy'
        elif change_percent < -0.02 and confidence > 0.6:  # 2% decrease with high confidence
            signal = 'sell'
        else:
            signal = 'hold'
        
        return signal, change_percent
    
    def predict_multi_day(self, df, trained_models, days):
        """Predict prices for multiple days"""
        projections = []
        current_df = df.copy()
        
        for i in range(days):
            try:
                # Predict next day
                pred_price, confidence, _ = self.predict_next_day(current_df, trained_models)
                
                # Create next day's data point
                next_date = current_df.index[-1] + timedelta(days=1)
                
                # Simple projection of features
                last_row = current_df.iloc[-1:].copy()
                last_row.index = [next_date]
                last_row['Close'] = pred_price
                last_row['Open'] = pred_price * 0.999  # Slight variation
                last_row['High'] = pred_price * 1.005
                last_row['Low'] = pred_price * 0.995
                last_row['Volume'] = last_row['Volume'] * 0.95  # Slight decrease
                
                # Update technical indicators
                current_df = pd.concat([current_df, last_row])
                current_df = self.prepare_features(current_df)
                
                # Ensure we have enough data for the next prediction
                if len(current_df) < 20:
                    break
                
                projections.append({
                    'date': next_date.strftime('%Y-%m-%d'),
                    'price': round(pred_price, 2),
                    'confidence': round(confidence, 3)
                })
                
            except Exception as e:
                print(f"Error in multi-day prediction step {i}: {e}")
                break
        
        return projections
    
    def get_top_stocks(self, count=10):
        """Get top stocks for ranking"""
        # Popular stocks for analysis
        popular_stocks = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
            'AMD', 'INTC', 'CRM', 'ADBE', 'PYPL', 'UBER', 'LYFT', 'ZM',
            'SQ', 'SHOP', 'ROKU', 'SPOT', 'SNAP', 'TWTR', 'PINS', 'ZM'
        ]
        
        top_stocks = []
        
        for symbol in popular_stocks[:count]:
            try:
                # Get stock data
                stock = yf.Ticker(symbol)
                hist = stock.history(period='6mo')
                
                if len(hist) < 50:
                    continue
                
                # Train models and predict
                trained_models, df = self.train_models(hist)
                pred_price, confidence, _ = self.predict_next_day(df, trained_models)
                current_price = hist['Close'].iloc[-1]
                signal, _ = self.generate_signal(current_price, pred_price, confidence)
                
                # Calculate score based on multiple factors
                price_change_5d = (current_price - hist['Close'].iloc[-5]) / hist['Close'].iloc[-5]
                price_change_20d = (current_price - hist['Close'].iloc[-20]) / hist['Close'].iloc[-20]
                volume_ratio = hist['Volume'].iloc[-5:].mean() / hist['Volume'].iloc[-20:].mean()
                
                score = (
                    confidence * 0.4 +
                    abs(price_change_5d) * 0.3 +
                    abs(price_change_20d) * 0.2 +
                    min(volume_ratio, 2.0) * 0.1
                )
                
                top_stocks.append({
                    'symbol': symbol,
                    'score': round(score, 3),
                    'signal': signal,
                    'confidence': round(confidence, 3),
                    'price_target': round(pred_price, 2),
                    'current_price': round(current_price, 2)
                })
                
            except Exception as e:
                print(f"Error processing {symbol}: {e}")
                continue
        
        # Sort by score and return top stocks
        top_stocks.sort(key=lambda x: x['score'], reverse=True)
        return top_stocks[:count]
    
    def analyze_market_trend(self):
        """Analyze overall market trend"""
        # Use SPY as market proxy
        try:
            spy = yf.Ticker('SPY')
            hist = spy.history(period='3mo')
            
            if len(hist) < 30:
                return {
                    'trend': 'sideways',
                    'confidence': 0.5,
                    'duration': '1-2 weeks',
                    'reasoning': 'Insufficient data for trend analysis'
                }
            
            # Calculate trend indicators
            sma_20 = hist['Close'].rolling(window=20).mean()
            sma_50 = hist['Close'].rolling(window=50).mean()
            
            current_price = hist['Close'].iloc[-1]
            current_sma_20 = sma_20.iloc[-1]
            current_sma_50 = sma_50.iloc[-1]
            
            # Price momentum
            price_change_5d = (current_price - hist['Close'].iloc[-5]) / hist['Close'].iloc[-5]
            price_change_20d = (current_price - hist['Close'].iloc[-20]) / hist['Close'].iloc[-20]
            
            # Volume trend
            recent_volume = hist['Volume'].iloc[-5:].mean()
            avg_volume = hist['Volume'].iloc[-20:].mean()
            volume_trend = recent_volume / avg_volume
            
            # Determine trend
            bullish_signals = 0
            bearish_signals = 0
            
            if current_price > current_sma_20:
                bullish_signals += 1
            else:
                bearish_signals += 1
                
            if current_sma_20 > current_sma_50:
                bullish_signals += 1
            else:
                bearish_signals += 1
                
            if price_change_5d > 0:
                bullish_signals += 1
            else:
                bearish_signals += 1
                
            if price_change_20d > 0:
                bullish_signals += 1
            else:
                bearish_signals += 1
                
            if volume_trend > 1.2:
                bullish_signals += 1
            elif volume_trend < 0.8:
                bearish_signals += 1
            
            # Determine trend and confidence
            if bullish_signals >= 4:
                trend = 'bullish'
                confidence = min(0.9, 0.5 + (bullish_signals - 3) * 0.1)
            elif bearish_signals >= 4:
                trend = 'bearish'
                confidence = min(0.9, 0.5 + (bearish_signals - 3) * 0.1)
            else:
                trend = 'sideways'
                confidence = 0.6
            
            # Generate reasoning
            if trend == 'bullish':
                reasoning = f"Market showing bullish signals with {bullish_signals}/5 positive indicators. Price above moving averages with positive momentum."
            elif trend == 'bearish':
                reasoning = f"Market showing bearish signals with {bearish_signals}/5 negative indicators. Price below moving averages with negative momentum."
            else:
                reasoning = "Market showing mixed signals with no clear directional bias. Sideways consolidation likely."
            
            return {
                'trend': trend,
                'confidence': round(confidence, 3),
                'duration': '2-4 weeks',
                'reasoning': reasoning
            }
            
        except Exception as e:
            return {
                'trend': 'sideways',
                'confidence': 0.5,
                'duration': '1-2 weeks',
                'reasoning': f'Error analyzing market trend: {str(e)}'
            }

def main():
    parser = argparse.ArgumentParser(description='AI Predictions Engine')
    parser.add_argument('--symbol', help='Stock symbol (required for nextDay and multiDay predictions)')
    parser.add_argument('--prediction_type', required=True, 
                       choices=['nextDay', 'multiDay', 'ranking', 'marketTrend'],
                       help='Type of prediction')
    parser.add_argument('--forecast_days', type=int, default=7, help='Number of days to forecast')
    parser.add_argument('--top_stocks_count', type=int, default=10, help='Number of top stocks')
    
    args = parser.parse_args()
    
    try:
        predictor = AdvancedAIPredictor()
        
        if args.prediction_type == 'nextDay':
            if not args.symbol:
                raise ValueError("Symbol is required for nextDay prediction")
            
            # Get stock data
            stock = yf.Ticker(args.symbol)
            hist = stock.history(period='6mo')
            
            if len(hist) < 50:
                raise ValueError(f"Insufficient data for {args.symbol}")
            
            # Train models and predict
            trained_models, df = predictor.train_models(hist)
            pred_price, confidence, _ = predictor.predict_next_day(df, trained_models)
            current_price = hist['Close'].iloc[-1]
            signal, change_percent = predictor.generate_signal(current_price, pred_price, confidence)
            
            result = {
                'nextDay': {
                    'signal': signal,
                    'confidence': confidence,
                    'price_target': round(pred_price, 2),
                    'current_price': round(current_price, 2),
                    'change_percent': round(change_percent, 4)
                }
            }
            
        elif args.prediction_type == 'multiDay':
            if not args.symbol:
                raise ValueError("Symbol is required for multiDay prediction")
            
            # Get stock data
            stock = yf.Ticker(args.symbol)
            hist = stock.history(period='6mo')
            
            if len(hist) < 50:
                raise ValueError(f"Insufficient data for {args.symbol}")
            
            # Train models and predict
            trained_models, df = predictor.train_models(hist)
            projections = predictor.predict_multi_day(df, trained_models, args.forecast_days)
            
            if not projections:
                raise ValueError(f"Failed to generate projections for {args.symbol}")
            
            result = {
                'multiDay': {
                    'days': len(projections),
                    'projections': projections
                }
            }
            
        elif args.prediction_type == 'ranking':
            # Get top stocks
            top_stocks = predictor.get_top_stocks(args.top_stocks_count)
            
            result = {
                'ranking': {
                    'top_stocks': top_stocks
                }
            }
            
        elif args.prediction_type == 'marketTrend':
            # Analyze market trend
            market_trend = predictor.analyze_market_trend()
            
            result = {
                'marketTrend': market_trend
            }
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            'error': str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
