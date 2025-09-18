#!/usr/bin/env python3
"""
QLib Data Reader - Reads QLib binary data files
Integrates with the backtesting system to use local QLib data
"""

import os
import sys
import logging
import struct
import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

# Configure logging for testing
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

class QLibDataReader:
    """Reads QLib binary data files from the qlib_data directory"""
    
    def __init__(self, data_dir: str = None):
        self.project_root = Path(__file__).parent.parent
        self.data_dir = Path(data_dir) if data_dir else self.project_root / "qlib_data" / "us_data"
        
        # QLib data structure
        self.instruments_dir = self.data_dir / "instruments"
        self.features_dir = self.data_dir / "features"
        self.calendars_dir = self.data_dir / "calendars"
        
        # Cache for loaded data
        self._calendar_cache = None
        self._instruments_cache = None
        
        logger.info(f"QLib Data Reader initialized with data directory: {self.data_dir}")
    
    def get_available_instruments(self) -> List[str]:
        """Get list of available instruments"""
        try:
            if self._instruments_cache is None:
                instruments_file = self.instruments_dir / "all.txt"
                if instruments_file.exists():
                    with open(instruments_file, 'r') as f:
                        instruments = [line.split('\t')[0] for line in f if line.strip()]
                    self._instruments_cache = instruments
                else:
                    logger.warning(f"Instruments file not found: {instruments_file}")
                    self._instruments_cache = []
            
            return self._instruments_cache
        except Exception as e:
            logger.error(f"Error loading instruments: {e}")
            return []
    
    def get_trading_calendar(self, start_date: str = None, end_date: str = None) -> List[str]:
        """Get trading calendar between start_date and end_date"""
        try:
            if self._calendar_cache is None:
                # Try multiple possible calendar file locations
                calendar_locations = [
                    self.calendars_dir / "day.txt",
                    self.data_dir / "calendars" / "day.txt",
                    Path(__file__).parent.parent / "qlib_data" / "us_data" / "calendars" / "day.txt"
                ]
                
                logger.info(f"Looking for calendar file in: {[str(loc) for loc in calendar_locations]}")
                
                calendar = []
                for calendar_file in calendar_locations:
                    logger.info(f"Checking: {calendar_file} - Exists: {calendar_file.exists()}")
                    if calendar_file.exists():
                        with open(calendar_file, 'r') as f:
                            calendar = [line.strip() for line in f if line.strip()]
                        logger.info(f"Calendar loaded from: {calendar_file} with {len(calendar)} dates")
                        break
                
                if not calendar:
                    logger.warning(f"Calendar file not found in any location: {calendar_locations}")
                
                self._calendar_cache = calendar
            
            calendar = self._calendar_cache.copy()  # Make a copy to avoid modifying the cache
            
            logger.info(f"Original calendar: {len(calendar)} dates")
            if start_date:
                calendar = [date for date in calendar if date >= start_date]
                logger.info(f"After start_date filter: {len(calendar)} dates")
            if end_date:
                calendar = [date for date in calendar if date <= end_date]
                logger.info(f"After end_date filter: {len(calendar)} dates")
            
            return calendar
        except Exception as e:
            logger.error(f"Error loading calendar: {e}")
            return []
    
    def read_binary_data(self, file_path: Path) -> np.ndarray:
        """Read QLib binary data file"""
        try:
            with open(file_path, 'rb') as f:
                # Get file size
                f.seek(0, 2)  # Seek to end
                file_size = f.tell()
                f.seek(0)  # Seek back to start
                
                # Try different reading methods
                methods = [
                    # Method 1: With header (8 bytes)
                    lambda: self._read_with_header(f),
                    # Method 2: Without header, float64
                    lambda: self._read_without_header(f, np.float64),
                    # Method 3: Without header, float32
                    lambda: self._read_without_header(f, np.float32),
                    # Method 4: Without header, int32
                    lambda: self._read_without_header(f, np.int32),
                ]
                
                for i, method in enumerate(methods):
                    try:
                        f.seek(0)  # Reset to start
                        data = method()
                        if len(data) > 0 and len(data) < 10000:  # Reasonable range
                            logger.info(f"Successfully read {file_path.name} using method {i+1}: {len(data)} records")
                            return data
                    except Exception as e:
                        logger.debug(f"Method {i+1} failed for {file_path.name}: {e}")
                        continue
                
                logger.error(f"All reading methods failed for {file_path}")
                return np.array([])
                
        except Exception as e:
            logger.error(f"Error reading binary file {file_path}: {e}")
            return np.array([])
    
    def _read_with_header(self, f) -> np.ndarray:
        """Read with 8-byte header"""
        header = f.read(8)
        num_records = struct.unpack('Q', header)[0]
        
        if num_records > 100000 or num_records <= 0:
            raise ValueError(f"Invalid header: {num_records}")
        
        data = np.frombuffer(f.read(), dtype=np.float64)
        if len(data) != num_records:
            raise ValueError(f"Length mismatch: expected {num_records}, got {len(data)}")
        
        return data
    
    def _read_without_header(self, f, dtype) -> np.ndarray:
        """Read without header using specified dtype"""
        return np.frombuffer(f.read(), dtype=dtype)
    
    def get_stock_data(self, symbol: str, start_date: str = None, end_date: str = None) -> Optional[pd.DataFrame]:
        """Get stock data for a specific symbol"""
        try:
            symbol_dir = self.features_dir / symbol.lower()
            logger.info(f"Looking for symbol directory: {symbol_dir}")
            logger.info(f"Directory exists: {symbol_dir.exists()}")
            
            if not symbol_dir.exists():
                logger.warning(f"Data directory not found for symbol {symbol}: {symbol_dir}")
                return None
            
            # Get trading calendar
            calendar = self.get_trading_calendar(start_date, end_date)
            logger.info(f"Calendar loaded: {len(calendar)} dates")
            if not calendar:
                logger.warning("No trading calendar available")
                return None
            
            logger.info(f"Calendar dates range: {calendar[0] if calendar else 'None'} to {calendar[-1] if calendar else 'None'}")
            
            # Read all available data files
            data_files = {
                'open': symbol_dir / "open.day.bin",
                'high': symbol_dir / "high.day.bin",
                'low': symbol_dir / "low.day.bin",
                'close': symbol_dir / "close.day.bin",
                'volume': symbol_dir / "volume.day.bin"
            }
            
            data_dict = {}
            for field, file_path in data_files.items():
                if file_path.exists():
                    data = self.read_binary_data(file_path)
                    if len(data) > 0:
                        data_dict[field] = data
            
            if not data_dict:
                logger.warning(f"No data files found for symbol {symbol}")
                return None
            
            # Create DataFrame
            df = pd.DataFrame(data_dict)
            
            # Add date index
            if len(df) <= len(calendar):
                df.index = calendar[:len(df)]
            else:
                # If we have more data than calendar, truncate
                df = df.iloc[:len(calendar)]
                df.index = calendar
            
            # Filter by date range if specified
            if start_date:
                df = df[df.index >= start_date]
            if end_date:
                df = df[df.index <= end_date]
            
            # Handle missing values
            df = df.replace([np.inf, -np.inf], np.nan)
            df = df.fillna(method='ffill').fillna(method='bfill')
            
            return df
            
        except Exception as e:
            logger.error(f"Error getting data for {symbol}: {e}")
            return None
    
    def get_multiple_stocks_data(self, symbols: List[str], start_date: str = None, end_date: str = None) -> Dict[str, pd.DataFrame]:
        """Get data for multiple stocks"""
        data_dict = {}
        
        for symbol in symbols:
            data = self.get_stock_data(symbol, start_date, end_date)
            if data is not None and not data.empty:
                data_dict[symbol] = data
            else:
                logger.warning(f"No data available for {symbol}")
        
        return data_dict
    
    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary of available data"""
        try:
            instruments = self.get_available_instruments()
            calendar = self.get_trading_calendar()
            
            # Get date range
            start_date = calendar[0] if calendar else None
            end_date = calendar[-1] if calendar else None
            
            # Count available data files
            available_symbols = []
            for symbol in instruments[:100]:  # Check first 100 symbols
                symbol_dir = self.features_dir / symbol.lower()
                if symbol_dir.exists():
                    data_files = list(symbol_dir.glob("*.bin"))
                    if len(data_files) >= 5:  # At least OHLCV
                        available_symbols.append(symbol)
            
            return {
                'total_instruments': len(instruments),
                'available_symbols': len(available_symbols),
                'sample_symbols': available_symbols[:10],
                'date_range': {
                    'start': start_date,
                    'end': end_date,
                    'total_days': len(calendar)
                },
                'data_directory': str(self.data_dir)
            }
        except Exception as e:
            logger.error(f"Error getting data summary: {e}")
            return {}

class QLibDataManager:
    """Enhanced data manager that integrates QLib data with backtesting"""
    
    def __init__(self, data_dir: str = None):
        self.qlib_reader = QLibDataReader(data_dir)
        self.data_cache = {}
        
        # Import enhanced data manager for processing
        try:
            from enhanced_backtesting import EnhancedDataManager
            self.enhanced_data_manager = EnhancedDataManager()
        except ImportError:
            logger.warning("Enhanced data manager not available")
            self.enhanced_data_manager = None
        
    async def get_clean_data(self, symbols: List[str], start_date: str, end_date: str) -> Dict[str, pd.DataFrame]:
        """Get clean data for backtesting"""
        try:
            # Get data from QLib
            data_dict = self.qlib_reader.get_multiple_stocks_data(symbols, start_date, end_date)
            
            if not data_dict:
                logger.warning("No data available from QLib, falling back to yfinance")
                data_dict = await self._get_yfinance_data(symbols, start_date, end_date)
            
            if not data_dict:
                logger.error("No data available from any source")
                return {}
            
            # Process data through enhanced data manager if available
            if self.enhanced_data_manager:
                logger.info("Processing data through enhanced data manager")
                clean_data = {}
                for symbol, df in data_dict.items():
                    if not df.empty and len(df) > 10:
                        try:
                            # Process through enhanced data manager
                            processed_df = await self.enhanced_data_manager.get_clean_data([symbol], start_date, end_date)
                            if symbol in processed_df and not processed_df[symbol].empty:
                                clean_data[symbol] = processed_df[symbol]
                            else:
                                # Fallback to basic processing
                                clean_data[symbol] = self._basic_data_processing(df)
                        except Exception as e:
                            logger.warning(f"Error processing {symbol} through enhanced data manager: {e}")
                            clean_data[symbol] = self._basic_data_processing(df)
                return clean_data
            else:
                # Basic processing without enhanced data manager
                logger.info("Using basic data processing")
                clean_data = {}
                for symbol, df in data_dict.items():
                    if not df.empty and len(df) > 10:
                        clean_data[symbol] = self._basic_data_processing(df)
                return clean_data
            
        except Exception as e:
            logger.error(f"Error getting clean data: {e}")
            return await self._get_yfinance_data(symbols, start_date, end_date)
    
    def _basic_data_processing(self, df: pd.DataFrame) -> pd.DataFrame:
        """Basic data processing when enhanced data manager is not available"""
        try:
            # Normalize column names
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
    
    async def _get_yfinance_data(self, symbols: List[str], start_date: str, end_date: str) -> Dict[str, pd.DataFrame]:
        """Fallback to yfinance data"""
        try:
            import yfinance as yf
            
            data_dict = {}
            for symbol in symbols:
                try:
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(start=start_date, end=end_date)
                    
                    if not hist.empty:
                        # Rename columns to match QLib format
                        hist.columns = [col.lower() for col in hist.columns]
                        data_dict[symbol] = hist
                        
                except Exception as e:
                    logger.warning(f"Failed to get yfinance data for {symbol}: {e}")
            
            return data_dict
            
        except Exception as e:
            logger.error(f"Error getting yfinance data: {e}")
            return {}
    
    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary of available data"""
        return self.qlib_reader.get_data_summary()

# Test function
def test_qlib_data_reader():
    """Test the QLib data reader"""
    print("Testing QLib Data Reader...")
    
    reader = QLibDataReader()
    
    # Get data summary
    summary = reader.get_data_summary()
    print(f"Data Summary: {summary}")
    
    # Test getting data for a few symbols
    test_symbols = ['AAPL', 'MSFT', 'GOOGL']
    
    for symbol in test_symbols:
        print(f"\nTesting data for {symbol}...")
        data = reader.get_stock_data(symbol, '2019-01-01', '2020-11-10')
        
        if data is not None and not data.empty:
            print(f"✅ {symbol}: {len(data)} rows, columns: {list(data.columns)}")
            print(f"   Date range: {data.index[0]} to {data.index[-1]}")
            print(f"   Sample data:\n{data.head(3)}")
        else:
            print(f"❌ {symbol}: No data available")

if __name__ == "__main__":
    test_qlib_data_reader()
