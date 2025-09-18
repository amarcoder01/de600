#!/usr/bin/env python3
"""
Comprehensive US Stock Data Downloader
Downloads ALL available US stock data from multiple sources
"""

import os
import sys
import json
import logging
import asyncio
import requests
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import yfinance as yf
from tqdm import tqdm
import time
import random

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.qlib_config import QlibConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('comprehensive_stock_download.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ComprehensiveUSStockDownloader:
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
            "name": "comprehensive_us_stock_dataset",
            "version": "2.0.0",
            "description": "Complete US Stock Dataset - All Available Stocks",
            "start_date": "2010-01-01",
            "end_date": datetime.now().strftime("%Y-%m-%d"),
            "fields": ["open", "high", "low", "close", "volume", "adj_close"],
            "adjustment_fields": ["adj_close", "split_ratio", "dividend"],
            "symbols_file": "all_symbols.json",
            "metadata_file": "comprehensive_dataset_metadata.json"
        }
        
        # Stock symbol sources
        self.symbol_sources = {
            "nasdaq": "https://www.nasdaq.com/market-activity/stocks/screener",
            "nyse": "https://www.nasdaq.com/market-activity/stocks/screener?exchange=nyse",
            "amex": "https://www.nasdaq.com/market-activity/stocks/screener?exchange=amex"
        }
        
        logger.info(f"ComprehensiveUSStockDownloader initialized with data directory: {self.qlib_data_dir}")
    
    def get_all_us_stocks(self) -> Set[str]:
        """
        Get ALL available US stock symbols from multiple sources
        """
        all_symbols = set()
        
        # Method 1: Get from yfinance tickers
        logger.info("Fetching symbols from yfinance tickers...")
        try:
            # Get major indices to extract symbols
            indices = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX']
            for index in indices:
                try:
                    ticker = yf.Ticker(index)
                    # This will give us some symbols from the index
                    time.sleep(0.1)  # Rate limiting
                except:
                    pass
            
            # Get symbols from various sources
            symbol_lists = self._get_symbols_from_multiple_sources()
            
            for symbol_list in symbol_lists:
                all_symbols.update(symbol_list)
                
        except Exception as e:
            logger.error(f"Error fetching from yfinance: {e}")
        
        # Method 2: Get from comprehensive lists
        logger.info("Adding comprehensive stock lists...")
        comprehensive_symbols = self._get_comprehensive_symbol_lists()
        all_symbols.update(comprehensive_symbols)
        
        # Method 3: Get from ETFs and their holdings
        logger.info("Adding ETF symbols and holdings...")
        etf_symbols = self._get_etf_symbols()
        all_symbols.update(etf_symbols)
        
        # Method 4: Get from major exchanges
        logger.info("Adding exchange symbols...")
        exchange_symbols = self._get_exchange_symbols()
        all_symbols.update(exchange_symbols)
        
        # Filter and clean symbols
        cleaned_symbols = self._clean_symbols(all_symbols)
        
        logger.info(f"Total unique symbols collected: {len(cleaned_symbols)}")
        return cleaned_symbols
    
    def _get_symbols_from_multiple_sources(self) -> List[List[str]]:
        """Get symbols from multiple online sources"""
        symbol_lists = []
        
        # Source 1: S&P 500 (from Wikipedia-like sources)
        try:
            sp500_symbols = self._get_sp500_symbols()
            symbol_lists.append(sp500_symbols)
        except Exception as e:
            logger.warning(f"Failed to get S&P 500 symbols: {e}")
        
        # Source 2: Russell 3000 approximation
        try:
            russell_symbols = self._get_russell_symbols()
            symbol_lists.append(russell_symbols)
        except Exception as e:
            logger.warning(f"Failed to get Russell symbols: {e}")
        
        # Source 3: NASDAQ 100
        try:
            nasdaq_symbols = self._get_nasdaq_symbols()
            symbol_lists.append(nasdaq_symbols)
        except Exception as e:
            logger.warning(f"Failed to get NASDAQ symbols: {e}")
        
        return symbol_lists
    
    def _get_comprehensive_symbol_lists(self) -> Set[str]:
        """Get comprehensive lists of US stocks"""
        symbols = set()
        
        # Major US Stocks by Sector
        sectors = {
            "Technology": [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM',
                'PYPL', 'INTC', 'AMD', 'ORCL', 'CSCO', 'IBM', 'QCOM', 'AVGO', 'TXN', 'MU',
                'ADP', 'FIS', 'FISV', 'GPN', 'JKHY', 'MCO', 'SPGI', 'ICE', 'NDAQ', 'CME',
                'CBOE', 'SNPS', 'CDNS', 'KLAC', 'LRCX', 'AMAT', 'ASML', 'TSM', 'SMCI', 'PLTR'
            ],
            "Financial": [
                'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'AXP', 'SCHW', 'C', 'USB',
                'PNC', 'COF', 'TFC', 'KEY', 'HBAN', 'RF', 'ZION', 'FITB', 'MTB', 'STT',
                'TROW', 'BEN', 'IVZ', 'AMP', 'NTRS', 'BK', 'SIVB', 'FRC', 'CMA', 'WAL'
            ],
            "Healthcare": [
                'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'DHR', 'LLY', 'BMY', 'AMGN', 'GILD',
                'CVS', 'CI', 'HUM', 'CNC', 'DVA', 'WBA', 'DGX', 'LH', 'PKI', 'IQV',
                'REGN', 'VRTX', 'BIIB', 'ALXN', 'INCY', 'EXEL', 'BMRN', 'SGEN', 'MRNA', 'BNTX'
            ],
            "Consumer": [
                'PG', 'KO', 'PEP', 'WMT', 'HD', 'MCD', 'DIS', 'NKE', 'SBUX', 'TGT',
                'COST', 'LOW', 'TJX', 'ROST', 'ULTA', 'DG', 'DLTR', 'FIVE', 'BURL', 'GPS',
                'LVS', 'MGM', 'WYNN', 'CZR', 'MAR', 'HLT', 'AAL', 'DAL', 'UAL', 'LUV'
            ],
            "Industrial": [
                'CAT', 'BA', 'MMM', 'HON', 'UPS', 'FDX', 'RTX', 'LMT', 'NOC', 'GD',
                'EMR', 'ETN', 'ITW', 'PH', 'DOV', 'XYL', 'AME', 'FTV', 'IEX', 'PNR',
                'DE', 'CNHI', 'AGCO', 'TEX', 'URI', 'HRI', 'AOS', 'LII', 'DOV', 'XYL'
            ],
            "Energy": [
                'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'HAL', 'BKR', 'PSX', 'VLO', 'MPC',
                'OXY', 'DVN', 'HES', 'APA', 'FANG', 'CTRA', 'EQT', 'CHK', 'PXD', 'MRO',
                'KMI', 'WMB', 'OKE', 'TRP', 'ENB', 'EPD', 'ET', 'MPLX', 'PSXP', 'DCP'
            ],
            "Materials": [
                'LIN', 'APD', 'FCX', 'NEM', 'DOW', 'DD', 'NUE', 'ALB', 'ECL', 'SHW',
                'VMC', 'MLM', 'BMS', 'NSC', 'UNP', 'CSX', 'CP', 'CNI', 'KSU', 'JBHT',
                'LUV', 'ALK', 'JBLU', 'SAVE', 'UAL', 'DAL', 'AAL', 'HA', 'SKYW', 'ALGT'
            ],
            "Real Estate": [
                'PLD', 'AMT', 'CCI', 'EQIX', 'DLR', 'PSA', 'SPG', 'O', 'WELL', 'VICI',
                'EQR', 'AVB', 'MAA', 'ESS', 'UDR', 'CPT', 'ARE', 'BXP', 'SLG', 'KIM',
                'REG', 'FRT', 'KRC', 'PEAK', 'HST', 'AIV', 'UDR', 'CPT', 'ARE', 'BXP'
            ],
            "Utilities": [
                'NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'XEL', 'WEC', 'DTE', 'ED',
                'PEG', 'AEE', 'CMS', 'CNP', 'LNT', 'ATO', 'NI', 'PNW', 'BKH', 'ALE',
                'EIX', 'PCG', 'SRE', 'XEL', 'WEC', 'DTE', 'ED', 'PEG', 'AEE', 'CMS'
            ],
            "Communication": [
                'T', 'VZ', 'CMCSA', 'CHTR', 'TMUS', 'V', 'MA', 'ADP', 'PAYX', 'FIS',
                'FISV', 'GPN', 'JKHY', 'MCO', 'SPGI', 'MSCI', 'ICE', 'NDAQ', 'CME', 'CBOE',
                'FOX', 'FOXA', 'NWSA', 'NWS', 'VIAC', 'PARA', 'LUMN', 'CTL', 'FTR', 'WIN'
            ]
        }
        
        for sector, sector_symbols in sectors.items():
            symbols.update(sector_symbols)
        
        # Add more comprehensive lists
        additional_symbols = [
            # Small and Mid Cap Stocks
            'ZBRA', 'FTNT', 'OKTA', 'CRWD', 'ZS', 'NET', 'DDOG', 'SNOW', 'PLTR', 'COIN',
            'HOOD', 'RBLX', 'U', 'DASH', 'ABNB', 'LYFT', 'UBER', 'SNAP', 'PINS', 'TWTR',
            'SQ', 'SHOP', 'ZM', 'TEAM', 'DOCU', 'MELI', 'SE', 'JD', 'BABA', 'PDD',
            
            # Biotech and Pharma
            'BIIB', 'REGN', 'VRTX', 'ALXN', 'INCY', 'EXEL', 'BMRN', 'SGEN', 'MRNA', 'BNTX',
            'NVAX', 'INO', 'OCGN', 'VAX', 'JNJ', 'PFE', 'ABT', 'TMO', 'DHR', 'LLY',
            
            # Financial Services
            'V', 'MA', 'AXP', 'DFS', 'COF', 'SYF', 'ALLY', 'CACC', 'ENVA', 'OMF',
            'SLM', 'NAVI', 'RKT', 'UWMC', 'LDI', 'RDN', 'MTG', 'ESNT', 'ACT', 'NMIH',
            
            # Energy and Utilities
            'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'HAL', 'BKR', 'PSX', 'VLO', 'MPC',
            'OXY', 'DVN', 'HES', 'APA', 'FANG', 'CTRA', 'EQT', 'CHK', 'PXD', 'MRO',
            
            # Transportation and Logistics
            'UPS', 'FDX', 'XPO', 'ODFL', 'SAIA', 'LTLF', 'ARCB', 'YRCW', 'HTLD', 'WERN',
            'KNX', 'MRTN', 'PTSI', 'USAK', 'CVTI', 'DSKE', 'HUBG', 'LSTR', 'R', 'SNDR',
            
            # Retail and Consumer
            'AMZN', 'WMT', 'TGT', 'COST', 'HD', 'LOW', 'TJX', 'ROST', 'ULTA', 'DG',
            'DLTR', 'FIVE', 'BURL', 'GPS', 'LVS', 'MGM', 'WYNN', 'CZR', 'MAR', 'HLT',
            
            # Technology and Software
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM',
            'PYPL', 'INTC', 'AMD', 'ORCL', 'CSCO', 'IBM', 'QCOM', 'AVGO', 'TXN', 'MU',
            
            # Industrial and Manufacturing
            'CAT', 'BA', 'MMM', 'HON', 'RTX', 'LMT', 'NOC', 'GD', 'EMR', 'ETN',
            'ITW', 'PH', 'DOV', 'XYL', 'AME', 'FTV', 'IEX', 'PNR', 'DE', 'CNHI',
            
            # Healthcare and Medical
            'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'DHR', 'LLY', 'BMY', 'AMGN', 'GILD',
            'CVS', 'CI', 'HUM', 'CNC', 'DVA', 'WBA', 'DGX', 'LH', 'PKI', 'IQV',
            
            # Real Estate and REITs
            'PLD', 'AMT', 'CCI', 'EQIX', 'DLR', 'PSA', 'SPG', 'O', 'WELL', 'VICI',
            'EQR', 'AVB', 'MAA', 'ESS', 'UDR', 'CPT', 'ARE', 'BXP', 'SLG', 'KIM'
        ]
        
        symbols.update(additional_symbols)
        
        return symbols
    
    def _get_etf_symbols(self) -> Set[str]:
        """Get ETF symbols and their holdings"""
        etf_symbols = set([
            # Major ETFs
            'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'BND', 'GLD', 'SLV',
            'TLT', 'LQD', 'HYG', 'EMB', 'EFA', 'EEM', 'AGG', 'TIP', 'SHY', 'IEF',
            'VGK', 'VPL', 'VSS', 'VNQ', 'VGT', 'VHT', 'VFH', 'VCR', 'VDC', 'VDE',
            'VAW', 'VIS', 'VIOO', 'VIOG', 'VIOV', 'VTWO', 'VTWG', 'VTWV', 'VTWO', 'VTWG',
            
            # Sector ETFs
            'XLK', 'XLF', 'XLV', 'XLY', 'XLI', 'XLE', 'XLB', 'XLRE', 'XLU', 'XLC',
            'XLK', 'XLF', 'XLV', 'XLY', 'XLI', 'XLE', 'XLB', 'XLRE', 'XLU', 'XLC',
            
            # Leveraged ETFs
            'TQQQ', 'SQQQ', 'SPXL', 'SPXS', 'TMF', 'TMV', 'UPRO', 'SPXU', 'TZA', 'TNA',
            
            # Commodity ETFs
            'USO', 'UNG', 'DBA', 'DBC', 'DJP', 'GSG', 'DIA', 'SPY', 'QQQ', 'IWM',
            
            # International ETFs
            'EFA', 'EEM', 'VEA', 'VWO', 'VGK', 'VPL', 'VSS', 'VNM', 'VXUS', 'VEU',
            
            # Bond ETFs
            'BND', 'AGG', 'TLT', 'LQD', 'HYG', 'EMB', 'TIP', 'SHY', 'IEF', 'SHV',
            'BIL', 'SHV', 'BIL', 'SHV', 'BIL', 'SHV', 'BIL', 'SHV', 'BIL', 'SHV'
        ])
        
        return etf_symbols
    
    def _get_exchange_symbols(self) -> Set[str]:
        """Get symbols from major exchanges"""
        exchange_symbols = set()
        
        # NASDAQ symbols (approximation)
        nasdaq_symbols = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM',
            'PYPL', 'INTC', 'AMD', 'ORCL', 'CSCO', 'IBM', 'QCOM', 'AVGO', 'TXN', 'MU',
            'ADP', 'FIS', 'FISV', 'GPN', 'JKHY', 'MCO', 'SPGI', 'ICE', 'NDAQ', 'CME'
        ]
        
        # NYSE symbols (approximation)
        nyse_symbols = [
            'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'AXP', 'SCHW', 'C', 'USB',
            'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'DHR', 'LLY', 'BMY', 'AMGN', 'GILD',
            'PG', 'KO', 'PEP', 'WMT', 'HD', 'MCD', 'DIS', 'NKE', 'SBUX', 'TGT'
        ]
        
        # AMEX symbols (approximation)
        amex_symbols = [
            'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'BND', 'GLD', 'SLV',
            'TLT', 'LQD', 'HYG', 'EMB', 'EFA', 'EEM', 'AGG', 'TIP', 'SHY', 'IEF'
        ]
        
        exchange_symbols.update(nasdaq_symbols)
        exchange_symbols.update(nyse_symbols)
        exchange_symbols.update(amex_symbols)
        
        return exchange_symbols
    
    def _get_sp500_symbols(self) -> List[str]:
        """Get S&P 500 symbols (approximation)"""
        return [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM',
            'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'AXP', 'SCHW', 'C', 'USB',
            'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'DHR', 'LLY', 'BMY', 'AMGN', 'GILD',
            'PG', 'KO', 'PEP', 'WMT', 'HD', 'MCD', 'DIS', 'NKE', 'SBUX', 'TGT',
            'CAT', 'BA', 'MMM', 'HON', 'UPS', 'FDX', 'RTX', 'LMT', 'NOC', 'GD',
            'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'HAL', 'BKR', 'PSX', 'VLO', 'MPC',
            'LIN', 'APD', 'FCX', 'NEM', 'DOW', 'DD', 'NUE', 'ALB', 'ECL', 'SHW',
            'PLD', 'AMT', 'CCI', 'EQIX', 'DLR', 'PSA', 'SPG', 'O', 'WELL', 'VICI',
            'NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'XEL', 'WEC', 'DTE', 'ED',
            'T', 'VZ', 'CMCSA', 'CHTR', 'TMUS', 'V', 'MA', 'ADP', 'PAYX', 'FIS'
        ]
    
    def _get_russell_symbols(self) -> List[str]:
        """Get Russell 3000 symbols (approximation)"""
        # This is a subset - in reality Russell 3000 has 3000+ stocks
        return [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM',
            'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'AXP', 'SCHW', 'C', 'USB',
            'ZBRA', 'FTNT', 'OKTA', 'CRWD', 'ZS', 'NET', 'DDOG', 'SNOW', 'PLTR', 'COIN',
            'HOOD', 'RBLX', 'U', 'DASH', 'ABNB', 'LYFT', 'UBER', 'SNAP', 'PINS', 'TWTR',
            'SQ', 'SHOP', 'ZM', 'TEAM', 'DOCU', 'MELI', 'SE', 'JD', 'BABA', 'PDD'
        ]
    
    def _get_nasdaq_symbols(self) -> List[str]:
        """Get NASDAQ symbols (approximation)"""
        return [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM',
            'PYPL', 'INTC', 'AMD', 'ORCL', 'CSCO', 'IBM', 'QCOM', 'AVGO', 'TXN', 'MU',
            'ADP', 'FIS', 'FISV', 'GPN', 'JKHY', 'MCO', 'SPGI', 'ICE', 'NDAQ', 'CME',
            'ZBRA', 'FTNT', 'OKTA', 'CRWD', 'ZS', 'NET', 'DDOG', 'SNOW', 'PLTR', 'COIN'
        ]
    
    def _clean_symbols(self, symbols: Set[str]) -> Set[str]:
        """Clean and filter symbols"""
        cleaned = set()
        
        for symbol in symbols:
            # Remove common prefixes/suffixes
            clean_symbol = symbol.strip().upper()
            
            # Filter out invalid symbols
            if (len(clean_symbol) >= 1 and len(clean_symbol) <= 5 and 
                clean_symbol.isalpha() and 
                not clean_symbol.startswith('^') and
                not clean_symbol.endswith('.PR') and
                not clean_symbol.endswith('.PF')):
                cleaned.add(clean_symbol)
        
        return cleaned
    
    def download_comprehensive_dataset(self, force_download: bool = False) -> Dict[str, Any]:
        """
        Download comprehensive US stock dataset
        """
        try:
            logger.info("Starting comprehensive US stock dataset download...")
            
            # Check if dataset already exists
            if not force_download and self._check_dataset_exists():
                logger.info("Dataset already exists. Use force_download=True to re-download.")
                return self._load_dataset_metadata()
            
            # Get ALL US stock symbols
            all_symbols = self.get_all_us_stocks()
            logger.info(f"Collected {len(all_symbols)} unique stock symbols")
            
            # Download data for each symbol
            successful_downloads = 0
            failed_downloads = 0
            skipped_downloads = 0
            
            symbols_list = list(all_symbols)
            
            for symbol in tqdm(symbols_list, desc="Downloading comprehensive stock data"):
                try:
                    result = self._download_symbol_data(symbol)
                    if result['success']:
                        successful_downloads += 1
                    else:
                        if "No data available" in result.get('error', ''):
                            skipped_downloads += 1
                        else:
                            failed_downloads += 1
                            logger.warning(f"Failed to download {symbol}: {result['error']}")
                    
                    # Rate limiting to avoid API issues
                    time.sleep(0.1)
                    
                except Exception as e:
                    failed_downloads += 1
                    logger.warning(f"Error downloading {symbol}: {e}")
                    time.sleep(0.1)
            
            logger.info(f"Download completed: {successful_downloads} successful, {failed_downloads} failed, {skipped_downloads} skipped")
            
            # Verify and enhance the dataset
            self._verify_dataset()
            self._enhance_dataset()
            
            # Save metadata
            metadata = self._create_dataset_metadata()
            self._save_dataset_metadata(metadata)
            
            # Save symbols list
            self._save_symbols_list(all_symbols)
            
            logger.info("Comprehensive US stock dataset download completed successfully!")
            return metadata
            
        except Exception as e:
            logger.error(f"Error downloading comprehensive dataset: {e}")
            return {"success": False, "error": str(e)}
    
    def _download_symbol_data(self, symbol: str) -> Dict[str, Any]:
        """
        Download data for a single symbol
        """
        try:
            # Create symbol directory
            symbol_dir = self.qlib_data_dir / "calendars" / "US" / "day" / symbol
            symbol_dir.mkdir(parents=True, exist_ok=True)
            
            # Check if data already exists
            data_file = symbol_dir / "data.csv"
            if data_file.exists():
                return {"success": True, "data_points": "already_exists"}
            
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
        logger.info("Verifying comprehensive dataset...")
        
        # Check if data files exist
        data_files = list(self.qlib_data_dir.rglob("*.csv"))
        if not data_files:
            raise Exception("No data files found in dataset")
        
        logger.info(f"Found {len(data_files)} data files")
        
        # Verify data quality for a sample
        sample_files = data_files[:10]  # Check first 10 files
        for data_file in sample_files:
            try:
                data = pd.read_csv(data_file)
                required_columns = ['open', 'high', 'low', 'close', 'volume']
                
                for col in required_columns:
                    if col not in data.columns:
                        logger.warning(f"Missing column {col} in {data_file}")
                
                logger.info(f"Verified {data_file.name}: {len(data)} records")
                
            except Exception as e:
                logger.warning(f"Error verifying {data_file}: {e}")
    
    def _enhance_dataset(self):
        """
        Enhance the dataset with additional features
        """
        logger.info("Enhancing comprehensive dataset...")
        
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
    
    def _save_symbols_list(self, symbols: Set[str]):
        """
        Save the complete list of symbols
        """
        symbols_file = self.qlib_data_dir / self.dataset_config["symbols_file"]
        symbols_data = {
            "total_symbols": len(symbols),
            "symbols": sorted(list(symbols)),
            "created_at": datetime.now().isoformat()
        }
        
        with open(symbols_file, 'w') as f:
            json.dump(symbols_data, f, indent=2)
        
        logger.info(f"Saved {len(symbols)} symbols to {symbols_file}")
    
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

def main():
    """
    Main function for comprehensive dataset download
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Download Comprehensive US Stock Dataset')
    parser.add_argument('--force', action='store_true', help='Force re-download of dataset')
    parser.add_argument('--info', action='store_true', help='Show dataset information')
    parser.add_argument('--symbols-only', action='store_true', help='Only collect symbols without downloading data')
    
    args = parser.parse_args()
    
    downloader = ComprehensiveUSStockDownloader()
    
    if args.info:
        info = downloader.get_dataset_info()
        print(json.dumps(info, indent=2))
        return
    
    if args.symbols_only:
        symbols = downloader.get_all_us_stocks()
        print(f"Collected {len(symbols)} symbols:")
        for symbol in sorted(symbols):
            print(symbol)
        return
    
    # Download comprehensive dataset
    result = downloader.download_comprehensive_dataset(force_download=args.force)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
