#!/usr/bin/env python3
"""
Enhanced Qlib Data Manager - Integrated Dataset Management
Manages Qlib dataset integration with the backtesting system
"""

import os
import sys
import json
import logging
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import yfinance as yf
from tqdm import tqdm

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.qlib_config import QlibConfig
from scripts.qlib_dataset_downloader import QlibDatasetDownloader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('enhanced_qlib_data_manager.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EnhancedQlibDataManager:
    def __init__(self):
        self.config = QlibConfig()
        self.dataset_downloader = QlibDatasetDownloader()
        self.project_root = Path(__file__).parent.parent
        self.data_dir = self.project_root / "data"
        self.qlib_data_dir = self.data_dir / "qlib"
        self.cache_dir = self.data_dir / "cache"
        
        # Create directories
        self.qlib_data_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"EnhancedQlibDataManager initialized with data directory: {self.qlib_data_dir}")
    
    def get_dataset_status(self) -> Dict[str, Any]:
        """
        Get comprehensive dataset status
        """
        try:
            # Check if dataset exists
            dataset_info = self.dataset_downloader.get_dataset_info()
            
            if dataset_info.get('status') == 'not_found':
                return {
                    "status": "not_found",
                    "message": "Qlib dataset not found",
                    "recommendation": "Run dataset download first"
                }
            
            # Get additional statistics
            stats = self._get_dataset_statistics()
            
            # Check data quality
            quality_report = self._check_data_quality()
            
            return {
                "status": "ready",
                "dataset_info": dataset_info,
                "statistics": stats,
                "quality_report": quality_report,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting dataset status: {e}")
            return {"status": "error", "error": str(e)}
    
    def _get_dataset_statistics(self) -> Dict[str, Any]:
        """
        Get detailed dataset statistics
        """
        try:
            data_files = list(self.qlib_data_dir.rglob("*.csv"))
            symbols = set()
            total_records = 0
            date_range = {"start": None, "end": None}
            
            for data_file in data_files:
                try:
                    data = pd.read_csv(data_file)
                    if not data.empty:
                        # Extract symbol from file path
                        symbol = data_file.parent.name
                        symbols.add(symbol)
                        total_records += len(data)
                        
                        # Update date range
                        if 'Date' in data.columns:
                            dates = pd.to_datetime(data['Date'])
                            if date_range["start"] is None or dates.min() < date_range["start"]:
                                date_range["start"] = dates.min()
                            if date_range["end"] is None or dates.max() > date_range["end"]:
                                date_range["end"] = dates.max()
                                
                except Exception as e:
                    logger.warning(f"Error processing {data_file}: {e}")
            
            return {
                "total_symbols": len(symbols),
                "total_records": total_records,
                "total_files": len(data_files),
                "date_range": {
                    "start": date_range["start"].isoformat() if date_range["start"] else None,
                    "end": date_range["end"].isoformat() if date_range["end"] else None
                },
                "average_records_per_symbol": total_records / len(symbols) if symbols else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting dataset statistics: {e}")
            return {"error": str(e)}
    
    def _check_data_quality(self) -> Dict[str, Any]:
        """
        Check data quality and completeness
        """
        try:
            data_files = list(self.qlib_data_dir.rglob("*.csv"))
            quality_report = {
                "total_files_checked": 0,
                "files_with_issues": 0,
                "missing_fields": {},
                "data_gaps": 0,
                "symbols_with_issues": []
            }
            
            required_fields = ['open', 'high', 'low', 'close', 'volume']
            
            for data_file in data_files[:10]:  # Check first 10 files
                try:
                    data = pd.read_csv(data_file)
                    quality_report["total_files_checked"] += 1
                    
                    # Check for missing fields
                    missing_fields = [field for field in required_fields if field not in data.columns]
                    if missing_fields:
                        quality_report["files_with_issues"] += 1
                        symbol = data_file.parent.name
                        quality_report["symbols_with_issues"].append(symbol)
                        
                        for field in missing_fields:
                            if field not in quality_report["missing_fields"]:
                                quality_report["missing_fields"][field] = 0
                            quality_report["missing_fields"][field] += 1
                    
                    # Check for data gaps
                    if 'Date' in data.columns and len(data) > 1:
                        dates = pd.to_datetime(data['Date'])
                        expected_days = len(pd.date_range(dates.min(), dates.max(), freq='B'))
                        if len(dates) < expected_days * 0.9:  # Allow 10% missing data
                            quality_report["data_gaps"] += 1
                            
                except Exception as e:
                    logger.warning(f"Error checking quality for {data_file}: {e}")
            
            return quality_report
            
        except Exception as e:
            logger.error(f"Error checking data quality: {e}")
            return {"error": str(e)}
    
    def download_dataset(self, force_download: bool = False) -> Dict[str, Any]:
        """
        Download the Qlib dataset
        """
        try:
            logger.info("Starting dataset download...")
            result = self.dataset_downloader.download_qlib_dataset(force_download=force_download)
            
            if result.get('success'):
                # Configure Qlib for the dataset
                config_result = self.dataset_downloader.configure_qlib_for_dataset()
                result['configuration'] = config_result
            
            return result
            
        except Exception as e:
            logger.error(f"Error downloading dataset: {e}")
            return {"success": False, "error": str(e)}
    
    def get_symbols(self) -> List[str]:
        """
        Get list of available symbols in the dataset
        """
        try:
            data_files = list(self.qlib_data_dir.rglob("*.csv"))
            symbols = set()
            
            for data_file in data_files:
                symbol = data_file.parent.name
                if symbol and symbol != "day":
                    symbols.add(symbol)
            
            return sorted(list(symbols))
            
        except Exception as e:
            logger.error(f"Error getting symbols: {e}")
            return []
    
    def get_symbol_data(self, symbol: str, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """
        Get data for a specific symbol
        """
        try:
            # Look for data file
            data_files = list(self.qlib_data_dir.rglob(f"*/{symbol}/data.csv"))
            
            if not data_files:
                return {"success": False, "error": f"No data found for symbol {symbol}"}
            
            data_file = data_files[0]
            data = pd.read_csv(data_file)
            
            if data.empty:
                return {"success": False, "error": f"Empty data for symbol {symbol}"}
            
            # Filter by date range if provided
            if start_date or end_date:
                if 'Date' in data.columns:
                    data['Date'] = pd.to_datetime(data['Date'])
                    if start_date:
                        data = data[data['Date'] >= start_date]
                    if end_date:
                        data = data[data['Date'] <= end_date]
            
            return {
                "success": True,
                "symbol": symbol,
                "data": data.to_dict('records'),
                "records": len(data),
                "date_range": {
                    "start": data['Date'].min().isoformat() if 'Date' in data.columns else None,
                    "end": data['Date'].max().isoformat() if 'Date' in data.columns else None
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting data for {symbol}: {e}")
            return {"success": False, "error": str(e)}
    
    def get_multiple_symbols_data(self, symbols: List[str], start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """
        Get data for multiple symbols
        """
        try:
            results = {}
            successful_symbols = 0
            failed_symbols = 0
            
            for symbol in symbols:
                result = self.get_symbol_data(symbol, start_date, end_date)
                results[symbol] = result
                
                if result['success']:
                    successful_symbols += 1
                else:
                    failed_symbols += 1
            
            return {
                "success": successful_symbols > 0,
                "results": results,
                "summary": {
                    "total_symbols": len(symbols),
                    "successful_symbols": successful_symbols,
                    "failed_symbols": failed_symbols
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting multiple symbols data: {e}")
            return {"success": False, "error": str(e)}
    
    def update_symbol_data(self, symbol: str) -> Dict[str, Any]:
        """
        Update data for a specific symbol
        """
        try:
            logger.info(f"Updating data for symbol {symbol}...")
            
            # Get existing data to find the last date
            existing_data = self.get_symbol_data(symbol)
            last_date = None
            
            if existing_data['success'] and existing_data['data']:
                dates = [record.get('Date') for record in existing_data['data'] if record.get('Date')]
                if dates:
                    last_date = max(dates)
            
            # Download new data from last date
            start_date = last_date if last_date else "2010-01-01"
            end_date = datetime.now().strftime("%Y-%m-%d")
            
            # Download using yfinance
            ticker = yf.Ticker(symbol)
            new_data = ticker.history(
                start=start_date,
                end=end_date,
                auto_adjust=True
            )
            
            if new_data.empty:
                return {"success": False, "error": "No new data available"}
            
            # Prepare and save data
            qlib_data = self.dataset_downloader._prepare_qlib_format(new_data, symbol)
            
            # Save to file
            symbol_dir = self.qlib_data_dir / "calendars" / "US" / "day" / symbol
            symbol_dir.mkdir(parents=True, exist_ok=True)
            data_file = symbol_dir / "data.csv"
            qlib_data.to_csv(data_file, index=True)
            
            return {
                "success": True,
                "symbol": symbol,
                "new_records": len(new_data),
                "date_range": {
                    "start": start_date,
                    "end": end_date
                }
            }
            
        except Exception as e:
            logger.error(f"Error updating data for {symbol}: {e}")
            return {"success": False, "error": str(e)}
    
    def validate_dataset(self) -> Dict[str, Any]:
        """
        Comprehensive dataset validation
        """
        try:
            logger.info("Starting comprehensive dataset validation...")
            
            validation_report = {
                "overall_status": "unknown",
                "checks": {},
                "recommendations": []
            }
            
            # Check 1: Dataset existence
            dataset_exists = self.dataset_downloader._check_dataset_exists()
            validation_report["checks"]["dataset_exists"] = {
                "status": "pass" if dataset_exists else "fail",
                "message": "Dataset found" if dataset_exists else "Dataset not found"
            }
            
            if not dataset_exists:
                validation_report["overall_status"] = "failed"
                validation_report["recommendations"].append("Download the dataset first")
                return validation_report
            
            # Check 2: Data files
            data_files = list(self.qlib_data_dir.rglob("*.csv"))
            validation_report["checks"]["data_files"] = {
                "status": "pass" if data_files else "fail",
                "count": len(data_files),
                "message": f"Found {len(data_files)} data files" if data_files else "No data files found"
            }
            
            # Check 3: Symbol coverage
            symbols = self.get_symbols()
            validation_report["checks"]["symbol_coverage"] = {
                "status": "pass" if len(symbols) >= 100 else "warning",
                "count": len(symbols),
                "message": f"Found {len(symbols)} symbols"
            }
            
            # Check 4: Data quality
            quality_report = self._check_data_quality()
            validation_report["checks"]["data_quality"] = {
                "status": "pass" if quality_report.get("files_with_issues", 0) == 0 else "warning",
                "details": quality_report
            }
            
            # Check 5: Qlib integration
            try:
                import qlib
                qlib.init(provider_uri=str(self.qlib_data_dir), region='US')
                validation_report["checks"]["qlib_integration"] = {
                    "status": "pass",
                    "message": "Qlib integration successful"
                }
            except Exception as e:
                validation_report["checks"]["qlib_integration"] = {
                    "status": "fail",
                    "message": f"Qlib integration failed: {str(e)}"
                }
            
            # Determine overall status
            failed_checks = [check for check in validation_report["checks"].values() if check["status"] == "fail"]
            warning_checks = [check for check in validation_report["checks"].values() if check["status"] == "warning"]
            
            if failed_checks:
                validation_report["overall_status"] = "failed"
            elif warning_checks:
                validation_report["overall_status"] = "warning"
            else:
                validation_report["overall_status"] = "passed"
            
            return validation_report
            
        except Exception as e:
            logger.error(f"Error validating dataset: {e}")
            return {"overall_status": "error", "error": str(e)}
    
    def get_backtesting_data(self, symbols: List[str], start_date: str, end_date: str) -> Dict[str, Any]:
        """
        Get formatted data for backtesting
        """
        try:
            logger.info(f"Getting backtesting data for {len(symbols)} symbols from {start_date} to {end_date}")
            
            backtesting_data = {}
            successful_symbols = 0
            
            for symbol in symbols:
                try:
                    result = self.get_symbol_data(symbol, start_date, end_date)
                    if result['success']:
                        # Convert to backtesting format
                        data = pd.DataFrame(result['data'])
                        if not data.empty and 'Date' in data.columns:
                            data['Date'] = pd.to_datetime(data['Date'])
                            data = data.set_index('Date')
                            
                            # Ensure all required columns exist
                            required_columns = ['open', 'high', 'low', 'close', 'volume']
                            for col in required_columns:
                                if col not in data.columns:
                                    data[col] = 0.0
                            
                            backtesting_data[symbol] = data
                            successful_symbols += 1
                            
                except Exception as e:
                    logger.warning(f"Error processing {symbol}: {e}")
            
            return {
                "success": successful_symbols > 0,
                "data": backtesting_data,
                "summary": {
                    "requested_symbols": len(symbols),
                    "successful_symbols": successful_symbols,
                    "failed_symbols": len(symbols) - successful_symbols,
                    "date_range": {
                        "start": start_date,
                        "end": end_date
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting backtesting data: {e}")
            return {"success": False, "error": str(e)}

def main():
    """
    Main function for data management
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Enhanced Qlib Data Manager')
    parser.add_argument('--status', action='store_true', help='Get dataset status')
    parser.add_argument('--download', action='store_true', help='Download dataset')
    parser.add_argument('--force', action='store_true', help='Force re-download')
    parser.add_argument('--validate', action='store_true', help='Validate dataset')
    parser.add_argument('--symbols', action='store_true', help='List available symbols')
    parser.add_argument('--symbol', type=str, help='Get data for specific symbol')
    parser.add_argument('--start-date', type=str, help='Start date for data retrieval')
    parser.add_argument('--end-date', type=str, help='End date for data retrieval')
    
    args = parser.parse_args()
    
    manager = EnhancedQlibDataManager()
    
    if args.status:
        result = manager.get_dataset_status()
        print(json.dumps(result, indent=2))
    
    elif args.download:
        result = manager.download_dataset(force_download=args.force)
        print(json.dumps(result, indent=2))
    
    elif args.validate:
        result = manager.validate_dataset()
        print(json.dumps(result, indent=2))
    
    elif args.symbols:
        symbols = manager.get_symbols()
        print(json.dumps({"symbols": symbols, "count": len(symbols)}, indent=2))
    
    elif args.symbol:
        result = manager.get_symbol_data(args.symbol, args.start_date, args.end_date)
        print(json.dumps(result, indent=2))
    
    else:
        # Default: show status
        result = manager.get_dataset_status()
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
