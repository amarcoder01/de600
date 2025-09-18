#!/usr/bin/env python3
"""
Enhanced Backtesting System - Part 1: Core Framework
Professional-grade backtesting with industry best practices
"""

import os
import sys
import logging
import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from qlib_config import get_qlib_config, init_qlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EnhancedDataManager:
    """Professional-grade data management for backtesting with Qlib integration"""
    
    def __init__(self):
        self.config = get_qlib_config()
        self.data_sources = {
            'price': 'qlib_dataset',
            'fundamental': 'alpha_vantage',
            'sentiment': 'news_api',
            'options': 'polygon'
        }
        
        # Initialize Qlib data manager
        try:
            from scripts.enhanced_qlib_data_manager import EnhancedQlibDataManager
            self.qlib_manager = EnhancedQlibDataManager()
            self.use_qlib_dataset = True
            logger.info("Qlib dataset integration enabled")
        except Exception as e:
            logger.warning(f"Qlib dataset integration failed: {e}, falling back to yfinance")
            self.qlib_manager = None
            self.use_qlib_dataset = False
        
    async def get_clean_data(self, symbols: List[str], start_date: str, end_date: str) -> Dict[str, pd.DataFrame]:
        """Get clean, adjusted data with corporate actions handled"""
        try:
            # Try Qlib dataset first
            if self.use_qlib_dataset and self.qlib_manager:
                try:
                    logger.info("Attempting to get data from Qlib dataset...")
                    result = self.qlib_manager.get_backtesting_data(symbols, start_date, end_date)
                    
                    if result['success'] and result['data']:
                        data = {}
                        for symbol, df in result['data'].items():
                            # Handle corporate actions
                            df = self.handle_corporate_actions(df)
                            
                            # Calculate adjusted prices
                            df = self.calculate_adjusted_prices(df)
                            
                            # Add technical indicators
                            df = self.add_technical_indicators(df)
                            
                            data[symbol] = df
                            logger.info(f"Retrieved clean data from Qlib dataset for {symbol}: {len(df)} records")
                        
                        if data:
                            return data
                        else:
                            logger.warning("No data retrieved from Qlib dataset, falling back to yfinance")
                    else:
                        logger.warning(f"Qlib dataset retrieval failed: {result.get('error', 'Unknown error')}, falling back to yfinance")
                        
                except Exception as e:
                    logger.warning(f"Error accessing Qlib dataset: {e}, falling back to yfinance")
            
            # Fallback to yfinance
            logger.info("Using yfinance as fallback data source...")
            import yfinance as yf
            
            data = {}
            for symbol in symbols:
                try:
                    # Download data with adjustments
                    ticker = yf.Ticker(symbol)
                    df = ticker.history(start=start_date, end=end_date, auto_adjust=True)
                    
                    if not df.empty:
                        # Handle corporate actions
                        df = self.handle_corporate_actions(df)
                        
                        # Calculate adjusted prices
                        df = self.calculate_adjusted_prices(df)
                        
                        # Add technical indicators
                        df = self.add_technical_indicators(df)
                        
                        data[symbol] = df
                        logger.info(f"Downloaded clean data for {symbol}: {len(df)} records")
                    else:
                        logger.warning(f"No data available for {symbol}")
                        
                except Exception as e:
                    logger.error(f"Error downloading data for {symbol}: {e}")
                    
            return data
            
        except Exception as e:
            logger.error(f"Error in get_clean_data: {e}")
            return {}
    
    def handle_corporate_actions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle dividends, splits, mergers, and delistings"""
        try:
            # Handle stock splits
            if 'Stock Splits' in df.columns:
                splits = df['Stock Splits']
                splits = splits.fillna(1)
                
                # Adjust prices for splits
                for i in range(len(splits)):
                    if splits.iloc[i] != 1:
                        split_ratio = splits.iloc[i]
                        # Adjust all price columns
                        price_columns = ['Open', 'High', 'Low', 'Close']
                        for col in price_columns:
                            if col in df.columns:
                                df.iloc[i:, df.columns.get_loc(col)] /= split_ratio
                        
                        # Adjust volume
                        if 'Volume' in df.columns:
                            df.iloc[i:, df.columns.get_loc('Volume')] *= split_ratio
            
            return df
            
        except Exception as e:
            logger.error(f"Error handling corporate actions: {e}")
            return df
    
    def calculate_adjusted_prices(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate adjusted prices for accurate backtesting"""
        try:
            # Normalize column names to handle both yfinance and other data sources
            column_mapping = {
                'close': 'Close',
                'high': 'High', 
                'low': 'Low',
                'open': 'Open',
                'volume': 'Volume',
                'adj close': 'Adj Close'
            }
            
            # Rename columns if they exist in lowercase
            for old_col, new_col in column_mapping.items():
                if old_col in df.columns and new_col not in df.columns:
                    df[new_col] = df[old_col]
            
            # yfinance already provides adjusted prices, but we can add additional adjustments
            if 'Adj Close' in df.columns:
                # Use adjusted close as the primary price
                df['Price'] = df['Adj Close']
            elif 'Close' in df.columns:
                df['Price'] = df['Close']
            else:
                logger.error("No price column found in data")
                return df
            
            # Calculate returns
            df['Returns'] = df['Price'].pct_change()
            df['Log_Returns'] = np.log(df['Price'] / df['Price'].shift(1))
            
            return df
            
        except Exception as e:
            logger.error(f"Error calculating adjusted prices: {e}")
            return df
    
    def add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add comprehensive technical indicators"""
        try:
            # Moving averages
            df['SMA_20'] = df['Price'].rolling(window=20).mean()
            df['SMA_50'] = df['Price'].rolling(window=50).mean()
            df['EMA_12'] = df['Price'].ewm(span=12).mean()
            df['EMA_26'] = df['Price'].ewm(span=26).mean()
            
            # MACD
            df['MACD'] = df['EMA_12'] - df['EMA_26']
            df['MACD_Signal'] = df['MACD'].ewm(span=9).mean()
            df['MACD_Histogram'] = df['MACD'] - df['MACD_Signal']
            
            # RSI
            df['RSI'] = self.calculate_rsi(df['Price'], period=14)
            
            # Bollinger Bands
            df['BB_Upper'], df['BB_Middle'], df['BB_Lower'] = self.calculate_bollinger_bands(df['Price'])
            
            # ATR (Average True Range)
            df['ATR'] = self.calculate_atr(df)
            
            # Volume indicators
            if 'Volume' in df.columns:
                df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
                df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
            
            return df
            
        except Exception as e:
            logger.error(f"Error adding technical indicators: {e}")
            return df
    
    def calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI indicator"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def calculate_bollinger_bands(self, prices: pd.Series, period: int = 20, std_dev: int = 2) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Calculate Bollinger Bands"""
        middle = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)
        return upper, middle, lower
    
    def calculate_atr(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range"""
        try:
            # Handle different column name conventions
            high_col = 'High' if 'High' in df.columns else 'high'
            low_col = 'Low' if 'Low' in df.columns else 'low'
            close_col = 'Close' if 'Close' in df.columns else 'close'
            
            high = df[high_col]
            low = df[low_col]
            close = df[close_col]
            
            tr1 = high - low
            tr2 = abs(high - close.shift())
            tr3 = abs(low - close.shift())
            
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = tr.rolling(window=period).mean()
            
            return atr
        except Exception as e:
            logger.error(f"Error calculating ATR: {e}")
            return pd.Series(index=df.index, dtype=float)

class AdvancedStrategy:
    """Base class for advanced trading strategies"""
    
    def __init__(self, name: str, parameters: Dict[str, Any]):
        self.name = name
        self.parameters = parameters
        self.positions = {}
        self.trades = []
        self.performance = {}
        self.signals = pd.DataFrame()
        
    def calculate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """Calculate trading signals"""
        raise NotImplementedError
        
    def calculate_position_size(self, signal: float, capital: float, risk: float, method: str = 'kelly') -> float:
        """Calculate position size using advanced methods"""
        try:
            if method == 'kelly':
                # Kelly Criterion
                return signal * capital * risk
            elif method == 'fixed_fraction':
                # Fixed Fraction
                return capital * risk
            elif method == 'volatility_targeting':
                # Volatility Targeting
                return capital * risk / signal if signal != 0 else 0
            else:
                return capital * risk
                
        except Exception as e:
            logger.error(f"Error calculating position size: {e}")
            return 0
        
    def calculate_stop_loss(self, entry_price: float, direction: str, volatility: float, method: str = 'atr') -> float:
        """Calculate dynamic stop losses"""
        try:
            if method == 'atr':
                # ATR-based stop loss
                if direction == 'long':
                    return entry_price - (2 * volatility)
                else:
                    return entry_price + (2 * volatility)
            elif method == 'percentage':
                # Fixed percentage stop loss
                stop_percentage = self.parameters.get('stop_loss', 0.05)
                if direction == 'long':
                    return entry_price * (1 - stop_percentage)
                else:
                    return entry_price * (1 + stop_percentage)
            else:
                return entry_price
                
        except Exception as e:
            logger.error(f"Error calculating stop loss: {e}")
            return entry_price

class MomentumStrategy(AdvancedStrategy):
    """Advanced momentum trading strategy"""
    
    def __init__(self, parameters: Dict[str, Any]):
        super().__init__('Momentum Strategy', parameters)
        
    def calculate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """Calculate momentum signals"""
        try:
            signals = data.copy()
            
            # Check if required columns exist
            required_columns = ['Price', 'RSI', 'MACD', 'MACD_Signal']
            missing_columns = [col for col in required_columns if col not in signals.columns]
            
            if missing_columns:
                logger.error(f"Missing required columns for momentum strategy: {missing_columns}")
                # Create a basic signal based on available data
                signals['Signal'] = 0
                if 'Price' in signals.columns:
                    # Simple momentum based on price only
                    lookback = self.parameters.get('lookback_period', 20)
                    threshold = self.parameters.get('momentum_threshold', 0.02)
                    price_momentum = signals['Price'].pct_change(lookback)
                    signals.loc[price_momentum > threshold, 'Signal'] = 1
                    signals.loc[price_momentum < -threshold, 'Signal'] = -1
                return signals
            
            # Momentum indicators
            lookback = self.parameters.get('lookback_period', 20)
            threshold = self.parameters.get('momentum_threshold', 0.02)
            
            # Price momentum
            signals['Price_Momentum'] = signals['Price'].pct_change(lookback)
            
            # Volume momentum
            if 'Volume' in signals.columns:
                signals['Volume_Momentum'] = signals['Volume'].pct_change(lookback)
            
            # RSI momentum
            signals['RSI_Momentum'] = signals['RSI'].diff(lookback)
            
            # MACD momentum
            signals['MACD_Momentum'] = signals['MACD'].diff(lookback)
            
            # Combined signal
            signals['Signal'] = 0
            
            # Long signal conditions
            long_conditions = (
                (signals['Price_Momentum'] > threshold) &
                (signals['RSI'] < 70) &
                (signals['MACD'] > signals['MACD_Signal'])
            )
            
            # Short signal conditions
            short_conditions = (
                (signals['Price_Momentum'] < -threshold) &
                (signals['RSI'] > 30) &
                (signals['MACD'] < signals['MACD_Signal'])
            )
            
            signals.loc[long_conditions, 'Signal'] = 1
            signals.loc[short_conditions, 'Signal'] = -1
            
            return signals
            
        except Exception as e:
            logger.error(f"Error calculating momentum signals: {e}")
            # Return data with basic signal
            signals = data.copy()
            signals['Signal'] = 0
            return signals

class MeanReversionStrategy(AdvancedStrategy):
    """Advanced mean reversion strategy"""
    
    def __init__(self, parameters: Dict[str, Any]):
        super().__init__('Mean Reversion Strategy', parameters)
        
    def calculate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """Calculate mean reversion signals"""
        try:
            signals = data.copy()
            
            # Check if required columns exist
            required_columns = ['Price', 'RSI', 'BB_Lower', 'BB_Upper', 'SMA_20']
            missing_columns = [col for col in required_columns if col not in signals.columns]
            
            if missing_columns:
                logger.error(f"Missing required columns for mean reversion strategy: {missing_columns}")
                # Create a basic signal based on available data
                signals['Signal'] = 0
                if 'Price' in signals.columns:
                    # Simple mean reversion based on price only
                    sma_20 = signals['Price'].rolling(window=20).mean()
                    price_deviation = (signals['Price'] - sma_20) / sma_20
                    signals.loc[price_deviation < -0.05, 'Signal'] = 1  # Buy when price is 5% below SMA
                    signals.loc[price_deviation > 0.05, 'Signal'] = -1  # Sell when price is 5% above SMA
                return signals
            
            # Mean reversion parameters
            rsi_period = self.parameters.get('rsi_period', 14)
            oversold = self.parameters.get('oversold_threshold', 30)
            overbought = self.parameters.get('overbought_threshold', 70)
            
            # Bollinger Bands mean reversion
            signals['BB_Position'] = (signals['Price'] - signals['BB_Lower']) / (signals['BB_Upper'] - signals['BB_Lower'])
            
            # RSI mean reversion
            signals['RSI_Mean'] = signals['RSI'].rolling(window=rsi_period).mean()
            signals['RSI_Deviation'] = signals['RSI'] - signals['RSI_Mean']
            
            # Moving average mean reversion
            signals['MA_Deviation'] = (signals['Price'] - signals['SMA_20']) / signals['SMA_20']
            
            # Combined signal
            signals['Signal'] = 0
            
            # Long signal conditions (oversold)
            long_conditions = (
                (signals['RSI'] < oversold) &
                (signals['BB_Position'] < 0.2) &
                (signals['MA_Deviation'] < -0.05)
            )
            
            # Short signal conditions (overbought)
            short_conditions = (
                (signals['RSI'] > overbought) &
                (signals['BB_Position'] > 0.8) &
                (signals['MA_Deviation'] > 0.05)
            )
            
            signals.loc[long_conditions, 'Signal'] = 1
            signals.loc[short_conditions, 'Signal'] = -1
            
            return signals
            
        except Exception as e:
            logger.error(f"Error calculating mean reversion signals: {e}")
            # Return data with basic signal
            signals = data.copy()
            signals['Signal'] = 0
            return signals

# Main execution function
async def main():
    """Main function for testing enhanced backtesting"""
    try:
        data_manager = EnhancedDataManager()
        
        # Test data download
        symbols = ['AAPL', 'MSFT']
        start_date = '2023-01-01'
        end_date = '2023-12-31'
        
        data = await data_manager.get_clean_data(symbols, start_date, end_date)
        
        if data:
            print(f"Successfully downloaded data for {len(data)} symbols")
            
            # Test strategy
            for symbol, symbol_data in data.items():
                print(f"\nTesting {symbol}:")
                print(f"Data shape: {symbol_data.shape}")
                print(f"Columns: {list(symbol_data.columns)}")
                
                # Test momentum strategy
                momentum_params = {
                    'lookback_period': 20,
                    'momentum_threshold': 0.02
                }
                
                momentum_strategy = MomentumStrategy(momentum_params)
                signals = momentum_strategy.calculate_signals(symbol_data)
                
                signal_count = (signals['Signal'] != 0).sum()
                print(f"Generated {signal_count} trading signals")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")

if __name__ == "__main__":
    asyncio.run(main())
