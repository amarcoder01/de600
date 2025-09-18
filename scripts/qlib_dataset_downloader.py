#!/usr/bin/env python3
"""
Qlib Dataset Downloader - Full US Historical Stock Dataset
Downloads and configures the complete Qlib dataset for backtesting
"""

import os
import sys
import json
import logging
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import yfinance as yf
import requests
from tqdm import tqdm

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.qlib_config import QlibConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('qlib_dataset_download.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class QlibDatasetDownloader:
    def __init__(self):
        self.config = QlibConfig()
        self.project_root = Path(__file__).parent.parent
        self.data_dir = self.project_root / "data"
        self.qlib_data_dir = self.data_dir / "qlib"
        self.cache_dir = self.data_dir / "cache"
        
        # Create directories
        self.qlib_data_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Dataset configuration
        self.dataset_config = {
            "name": "qlib_us_stock_dataset",
            "version": "1.0.0",
            "description": "Full US Historical Stock Dataset for Qlib Backtesting",
            "start_date": "2010-01-01",
            "end_date": datetime.now().strftime("%Y-%m-%d"),
            "fields": ["open", "high", "low", "close", "volume", "adj_close"],
            "adjustment_fields": ["adj_close", "split_ratio", "dividend"],
            "symbols_file": "symbols.json",
            "metadata_file": "dataset_metadata.json"
        }
        
        logger.info(f"QlibDatasetDownloader initialized with data directory: {self.qlib_data_dir}")
    
    def download_qlib_dataset(self, force_download: bool = False) -> Dict[str, Any]:
        """
        Download the full Qlib US stock dataset
        """
        try:
            logger.info("Starting Qlib dataset download...")
            
            # Check if dataset already exists
            if not force_download and self._check_dataset_exists():
                logger.info("Dataset already exists. Use force_download=True to re-download.")
                return self._load_dataset_metadata()
            
            # Download using Qlib's built-in dataset downloader
            result = self._download_with_qlib()
            
            if result['success']:
                # Verify and enhance the dataset
                self._verify_dataset()
                self._enhance_dataset()
                
                # Save metadata
                metadata = self._create_dataset_metadata()
                self._save_dataset_metadata(metadata)
                
                logger.info("Qlib dataset download completed successfully!")
                return metadata
            else:
                logger.error(f"Failed to download Qlib dataset: {result['error']}")
                return result
                
        except Exception as e:
            logger.error(f"Error downloading Qlib dataset: {e}")
            return {"success": False, "error": str(e)}
    
    def _download_with_qlib(self) -> Dict[str, Any]:
        """
        Download dataset using Qlib's built-in downloader
        """
        try:
            logger.info("Downloading Qlib dataset using built-in downloader...")
            
            # Set environment variables
            os.environ['QLIB_PROVIDER_URI'] = str(self.qlib_data_dir)
            os.environ['QLIB_REGION'] = 'US'
            
            # Try to import and use Qlib's dataset downloader
            try:
                import qlib
                from qlib.data import D
                from qlib.data.dataset import download_dataset
                
                # Initialize Qlib
                qlib.init(provider_uri=str(self.qlib_data_dir), region='US')
                
                # Download the default US stock dataset
                logger.info("Downloading Qlib US stock dataset...")
                download_dataset(
                    dataset_name="qlib_us_stock_dataset",
                    target_dir=str(self.qlib_data_dir),
                    region="US"
                )
                
                return {"success": True, "message": "Dataset downloaded successfully"}
                
            except ImportError as e:
                logger.warning(f"Qlib import failed: {e}, trying alternative download method...")
                return self._download_alternative_method()
                
        except Exception as e:
            logger.error(f"Error in Qlib download: {e}")
            return {"success": False, "error": str(e)}
    
    def _download_alternative_method(self) -> Dict[str, Any]:
        """
        Alternative download method using direct data sources
        """
        try:
            logger.info("Using alternative download method...")
            
            # Download SP500 symbols and data
            symbols = self._get_sp500_symbols()
            logger.info(f"Downloading data for {len(symbols)} symbols...")
            
            # Download data for each symbol
            successful_downloads = 0
            failed_downloads = 0
            
            for symbol in tqdm(symbols, desc="Downloading stock data"):
                try:
                    result = self._download_symbol_data(symbol)
                    if result['success']:
                        successful_downloads += 1
                    else:
                        failed_downloads += 1
                        logger.warning(f"Failed to download {symbol}: {result['error']}")
                except Exception as e:
                    failed_downloads += 1
                    logger.warning(f"Error downloading {symbol}: {e}")
            
            logger.info(f"Download completed: {successful_downloads} successful, {failed_downloads} failed")
            
            return {
                "success": successful_downloads > 0,
                "message": f"Downloaded {successful_downloads} symbols successfully",
                "successful_downloads": successful_downloads,
                "failed_downloads": failed_downloads
            }
            
        except Exception as e:
            logger.error(f"Error in alternative download: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_sp500_symbols(self) -> List[str]:
        """
        Get SP500 symbols for dataset using a comprehensive list
        """
        try:
            # Use a comprehensive list of major US stocks and ETFs
            # This avoids the need for web scraping and lxml dependencies
            major_stocks = [
                # Technology
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM',
                'PYPL', 'INTC', 'AMD', 'ORCL', 'CSCO', 'IBM', 'QCOM', 'AVGO', 'TXN', 'MU',
                
                # Financial
                'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'AXP', 'SCHW', 'C', 'USB',
                'PNC', 'COF', 'TFC', 'KEY', 'HBAN', 'RF', 'ZION', 'FITB', 'MTB', 'STT',
                
                # Healthcare
                'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'DHR', 'LLY', 'BMY', 'AMGN', 'GILD',
                'CVS', 'ANTM', 'CI', 'HUM', 'CNC', 'DVA', 'WBA', 'DGX', 'LH', 'PKI',
                
                # Consumer
                'PG', 'KO', 'PEP', 'WMT', 'HD', 'MCD', 'DIS', 'NKE', 'SBUX', 'TGT',
                'COST', 'LOW', 'TJX', 'ROST', 'ULTA', 'DG', 'DLTR', 'FIVE', 'BURL', 'GPS',
                
                # Industrial
                'CAT', 'BA', 'MMM', 'HON', 'UPS', 'FDX', 'RTX', 'LMT', 'NOC', 'GD',
                'EMR', 'ETN', 'ITW', 'PH', 'DOV', 'XYL', 'AME', 'FTV', 'IEX', 'PNR',
                
                # Energy
                'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'HAL', 'BKR', 'PSX', 'VLO', 'MPC',
                'OXY', 'PXD', 'DVN', 'HES', 'APA', 'MRO', 'FANG', 'CTRA', 'EQT', 'CHK',
                
                # Materials
                'LIN', 'APD', 'FCX', 'NEM', 'DOW', 'DD', 'NUE', 'BLL', 'ALB', 'ECL',
                'SHW', 'VMC', 'MLM', 'BMS', 'NSC', 'UNP', 'CSX', 'KSU', 'CP', 'CNI',
                
                # Real Estate
                'PLD', 'AMT', 'CCI', 'EQIX', 'DLR', 'PSA', 'SPG', 'O', 'WELL', 'VICI',
                'EQR', 'AVB', 'MAA', 'ESS', 'UDR', 'CPT', 'ARE', 'BXP', 'SLG', 'KIM',
                
                # Utilities
                'NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'XEL', 'WEC', 'DTE', 'ED',
                'PEG', 'AEE', 'CMS', 'CNP', 'LNT', 'ATO', 'NI', 'PNW', 'BKH', 'ALE',
                
                # Communication Services
                'T', 'VZ', 'CMCSA', 'CHTR', 'TMUS', 'V', 'MA', 'ADP', 'PAYX', 'FIS',
                'FISV', 'GPN', 'JKHY', 'MCO', 'SPGI', 'MSCI', 'ICE', 'NDAQ', 'CME', 'CBOE',
                
                # Popular ETFs
                'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'BND', 'GLD', 'SLV',
                'TLT', 'LQD', 'HYG', 'EMB', 'EFA', 'EEM', 'AGG', 'TIP', 'SHY', 'IEF'
            ]
            
            logger.info(f"Using comprehensive list of {len(major_stocks)} major US stocks and ETFs")
            return major_stocks
            
        except Exception as e:
            logger.warning(f"Error in symbol list generation: {e}, using minimal default symbols")
            return [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
                'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'BND', 'GLD',
                'JPM', 'JNJ', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'PYPL', 'BAC'
            ]
    
    def _download_symbol_data(self, symbol: str) -> Dict[str, Any]:
        """
        Download data for a single symbol
        """
        try:
            # Create symbol directory
            symbol_dir = self.qlib_data_dir / "calendars" / "US" / "day" / symbol
            symbol_dir.mkdir(parents=True, exist_ok=True)
            
            # Download data using yfinance
            ticker = yf.Ticker(symbol)
            data = ticker.history(
                start=self.dataset_config["start_date"],
                end=self.dataset_config["end_date"],
                auto_adjust=True
            )
            
            if data.empty:
                return {"success": False, "error": "No data available"}
            
            # Prepare data for Qlib format
            qlib_data = self._prepare_qlib_format(data, symbol)
            
            # Save data
            data_file = symbol_dir / "data.csv"
            qlib_data.to_csv(data_file, index=True)
            
            return {"success": True, "data_points": len(data)}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _prepare_qlib_format(self, data: pd.DataFrame, symbol: str) -> pd.DataFrame:
        """
        Prepare data in Qlib format
        """
        # Ensure all required columns exist
        required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        
        for col in required_columns:
            if col not in data.columns:
                data[col] = 0.0
        
        # Add adjustment columns if not present
        if 'Adj Close' not in data.columns:
            data['Adj Close'] = data['Close']
        
        # Create Qlib format
        qlib_data = pd.DataFrame({
            'open': data['Open'],
            'high': data['High'],
            'low': data['Low'],
            'close': data['Close'],
            'volume': data['Volume'],
            'adj_close': data['Adj Close'],
            'split_ratio': 1.0,  # Default split ratio
            'dividend': 0.0      # Default dividend
        })
        
        # Add symbol column
        qlib_data['symbol'] = symbol
        
        return qlib_data
    
    def _check_dataset_exists(self) -> bool:
        """
        Check if the dataset already exists
        """
        metadata_file = self.qlib_data_dir / self.dataset_config["metadata_file"]
        return metadata_file.exists()
    
    def _verify_dataset(self):
        """
        Verify the downloaded dataset
        """
        logger.info("Verifying dataset...")
        
        # Check if data files exist
        data_files = list(self.qlib_data_dir.rglob("*.csv"))
        if not data_files:
            raise Exception("No data files found in dataset")
        
        logger.info(f"Found {len(data_files)} data files")
        
        # Verify data quality
        for data_file in data_files[:5]:  # Check first 5 files
            try:
                data = pd.read_csv(data_file)
                required_columns = ['open', 'high', 'low', 'close', 'volume']
                
                for col in required_columns:
                    if col not in data.columns:
                        logger.warning(f"Missing column {col} in {data_file}")
                
                logger.info(f"Verified {data_file}: {len(data)} records")
                
            except Exception as e:
                logger.warning(f"Error verifying {data_file}: {e}")
    
    def _enhance_dataset(self):
        """
        Enhance the dataset with additional features
        """
        logger.info("Enhancing dataset...")
        
        # Create calendar files
        self._create_calendar_files()
        
        # Create feature files
        self._create_feature_files()
        
        logger.info("Dataset enhancement completed")
    
    def _create_calendar_files(self):
        """
        Create calendar files for Qlib
        """
        try:
            calendar_dir = self.qlib_data_dir / "calendars" / "US" / "day"
            calendar_dir.mkdir(parents=True, exist_ok=True)
            
            # Create trading calendar
            start_date = datetime.strptime(self.dataset_config["start_date"], "%Y-%m-%d")
            end_date = datetime.strptime(self.dataset_config["end_date"], "%Y-%m-%d")
            
            trading_days = []
            current_date = start_date
            while current_date <= end_date:
                if current_date.weekday() < 5:  # Monday to Friday
                    trading_days.append(current_date.strftime("%Y-%m-%d"))
                current_date += timedelta(days=1)
            
            # Save calendar
            calendar_file = calendar_dir / "trading_calendar.txt"
            with open(calendar_file, 'w') as f:
                for day in trading_days:
                    f.write(f"{day}\n")
            
            logger.info(f"Created trading calendar with {len(trading_days)} days")
            
        except Exception as e:
            logger.error(f"Error creating calendar files: {e}")
    
    def _create_feature_files(self):
        """
        Create feature files for Qlib
        """
        try:
            feature_dir = self.qlib_data_dir / "features" / "US" / "day"
            feature_dir.mkdir(parents=True, exist_ok=True)
            
            # Create feature configuration
            features_config = {
                "fields": self.dataset_config["fields"],
                "adjustment_fields": self.dataset_config["adjustment_fields"],
                "created_at": datetime.now().isoformat(),
                "version": self.dataset_config["version"]
            }
            
            feature_file = feature_dir / "features.json"
            with open(feature_file, 'w') as f:
                json.dump(features_config, f, indent=2)
            
            logger.info("Created feature configuration")
            
        except Exception as e:
            logger.error(f"Error creating feature files: {e}")
    
    def _create_dataset_metadata(self) -> Dict[str, Any]:
        """
        Create dataset metadata
        """
        data_files = list(self.qlib_data_dir.rglob("*.csv"))
        total_records = 0
        
        for data_file in data_files:
            try:
                data = pd.read_csv(data_file)
                total_records += len(data)
            except:
                pass
        
        metadata = {
            "name": self.dataset_config["name"],
            "version": self.dataset_config["version"],
            "description": self.dataset_config["description"],
            "start_date": self.dataset_config["start_date"],
            "end_date": self.dataset_config["end_date"],
            "total_files": len(data_files),
            "total_records": total_records,
            "fields": self.dataset_config["fields"],
            "adjustment_fields": self.dataset_config["adjustment_fields"],
            "data_directory": str(self.qlib_data_dir),
            "created_at": datetime.now().isoformat(),
            "status": "ready"
        }
        
        return metadata
    
    def _save_dataset_metadata(self, metadata: Dict[str, Any]):
        """
        Save dataset metadata
        """
        metadata_file = self.qlib_data_dir / self.dataset_config["metadata_file"]
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Saved dataset metadata to {metadata_file}")
    
    def _load_dataset_metadata(self) -> Dict[str, Any]:
        """
        Load dataset metadata
        """
        metadata_file = self.qlib_data_dir / self.dataset_config["metadata_file"]
        with open(metadata_file, 'r') as f:
            return json.load(f)
    
    def get_dataset_info(self) -> Dict[str, Any]:
        """
        Get information about the current dataset
        """
        if self._check_dataset_exists():
            return self._load_dataset_metadata()
        else:
            return {"status": "not_found", "message": "Dataset not found"}
    
    def configure_qlib_for_dataset(self):
        """
        Configure Qlib to use the local dataset
        """
        try:
            logger.info("Configuring Qlib for local dataset...")
            
            # Update Qlib configuration
            self.config.update_config("provider_uri", "value", str(self.qlib_data_dir))
            self.config.update_config("region", "value", "US")
            self.config.save_config()
            
            # Test Qlib initialization
            try:
                import qlib
                qlib.init(provider_uri=str(self.qlib_data_dir), region='US')
                logger.info("Qlib configured successfully for local dataset")
                return {"success": True, "message": "Qlib configured successfully"}
            except Exception as e:
                logger.error(f"Failed to initialize Qlib: {e}")
                return {"success": False, "error": str(e)}
                
        except Exception as e:
            logger.error(f"Error configuring Qlib: {e}")
            return {"success": False, "error": str(e)}

def main():
    """
    Main function for dataset download
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Download Qlib US Stock Dataset')
    parser.add_argument('--force', action='store_true', help='Force re-download of dataset')
    parser.add_argument('--info', action='store_true', help='Show dataset information')
    parser.add_argument('--configure', action='store_true', help='Configure Qlib for dataset')
    
    args = parser.parse_args()
    
    downloader = QlibDatasetDownloader()
    
    if args.info:
        info = downloader.get_dataset_info()
        print(json.dumps(info, indent=2))
        return
    
    if args.configure:
        result = downloader.configure_qlib_for_dataset()
        print(json.dumps(result, indent=2))
        return
    
    # Download dataset
    result = downloader.download_qlib_dataset(force_download=args.force)
    print(json.dumps(result, indent=2))
    
    if result.get('success'):
        # Configure Qlib
        config_result = downloader.configure_qlib_for_dataset()
        print(f"Configuration result: {config_result}")

if __name__ == "__main__":
    main()
