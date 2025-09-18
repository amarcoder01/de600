#!/usr/bin/env python3
"""
Qlib Data Manager for Trading Platform
Handles data downloading, processing, and management
"""

import os
import sys
import logging
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import zipfile
import shutil

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from qlib_config import get_qlib_config, init_qlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class QlibDataManager:
    """Comprehensive Qlib Data Manager"""
    
    def __init__(self):
        self.config = get_qlib_config()
        config_data = self.config.get_config()
        
        # Use custom Qlib data directory structure
        self.data_dir = Path(config_data["provider_uri"]) / "features"
        self.processed_dir = Path(config_data["provider_uri"]) / "features"
        self.cache_dir = Path(config_data["cache_dir"])
        self.backup_dir = Path(config_data["provider_uri"]).parent / "backup"
        
        # Create directories
        for directory in [self.data_dir, self.processed_dir, self.cache_dir, self.backup_dir]:
            directory.mkdir(parents=True, exist_ok=True)
        
        # US Stock symbols for data collection
        self.us_stocks = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BRK-B', 'UNH', 'JNJ',
            'JPM', 'V', 'PG', 'HD', 'MA', 'BAC', 'ABBV', 'PFE', 'KO', 'PEP',
            'AVGO', 'COST', 'TMO', 'ACN', 'DHR', 'VZ', 'ADBE', 'NFLX', 'CRM', 'PYPL',
            'WMT', 'DIS', 'NKE', 'INTC', 'VZ', 'T', 'CMCSA', 'PFE', 'ABT', 'TXN',
            'QCOM', 'HON', 'UNP', 'RTX', 'LOW', 'UPS', 'IBM', 'CAT', 'DE', 'GS', 'MS'
        ]
        
        # Data sources
        self.data_sources = {
            'yahoo_finance': {
                'enabled': True,
                'priority': 1,
                'update_frequency': 'daily'
            },
            'alpha_vantage': {
                'enabled': False,
                'priority': 2,
                'update_frequency': 'daily',
                'api_key': os.getenv('ALPHA_VANTAGE_API_KEY')
            },
            'polygon': {
                'enabled': False,
                'priority': 3,
                'update_frequency': 'daily',
                'api_key': os.getenv('POLYGON_API_KEY')
            }
        }
    
    async def download_market_data(self, symbols: List[str] = None, 
                                 start_date: str = None, 
                                 end_date: str = None) -> Dict[str, Any]:
        """Download comprehensive market data for specified symbols"""
        if symbols is None:
            symbols = self.us_stocks
        
        if start_date is None:
            start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        
        if end_date is None:
            end_date = datetime.now().strftime('%Y-%m-%d')
        
        logger.info(f"Starting market data download for {len(symbols)} symbols")
        
        results = {
            'success': [],
            'failed': [],
            'total_downloaded': 0,
            'total_size_mb': 0,
            'start_time': datetime.now(),
            'end_time': None
        }
        
        # Download data using ThreadPoolExecutor for better performance
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            for symbol in symbols:
                future = executor.submit(
                    self._download_symbol_data, 
                    symbol, start_date, end_date
                )
                futures.append((symbol, future))
            
            # Process completed downloads
            for symbol, future in futures:
                try:
                    result = future.result(timeout=60)
                    if result['success']:
                        results['success'].append(symbol)
                        results['total_downloaded'] += 1
                        results['total_size_mb'] += result.get('size_mb', 0)
                        logger.info(f"✅ Downloaded data for {symbol}")
                    else:
                        results['failed'].append({
                            'symbol': symbol,
                            'error': result.get('error', 'Unknown error')
                        })
                        logger.error(f"❌ Failed to download {symbol}: {result.get('error')}")
                except Exception as e:
                    results['failed'].append({
                        'symbol': symbol,
                        'error': str(e)
                    })
                    logger.error(f"❌ Exception downloading {symbol}: {e}")
        
        results['end_time'] = datetime.now()
        results['duration'] = (results['end_time'] - results['start_time']).total_seconds()
        
        logger.info(f"Download completed: {results['total_downloaded']} successful, "
                   f"{len(results['failed'])} failed in {results['duration']:.2f}s")
        
        return results
    
    def _download_symbol_data(self, symbol: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Download data for a single symbol"""
        try:
            # Download using yfinance
            ticker = yf.Ticker(symbol)
            
            # Get historical data
            hist_data = ticker.history(start=start_date, end=end_date)
            
            if hist_data.empty:
                return {
                    'success': False,
                    'error': 'No data available',
                    'symbol': symbol
                }
            
            # Get additional info
            info = ticker.info
            
            # Prepare data for Qlib format
            qlib_data = self._prepare_qlib_format(hist_data, info, symbol)
            
            # Save data
            symbol_dir = self.data_dir / symbol
            symbol_dir.mkdir(exist_ok=True)
            
            # Save OHLCV data
            ohlcv_file = symbol_dir / f"{symbol}_ohlcv.csv"
            qlib_data['ohlcv'].to_csv(ohlcv_file, index=True)
            
            # Save metadata
            meta_file = symbol_dir / f"{symbol}_meta.json"
            with open(meta_file, 'w') as f:
                json.dump(qlib_data['metadata'], f, indent=2, default=str)
            
            # Calculate file size
            size_mb = (ohlcv_file.stat().st_size + meta_file.stat().st_size) / (1024 * 1024)
            
            return {
                'success': True,
                'symbol': symbol,
                'size_mb': size_mb,
                'rows': len(qlib_data['ohlcv']),
                'start_date': start_date,
                'end_date': end_date
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'symbol': symbol
            }
    
    def _prepare_qlib_format(self, hist_data: pd.DataFrame, info: Dict, symbol: str) -> Dict[str, Any]:
        """Prepare data in Qlib-compatible format"""
        # Ensure we have the required columns
        required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        
        for col in required_columns:
            if col not in hist_data.columns:
                hist_data[col] = 0
        
        # Calculate additional features
        hist_data['Returns'] = hist_data['Close'].pct_change()
        hist_data['Log_Returns'] = np.log(hist_data['Close'] / hist_data['Close'].shift(1))
        hist_data['Volatility'] = hist_data['Returns'].rolling(window=20).std()
        hist_data['SMA_20'] = hist_data['Close'].rolling(window=20).mean()
        hist_data['SMA_50'] = hist_data['Close'].rolling(window=50).mean()
        hist_data['RSI'] = self._calculate_rsi(hist_data['Close'])
        
        # Prepare metadata
        metadata = {
            'symbol': symbol,
            'name': info.get('longName', symbol),
            'sector': info.get('sector', 'Unknown'),
            'industry': info.get('industry', 'Unknown'),
            'market_cap': info.get('marketCap', 0),
            'pe_ratio': info.get('trailingPE', 0),
            'dividend_yield': info.get('dividendYield', 0),
            'beta': info.get('beta', 1.0),
            'exchange': info.get('exchange', 'NASDAQ'),
            'currency': info.get('currency', 'USD'),
            'data_start': hist_data.index[0].strftime('%Y-%m-%d'),
            'data_end': hist_data.index[-1].strftime('%Y-%m-%d'),
            'total_rows': len(hist_data),
            'features': list(hist_data.columns),
            'last_updated': datetime.now().isoformat()
        }
        
        return {
            'ohlcv': hist_data,
            'metadata': metadata
        }
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI indicator"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    async def process_data_for_qlib(self) -> Dict[str, Any]:
        """Process downloaded data for Qlib format"""
        logger.info("Processing data for Qlib format")
        
        results = {
            'processed': [],
            'failed': [],
            'total_processed': 0
        }
        
        # Process each symbol directory
        for symbol_dir in self.data_dir.iterdir():
            if not symbol_dir.is_dir():
                continue
            
            symbol = symbol_dir.name
            
            try:
                # Load OHLCV data
                ohlcv_file = symbol_dir / f"{symbol}_ohlcv.csv"
                if not ohlcv_file.exists():
                    continue
                
                data = pd.read_csv(ohlcv_file, index_col=0, parse_dates=True)
                
                # Load metadata
                meta_file = symbol_dir / f"{symbol}_meta.json"
                if meta_file.exists():
                    with open(meta_file, 'r') as f:
                        metadata = json.load(f)
                else:
                    metadata = {'symbol': symbol}
                
                # Process data for Qlib
                processed_data = self._process_for_qlib(data, metadata)
                
                # Save processed data
                processed_dir = self.processed_dir / symbol
                processed_dir.mkdir(exist_ok=True)
                
                processed_file = processed_dir / f"{symbol}_processed.csv"
                processed_data.to_csv(processed_file)
                
                results['processed'].append(symbol)
                results['total_processed'] += 1
                
                logger.info(f"✅ Processed data for {symbol}")
                
            except Exception as e:
                results['failed'].append({
                    'symbol': symbol,
                    'error': str(e)
                })
                logger.error(f"❌ Failed to process {symbol}: {e}")
        
        logger.info(f"Data processing completed: {results['total_processed']} processed, "
                   f"{len(results['failed'])} failed")
        
        return results
    
    def _process_for_qlib(self, data: pd.DataFrame, metadata: Dict) -> pd.DataFrame:
        """Process data specifically for Qlib format"""
        # Ensure proper column names for Qlib
        column_mapping = {
            'Open': 'open',
            'High': 'high',
            'Low': 'low',
            'Close': 'close',
            'Volume': 'volume',
            'Returns': 'returns',
            'Log_Returns': 'log_returns',
            'Volatility': 'volatility',
            'SMA_20': 'sma_20',
            'SMA_50': 'sma_50',
            'RSI': 'rsi'
        }
        
        # Rename columns
        data = data.rename(columns=column_mapping)
        
        # Add symbol column
        data['symbol'] = metadata.get('symbol', 'UNKNOWN')
        
        # Ensure all required columns exist
        required_columns = ['open', 'high', 'low', 'close', 'volume']
        for col in required_columns:
            if col not in data.columns:
                data[col] = 0
        
        # Fill missing values
        data = data.fillna(method='ffill').fillna(0)
        
        return data
    
    async def setup_qlib_dataset(self) -> bool:
        """Setup Qlib dataset structure"""
        try:
            # Initialize Qlib
            if not init_qlib():
                logger.error("Failed to initialize Qlib")
                return False
            
            # Create dataset structure
            dataset_dir = Path(self.config.get_config("qlib")["provider_uri"]).expanduser()
            dataset_dir.mkdir(parents=True, exist_ok=True)
            
            # Create calendar file
            calendar_file = dataset_dir / "calendars" / "all_calendar.txt"
            calendar_file.parent.mkdir(exist_ok=True)
            
            # Generate trading calendar
            calendar_data = self._generate_trading_calendar()
            calendar_data.to_csv(calendar_file, index=False, header=False)
            
            # Create instruments file
            instruments_file = dataset_dir / "instruments" / "all.txt"
            instruments_file.parent.mkdir(exist_ok=True)
            
            # Generate instruments list
            instruments_data = self._generate_instruments_list()
            instruments_data.to_csv(instruments_file, index=False, sep='\t')
            
            # Create features directory
            features_dir = dataset_dir / "features"
            features_dir.mkdir(exist_ok=True)
            
            logger.info("Qlib dataset structure created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup Qlib dataset: {e}")
            return False
    
    def _generate_trading_calendar(self) -> pd.DataFrame:
        """Generate trading calendar for Qlib"""
        # Generate business days for the last 5 years
        start_date = datetime.now() - timedelta(days=5*365)
        end_date = datetime.now()
        
        calendar = pd.bdate_range(start=start_date, end=end_date)
        calendar_df = pd.DataFrame({'date': calendar})
        calendar_df['date'] = calendar_df['date'].dt.strftime('%Y-%m-%d')
        
        return calendar_df
    
    def _generate_instruments_list(self) -> pd.DataFrame:
        """Generate instruments list for Qlib"""
        instruments = []
        
        for symbol in self.us_stocks:
            instruments.append({
                'symbol': symbol,
                'start_time': '2019-01-01',
                'end_time': datetime.now().strftime('%Y-%m-%d'),
                'type': 'stock'
            })
        
        return pd.DataFrame(instruments)
    
    async def backup_data(self) -> Dict[str, Any]:
        """Create backup of all data"""
        logger.info("Creating data backup")
        
        backup_name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup_path = self.backup_dir / backup_name
        
        try:
            # Create backup directory
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Copy data directories
            if self.data_dir.exists():
                shutil.copytree(self.data_dir, backup_path / "data")
            
            if self.processed_dir.exists():
                shutil.copytree(self.processed_dir, backup_path / "processed")
            
            # Create backup info
            backup_info = {
                'backup_name': backup_name,
                'created_at': datetime.now().isoformat(),
                'data_size_mb': self._get_directory_size(self.data_dir),
                'processed_size_mb': self._get_directory_size(self.processed_dir),
                'symbols_count': len(list(self.data_dir.iterdir())) if self.data_dir.exists() else 0
            }
            
            with open(backup_path / "backup_info.json", 'w') as f:
                json.dump(backup_info, f, indent=2)
            
            logger.info(f"✅ Backup created: {backup_name}")
            
            return {
                'success': True,
                'backup_path': str(backup_path),
                'backup_info': backup_info
            }
            
        except Exception as e:
            logger.error(f"❌ Backup failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_directory_size(self, directory: Path) -> float:
        """Get directory size in MB"""
        if not directory.exists():
            return 0
        
        total_size = 0
        for file_path in directory.rglob('*'):
            if file_path.is_file():
                total_size += file_path.stat().st_size
        
        return total_size / (1024 * 1024)
    
    async def get_data_status(self) -> Dict[str, Any]:
        """Get current data status"""
        status = {
            'data_directory': str(self.data_dir),
            'processed_directory': str(self.processed_dir),
            'cache_directory': str(self.cache_dir),
            'backup_directory': str(self.backup_dir),
            'symbols_with_data': [],
            'symbols_without_data': [],
            'total_symbols': len(self.us_stocks),
            'data_sources': self.data_sources,
            'last_updated': datetime.now().isoformat()
        }
        
        # Check which symbols have data
        for symbol in self.us_stocks:
            symbol_dir = self.data_dir / symbol
            if symbol_dir.exists() and (symbol_dir / f"{symbol}_ohlcv.csv").exists():
                status['symbols_with_data'].append(symbol)
            else:
                status['symbols_without_data'].append(symbol)
        
        status['symbols_with_data_count'] = len(status['symbols_with_data'])
        status['symbols_without_data_count'] = len(status['symbols_without_data'])
        
        return status

async def main():
    """Main function for testing"""
    print("Qlib Data Manager Test")
    print("=====================")
    
    manager = QlibDataManager()
    
    # Get status
    status = await manager.get_data_status()
    print(f"Data Status: {status['symbols_with_data_count']}/{status['total_symbols']} symbols have data")
    
    # Download data for a few symbols
    symbols_to_download = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']
    print(f"\nDownloading data for {len(symbols_to_download)} symbols...")
    
    download_result = await manager.download_market_data(symbols=symbols_to_download)
    print(f"Download completed: {download_result['total_downloaded']} successful")
    
    # Process data
    print("\nProcessing data for Qlib...")
    process_result = await manager.process_data_for_qlib()
    print(f"Processing completed: {process_result['total_processed']} processed")
    
    # Setup Qlib dataset
    print("\nSetting up Qlib dataset...")
    if await manager.setup_qlib_dataset():
        print("✅ Qlib dataset setup successful")
    else:
        print("❌ Qlib dataset setup failed")
    
    # Create backup
    print("\nCreating backup...")
    backup_result = await manager.backup_data()
    if backup_result['success']:
        print(f"✅ Backup created: {backup_result['backup_path']}")
    else:
        print(f"❌ Backup failed: {backup_result['error']}")

if __name__ == "__main__":
    asyncio.run(main())
