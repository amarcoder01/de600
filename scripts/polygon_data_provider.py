#!/usr/bin/env python3
"""
Polygon.io Data Provider for Backtesting
Fetches historical data for the past 5 years using REST API
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv('.env.local')
import logging
import asyncio
import aiohttp
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class PolygonDataProvider:
    """Polygon.io data provider for backtesting with 5-year historical data"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('POLYGON_API_KEY')
        if not self.api_key:
            raise ValueError("POLYGON_API_KEY not found in environment variables")
        
        self.base_url = "https://api.polygon.io"
        self.session = None
        
        logger.info(f"Polygon.io Data Provider initialized with API key: {self.api_key[:8]}...")
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def get_historical_data(self, symbol: str, start_date: str, end_date: str) -> Optional[pd.DataFrame]:
        """Get historical daily data for a symbol"""
        try:
            # Convert dates to proper format
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            
            # Polygon.io aggregates endpoint for daily data
            url = f"{self.base_url}/v2/aggs/ticker/{symbol}/range/1/day/{start_date}/{end_date}"
            params = {
                'adjusted': 'true',
                'sort': 'asc',
                'limit': 50000,  # Maximum limit
                'apikey': self.api_key
            }
            
            logger.info(f"Fetching historical data for {symbol} from {start_date} to {end_date}")
            
            async with self.session.get(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Polygon API error for {symbol}: {response.status} - {error_text}")
                    return None
                
                data = await response.json()
                
                if data.get('status') != 'OK':
                    logger.error(f"Polygon API returned error for {symbol}: {data}")
                    return None
                
                results = data.get('results', [])
                if not results:
                    logger.warning(f"No data returned for {symbol}")
                    return None
                
                # Convert to DataFrame
                df = pd.DataFrame(results)
                
                # Rename columns to match expected format
                column_mapping = {
                    't': 'timestamp',
                    'o': 'open',
                    'h': 'high',
                    'l': 'low',
                    'c': 'close',
                    'v': 'volume',
                    'vw': 'vwap',
                    'n': 'transactions'
                }
                
                df = df.rename(columns=column_mapping)
                
                # Convert timestamp to datetime
                df['date'] = pd.to_datetime(df['timestamp'], unit='ms')
                df.set_index('date', inplace=True)
                
                # Ensure all required columns exist
                required_columns = ['open', 'high', 'low', 'close', 'volume']
                for col in required_columns:
                    if col not in df.columns:
                        logger.error(f"Missing required column {col} for {symbol}")
                        return None
                
                # Add adjusted close (use close for now, can be enhanced later)
                df['adj_close'] = df['close']
                
                logger.info(f"Successfully fetched {len(df)} rows for {symbol}")
                return df
                
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {e}")
            return None
    
    async def get_multiple_stocks_data(self, symbols: List[str], start_date: str, end_date: str) -> Dict[str, pd.DataFrame]:
        """Get historical data for multiple symbols"""
        try:
            data_dict = {}
            
            # Process symbols in batches to respect rate limits
            batch_size = 3  # Conservative batch size for rate limits
            for i in range(0, len(symbols), batch_size):
                batch = symbols[i:i + batch_size]
                
                # Create tasks for the batch
                tasks = []
                for symbol in batch:
                    task = self.get_historical_data(symbol, start_date, end_date)
                    tasks.append(task)
                
                # Execute batch
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Process results
                for symbol, result in zip(batch, results):
                    if isinstance(result, Exception):
                        logger.error(f"Error fetching data for {symbol}: {result}")
                    elif result is not None and not result.empty:
                        data_dict[symbol] = result
                    else:
                        logger.warning(f"No data available for {symbol}")
                
                # Add delay between batches to respect rate limits
                if i + batch_size < len(symbols):
                    await asyncio.sleep(1)  # 1 second delay between batches
            
            logger.info(f"Successfully fetched data for {len(data_dict)} out of {len(symbols)} symbols")
            return data_dict
            
        except Exception as e:
            logger.error(f"Error fetching multiple stocks data: {e}")
            return {}
    
    async def get_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get basic stock information"""
        try:
            url = f"{self.base_url}/v3/reference/tickers/{symbol}"
            params = {'apikey': self.api_key}
            
            async with self.session.get(url, params=params) as response:
                if response.status != 200:
                    return None
                
                data = await response.json()
                return data.get('results', {})
                
        except Exception as e:
            logger.error(f"Error fetching stock info for {symbol}: {e}")
            return None
    
    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary of Polygon.io data capabilities"""
        return {
            'provider': 'Polygon.io',
            'data_type': 'Historical OHLCV',
            'date_range': '5+ years of historical data',
            'update_frequency': 'Daily',
            'adjustments': 'Split and dividend adjusted',
            'rate_limits': '5 requests per minute (Starter Plan)',
            'coverage': 'US stocks, ETFs, and more',
            'api_version': 'v2/v3',
            'features': [
                'Historical daily data',
                'Real-time data (with subscription)',
                'Company information',
                'Financial statements',
                'News and sentiment'
            ]
        }

class PolygonDataManager:
    """Enhanced data manager that integrates Polygon.io data with backtesting"""
    
    def __init__(self, api_key: str = None):
        self.polygon_provider = PolygonDataProvider(api_key)
        self.data_cache = {}
        
        # Import enhanced data manager for processing
        try:
            from enhanced_backtesting import EnhancedDataManager
            self.enhanced_data_manager = EnhancedDataManager()
        except ImportError:
            logger.warning("Enhanced data manager not available")
            self.enhanced_data_manager = None
        
        logger.info("Polygon.io Data Manager initialized")
    
    async def get_clean_data(self, symbols: List[str], start_date: str, end_date: str) -> Dict[str, pd.DataFrame]:
        """Get clean data for backtesting from Polygon.io"""
        try:
            async with self.polygon_provider as provider:
                # Get historical data from Polygon.io
                data_dict = await provider.get_multiple_stocks_data(symbols, start_date, end_date)
                
                if not data_dict:
                    logger.error("No data available from Polygon.io")
                    return {}
                
                # Process data directly with basic processing
                logger.info("Processing Polygon.io data with technical indicators")
                clean_data = {}
                for symbol, df in data_dict.items():
                    if not df.empty and len(df) > 10:
                        clean_data[symbol] = self._basic_data_processing(df)
                
                logger.info(f"Successfully processed {len(clean_data)} symbols from Polygon.io")
                return clean_data
                    
        except Exception as e:
            logger.error(f"Error getting clean data from Polygon.io: {e}")
            return {}
    
    def _basic_data_processing(self, df: pd.DataFrame) -> pd.DataFrame:
        """Basic data processing for Polygon.io data"""
        try:
            # Normalize column names
            column_mapping = {
                'close': 'Close',
                'high': 'High', 
                'low': 'Low',
                'open': 'Open',
                'volume': 'Volume',
                'adj_close': 'Adj Close'
            }
            
            # Rename columns if they exist in lowercase
            for old_col, new_col in column_mapping.items():
                if old_col in df.columns and new_col not in df.columns:
                    df[new_col] = df[old_col]
            
            # Create Price column
            if 'Adj Close' in df.columns:
                df['Price'] = df['Adj Close']
            elif 'Close' in df.columns:
                df['Price'] = df['Close']
            else:
                logger.error("No price column found")
                return df
            
            # Add basic technical indicators
            df['Returns'] = df['Price'].pct_change()
            df['SMA_20'] = df['Price'].rolling(window=20).mean()
            df['SMA_50'] = df['Price'].rolling(window=50).mean()
            df['EMA_12'] = df['Price'].ewm(span=12).mean()
            df['EMA_26'] = df['Price'].ewm(span=26).mean()
            
            # MACD
            df['MACD'] = df['EMA_12'] - df['EMA_26']
            df['MACD_Signal'] = df['MACD'].ewm(span=9).mean()
            
            # RSI
            delta = df['Price'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['RSI'] = 100 - (100 / (1 + rs))
            
            # Bollinger Bands
            df['BB_Middle'] = df['Price'].rolling(window=20).mean()
            bb_std = df['Price'].rolling(window=20).std()
            df['BB_Upper'] = df['BB_Middle'] + (bb_std * 2)
            df['BB_Lower'] = df['BB_Middle'] - (bb_std * 2)
            
            return df
            
        except Exception as e:
            logger.error(f"Error in basic data processing: {e}")
            return df
    
    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary of available data"""
        return self.polygon_provider.get_data_summary()

# Test function
async def test_polygon_data_provider():
    """Test the Polygon.io data provider"""
    print("Testing Polygon.io Data Provider...")
    
    try:
        async with PolygonDataProvider() as provider:
            # Test single stock
            print("\n1. Testing single stock data...")
            data = await provider.get_historical_data('AAPL', '2020-01-01', '2020-12-31')
            
            if data is not None and not data.empty:
                print(f"✅ AAPL: {len(data)} rows, columns: {list(data.columns)}")
                print(f"   Date range: {data.index[0]} to {data.index[-1]}")
                print(f"   Sample data:\n{data.head(3)}")
            else:
                print("❌ AAPL: No data available")
            
            # Test multiple stocks
            print("\n2. Testing multiple stocks data...")
            symbols = ['AAPL', 'MSFT', 'GOOGL']
            data_dict = await provider.get_multiple_stocks_data(symbols, '2020-01-01', '2020-12-31')
            
            for symbol, df in data_dict.items():
                if df is not None and not df.empty:
                    print(f"✅ {symbol}: {len(df)} rows")
                else:
                    print(f"❌ {symbol}: No data available")
            
            # Test data summary
            print("\n3. Testing data summary...")
            summary = provider.get_data_summary()
            print(f"Data Summary: {summary}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_polygon_data_provider())
