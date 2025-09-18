#!/usr/bin/env python3
"""
Polygon.io Backtesting Engine
Comprehensive backtesting system using Polygon.io historical data
Replaces Qlib with 5+ years of high-quality historical data
"""

import os
import sys
import logging
import asyncio
import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import aiohttp
from dotenv import load_dotenv
from backtest_validator import BacktestValidator

# Load environment variables
load_dotenv('.env.local')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PolygonBacktestingEngine:
    """Comprehensive Polygon.io Backtesting Engine with 5+ years of historical data"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('POLYGON_API_KEY')
        if not self.api_key:
            raise ValueError("POLYGON_API_KEY not found in environment variables")
        
        self.base_url = "https://api.polygon.io"
        self.session = None
        
        # Rate limiting (5 requests per minute for Starter Plan)
        self.rate_limit = 5
        self.rate_window = 60  # seconds
        self.request_times = []
        
        # Backtesting parameters
        self.default_params = {
            'initial_capital': 100000,
            'commission': 0.001,  # 0.1%
            'slippage': 0.0005,   # 0.05%
            'position_size': 0.1,  # 10% of capital per position
            'max_positions': 10,
            'stop_loss': 0.05,    # 5%
            'take_profit': 0.15,  # 15%
            'rebalance_frequency': 'daily'
        }
        
        # Strategy templates
        self.strategy_templates = {
            'momentum': {
                'name': 'Momentum Strategy',
                'description': 'Buy stocks with positive momentum',
                'parameters': {
                    'lookback_period': 20,
                    'momentum_threshold': 0.02,
                    'holding_period': 5
                }
            },
            'mean_reversion': {
                'name': 'Mean Reversion Strategy',
                'description': 'Buy oversold, sell overbought stocks',
                'parameters': {
                    'rsi_period': 14,
                    'oversold_threshold': 30,
                    'overbought_threshold': 70,
                    'holding_period': 10
                }
            }
        }
        
        # Create results directory
        self.results_dir = Path("polygon_backtest_results")
        self.results_dir.mkdir(exist_ok=True)
        
        # Initialize validation system
        self.validator = BacktestValidator()
        
        logger.info(f"Polygon.io Backtesting Engine initialized with API key: {self.api_key[:8]}...")
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _rate_limit_check(self):
        """Check and enforce rate limits"""
        current_time = time.time()
        
        # Remove old requests outside the window
        self.request_times = [t for t in self.request_times if current_time - t < self.rate_window]
        
        # Check if we're at the limit
        if len(self.request_times) >= self.rate_limit:
            # Wait until we can make another request
            wait_time = self.rate_window - (current_time - self.request_times[0])
            if wait_time > 0:
                logger.info(f"Rate limit reached, waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)
        
        # Record this request
        self.request_times.append(time.time())
    
    async def get_historical_data(self, symbol: str, start_date: str, end_date: str) -> Optional[pd.DataFrame]:
        """Get historical daily data from Polygon.io"""
        try:
            await self._rate_limit_check()
            
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
                    'o': 'Open',
                    'h': 'High',
                    'l': 'Low',
                    'c': 'Close',
                    'v': 'Volume',
                    'vw': 'vwap',
                    'n': 'transactions'
                }
                
                df = df.rename(columns=column_mapping)
                
                # Convert timestamp to datetime
                df['date'] = pd.to_datetime(df['timestamp'], unit='ms')
                df.set_index('date', inplace=True)
                
                # Ensure all required columns exist
                required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
                for col in required_columns:
                    if col not in df.columns:
                        logger.error(f"Missing required column {col} for {symbol}")
                        return None
                
                # Add adjusted close
                df['Adj Close'] = df['Close']
                
                logger.info(f"Successfully fetched {len(df)} rows for {symbol}")
                return df
                
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {e}")
            return None
    
    async def get_multiple_stocks_data(self, symbols: List[str], start_date: str, end_date: str) -> Dict[str, pd.DataFrame]:
        """Get historical data for multiple symbols with rate limiting"""
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
    
    def _calculate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical features for backtesting"""
        try:
            # Basic price features
            df['returns'] = df['Close'].pct_change()
            df['log_returns'] = np.log(df['Close'] / df['Close'].shift(1))
            
            # Moving averages
            df['sma_20'] = df['Close'].rolling(window=20).mean()
            df['sma_50'] = df['Close'].rolling(window=50).mean()
            df['ema_12'] = df['Close'].ewm(span=12).mean()
            df['ema_26'] = df['Close'].ewm(span=26).mean()
            
            # Momentum indicators
            df['rsi'] = self._calculate_rsi(df['Close'])
            df['macd'] = df['ema_12'] - df['ema_26']
            df['macd_signal'] = df['macd'].ewm(span=9).mean()
            df['macd_histogram'] = df['macd'] - df['macd_signal']
            
            # Volatility
            df['volatility'] = df['returns'].rolling(window=20).std()
            df['atr'] = self._calculate_atr(df)
            
            # Volume indicators
            df['volume_sma'] = df['Volume'].rolling(window=20).mean()
            df['volume_ratio'] = df['Volume'] / df['volume_sma']
            
            # Bollinger Bands
            df['bb_upper'] = df['sma_20'] + (df['Close'].rolling(window=20).std() * 2)
            df['bb_lower'] = df['sma_20'] - (df['Close'].rolling(window=20).std() * 2)
            df['bb_position'] = (df['Close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
            
            return df
            
        except Exception as e:
            logger.error(f"Error calculating features: {e}")
            return df
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI indicator"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range"""
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        
        true_range = np.maximum(high_low, np.maximum(high_close, low_close))
        atr = true_range.rolling(window=period).mean()
        return atr
    
    async def run_backtest(self, 
                          strategy_name: str,
                          symbols: List[str],
                          start_date: str,
                          end_date: str,
                          parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run comprehensive backtest for a strategy using Polygon.io data"""
        
        logger.info(f"Starting Polygon.io backtest for {strategy_name} on {len(symbols)} symbols")
        
        # Merge parameters
        params = self.default_params.copy()
        if parameters:
            params.update(parameters)
        
        # Get strategy configuration
        strategy_config = self.strategy_templates.get(strategy_name, {})
        
        # Prepare data from Polygon.io
        data = await self.get_multiple_stocks_data(symbols, start_date, end_date)
        if not data:
            return {'success': False, 'error': 'Failed to fetch data from Polygon.io'}
        
        # Calculate features for each symbol
        for symbol in data:
            data[symbol] = self._calculate_features(data[symbol])
        
        # Run strategy
        if strategy_name == 'momentum':
            results = await self._run_momentum_strategy(data, params, strategy_config)
        elif strategy_name == 'mean_reversion':
            results = await self._run_mean_reversion_strategy(data, params, strategy_config)
        else:
            return {'success': False, 'error': f'Unknown strategy: {strategy_name}'}
        
        # Calculate performance metrics
        performance = self._calculate_performance_metrics(results)
        
        # Generate reports
        reports = await self._generate_backtest_reports(results, performance, strategy_name)
        
        # Run comprehensive validation
        logger.info("Running comprehensive backtest validation...")
        validation_results = await self.validator.run_comprehensive_validation(results, data, strategy_name)
        
        # Save results
        experiment_id = f"polygon_{strategy_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        await self._save_backtest_results(experiment_id, results, performance, reports, validation_results)
        
        return {
            'success': True,
            'experiment_id': experiment_id,
            'strategy_name': strategy_name,
            'symbols': symbols,
            'start_date': start_date,
            'end_date': end_date,
            'parameters': params,
            'performance': performance,
            'reports': reports,
            'validation': validation_results,
            'data_source': 'Polygon.io (5+ years historical data)'
        }
    
    async def _run_momentum_strategy(self, data: Dict[str, pd.DataFrame], params: Dict, config: Dict) -> Dict[str, Any]:
        """Run momentum strategy backtest"""
        logger.info("Running momentum strategy backtest with Polygon.io data")
        
        results = {
            'trades': [],
            'positions': {},
            'portfolio_value': [],
            'cash': params['initial_capital'],
            'total_value': params['initial_capital'],
            'dates': []
        }
        
        # Get all dates
        all_dates = set()
        for df in data.values():
            all_dates.update(df.index)
        all_dates = sorted(list(all_dates))
        
        # Strategy parameters
        lookback = config.get('parameters', {}).get('lookback_period', 20)
        threshold = config.get('parameters', {}).get('momentum_threshold', 0.02)
        holding_period = config.get('parameters', {}).get('holding_period', 5)
        
        for date in all_dates:
            # Update portfolio value
            portfolio_value = results['cash']
            for symbol, position in results['positions'].items():
                if symbol in data and date in data[symbol].index:
                    current_price = data[symbol].loc[date, 'Close']
                    portfolio_value += position['quantity'] * current_price
            
            results['total_value'] = portfolio_value
            results['portfolio_value'].append(portfolio_value)
            results['dates'].append(date)
            
            # Check for exit signals
            for symbol in list(results['positions'].keys()):
                position = results['positions'][symbol]
                if symbol in data and date in data[symbol].index:
                    current_price = data[symbol].loc[date, 'Close']
                    
                    # Check holding period
                    days_held = (date - position['entry_date']).days
                    if days_held >= holding_period:
                        # Exit position
                        exit_value = position['quantity'] * current_price * (1 - params['commission'])
                        results['cash'] += exit_value
                        
                        # Record trade
                        trade = {
                            'symbol': symbol,
                            'entry_date': position['entry_date'],
                            'exit_date': date,
                            'entry_price': position['entry_price'],
                            'exit_price': current_price,
                            'quantity': position['quantity'],
                            'pnl': exit_value - position['cost'],
                            'pnl_pct': (exit_value - position['cost']) / position['cost']
                        }
                        results['trades'].append(trade)
                        
                        del results['positions'][symbol]
            
            # Check for entry signals
            if len(results['positions']) < params['max_positions']:
                candidates = []
                
                for symbol, df in data.items():
                    if symbol not in results['positions'] and date in df.index:
                        # Calculate momentum
                        if len(df) >= lookback:
                            lookback_date = df.index[df.index.get_loc(date) - lookback]
                            if lookback_date in df.index:
                                momentum = (df.loc[date, 'Close'] - df.loc[lookback_date, 'Close']) / df.loc[lookback_date, 'Close']
                                
                                if momentum > threshold:
                                    candidates.append({
                                        'symbol': symbol,
                                        'momentum': momentum,
                                        'price': df.loc[date, 'Close']
                                    })
                
                # Sort by momentum and take top candidates
                candidates.sort(key=lambda x: x['momentum'], reverse=True)
                
                for candidate in candidates[:params['max_positions'] - len(results['positions'])]:
                    symbol = candidate['symbol']
                    price = candidate['price']
                    
                    # Calculate position size
                    position_value = results['cash'] * params['position_size']
                    quantity = position_value / price
                    
                    if quantity > 0:
                        cost = quantity * price * (1 + params['commission'])
                        
                        if cost <= results['cash']:
                            results['positions'][symbol] = {
                                'quantity': quantity,
                                'entry_price': price,
                                'entry_date': date,
                                'cost': cost
                            }
                            results['cash'] -= cost
        
        return results
    
    async def _run_mean_reversion_strategy(self, data: Dict[str, pd.DataFrame], params: Dict, config: Dict) -> Dict[str, Any]:
        """Run mean reversion strategy backtest"""
        logger.info("Running mean reversion strategy backtest with Polygon.io data")
        
        results = {
            'trades': [],
            'positions': {},
            'portfolio_value': [],
            'cash': params['initial_capital'],
            'total_value': params['initial_capital'],
            'dates': []
        }
        
        # Strategy parameters
        rsi_period = config.get('parameters', {}).get('rsi_period', 14)
        oversold = config.get('parameters', {}).get('oversold_threshold', 30)
        overbought = config.get('parameters', {}).get('overbought_threshold', 70)
        holding_period = config.get('parameters', {}).get('holding_period', 10)
        
        # Get all dates
        all_dates = set()
        for df in data.values():
            all_dates.update(df.index)
        all_dates = sorted(list(all_dates))
        
        for date in all_dates:
            # Update portfolio value
            portfolio_value = results['cash']
            for symbol, position in results['positions'].items():
                if symbol in data and date in data[symbol].index:
                    current_price = data[symbol].loc[date, 'Close']
                    portfolio_value += position['quantity'] * current_price
            
            results['total_value'] = portfolio_value
            results['portfolio_value'].append(portfolio_value)
            results['dates'].append(date)
            
            # Check for exit signals
            for symbol in list(results['positions'].keys()):
                position = results['positions'][symbol]
                if symbol in data and date in data[symbol].index:
                    current_price = data[symbol].loc[date, 'Close']
                    rsi = data[symbol].loc[date, 'rsi']
                    
                    # Check exit conditions
                    days_held = (date - position['entry_date']).days
                    if days_held >= holding_period or rsi > overbought:
                        # Exit position
                        exit_value = position['quantity'] * current_price * (1 - params['commission'])
                        results['cash'] += exit_value
                        
                        # Record trade
                        trade = {
                            'symbol': symbol,
                            'entry_date': position['entry_date'],
                            'exit_date': date,
                            'entry_price': position['entry_price'],
                            'exit_price': current_price,
                            'quantity': position['quantity'],
                            'pnl': exit_value - position['cost'],
                            'pnl_pct': (exit_value - position['cost']) / position['cost']
                        }
                        results['trades'].append(trade)
                        
                        del results['positions'][symbol]
            
            # Check for entry signals
            if len(results['positions']) < params['max_positions']:
                for symbol, df in data.items():
                    if symbol not in results['positions'] and date in df.index:
                        rsi = df.loc[date, 'rsi']
                        
                        if rsi < oversold:
                            price = df.loc[date, 'Close']
                            
                            # Calculate position size
                            position_value = results['cash'] * params['position_size']
                            quantity = position_value / price
                            
                            if quantity > 0:
                                cost = quantity * price * (1 + params['commission'])
                                
                                if cost <= results['cash']:
                                    results['positions'][symbol] = {
                                        'quantity': quantity,
                                        'entry_price': price,
                                        'entry_date': date,
                                        'cost': cost
                                    }
                                    results['cash'] -= cost
        
        return results
    
    def _calculate_performance_metrics(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comprehensive performance metrics"""
        if not results['trades']:
            return {'error': 'No trades executed'}
        
        trades_df = pd.DataFrame(results['trades'])
        portfolio_values = pd.Series(results['portfolio_value'], index=results['dates'])
        
        # Basic metrics
        total_trades = len(trades_df)
        winning_trades = len(trades_df[trades_df['pnl'] > 0])
        losing_trades = len(trades_df[trades_df['pnl'] <= 0])
        
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        # P&L metrics
        total_pnl = trades_df['pnl'].sum()
        total_return = (results['total_value'] - results['portfolio_value'][0]) / results['portfolio_value'][0]
        
        avg_win = trades_df[trades_df['pnl'] > 0]['pnl'].mean() if winning_trades > 0 else 0
        avg_loss = trades_df[trades_df['pnl'] <= 0]['pnl'].mean() if losing_trades > 0 else 0
        
        profit_factor = abs(avg_win * winning_trades / (avg_loss * losing_trades)) if losing_trades > 0 and avg_loss != 0 else float('inf')
        
        # Risk metrics
        returns = portfolio_values.pct_change().dropna()
        volatility = returns.std() * np.sqrt(252)  # Annualized
        sharpe_ratio = (returns.mean() * 252) / volatility if volatility > 0 else 0
        
        # Maximum drawdown
        cumulative = (1 + returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min()
        
        # Trade analysis
        avg_trade_duration = (trades_df['exit_date'] - trades_df['entry_date']).dt.days.mean()
        
        return {
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'win_rate': win_rate,
            'total_pnl': total_pnl,
            'total_return': total_return,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'profit_factor': profit_factor,
            'volatility': volatility,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_drawdown,
            'avg_trade_duration': avg_trade_duration,
            'final_portfolio_value': results['total_value'],
            'initial_capital': results['portfolio_value'][0]
        }
    
    async def _generate_backtest_reports(self, results: Dict[str, Any], performance: Dict[str, Any], strategy_name: str) -> Dict[str, Any]:
        """Generate comprehensive backtest reports"""
        reports = {
            'summary': performance,
            'charts': {},
            'trades_analysis': {}
        }
        
        # Trades analysis
        if len(results['trades']) > 0:
            trades_df = pd.DataFrame(results['trades'])
            reports['trades_analysis'] = {
                'total_trades': len(trades_df),
                'avg_trade_pnl': trades_df['pnl'].mean(),
                'best_trade': trades_df['pnl'].max(),
                'worst_trade': trades_df['pnl'].min(),
                'avg_trade_duration': (trades_df['exit_date'] - trades_df['entry_date']).dt.days.mean(),
                'top_symbols': trades_df.groupby('symbol')['pnl'].sum().sort_values(ascending=False).head(5).to_dict()
            }
        
        return reports
    
    async def _save_backtest_results(self, experiment_id: str, results: Dict[str, Any], performance: Dict[str, Any], reports: Dict[str, Any], validation_results: Dict[str, Any]):
        """Save backtest results to disk"""
        experiment_dir = self.results_dir / experiment_id
        experiment_dir.mkdir(parents=True, exist_ok=True)
        
        # Save results
        with open(experiment_dir / 'results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        # Save performance metrics
        with open(experiment_dir / 'performance.json', 'w') as f:
            json.dump(performance, f, indent=2)
        
        # Save reports
        with open(experiment_dir / 'reports.json', 'w') as f:
            json.dump(reports, f, indent=2)
        
        # Save validation results
        with open(experiment_dir / 'validation.json', 'w') as f:
            json.dump(validation_results, f, indent=2, default=str)
        
        logger.info(f"Polygon.io backtest results saved to {experiment_dir}")
    
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

async def main():
    """Main function for testing"""
    print("Polygon.io Backtesting Engine Test")
    print("==================================")
    
    try:
        async with PolygonBacktestingEngine() as engine:
            # Test symbols
            symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']
            start_date = '2020-01-01'
            end_date = '2023-12-31'
            
            # Test data fetching
            print(f"\nTesting data fetching for {len(symbols)} symbols...")
            data = await engine.get_multiple_stocks_data(symbols, start_date, end_date)
            print(f"✅ Successfully fetched data for {len(data)} symbols")
            
            for symbol, df in data.items():
                print(f"   {symbol}: {len(df)} rows, {df.index[0]} to {df.index[-1]}")
            
            # Run momentum strategy
            print(f"\nRunning momentum strategy backtest...")
            momentum_result = await engine.run_backtest('momentum', symbols, start_date, end_date)
            
            if momentum_result['success']:
                print(f"✅ Momentum strategy completed")
                print(f"Total Return: {momentum_result['performance']['total_return']:.2%}")
                print(f"Sharpe Ratio: {momentum_result['performance']['sharpe_ratio']:.2f}")
                print(f"Max Drawdown: {momentum_result['performance']['max_drawdown']:.2%}")
                print(f"Data Source: {momentum_result['data_source']}")
            else:
                print(f"❌ Momentum strategy failed: {momentum_result['error']}")
            
            # Data summary
            print("\nPolygon.io Data Summary:")
            print("========================")
            summary = engine.get_data_summary()
            for key, value in summary.items():
                print(f"{key}: {value}")
                
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
