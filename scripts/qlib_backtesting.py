#!/usr/bin/env python3
"""
Qlib Backtesting Module for Trading Platform
Comprehensive backtesting capabilities with Qlib integration
"""

import os
import sys
import logging
import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from qlib_config import get_qlib_config, init_qlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class QlibBacktester:
    """Comprehensive Qlib Backtesting Engine"""
    
    def __init__(self):
        self.config = get_qlib_config()
        config_data = self.config.get_config()
        
        # Use custom Qlib directory structure
        self.model_dir = Path(config_data["provider_uri"]) / "models"
        self.experiment_dir = Path(config_data["provider_uri"]) / "results"
        self.log_dir = Path(config_data["provider_uri"]).parent.parent / "logs"
        
        # Create directories
        for directory in [self.model_dir, self.experiment_dir, self.log_dir]:
            directory.mkdir(parents=True, exist_ok=True)
        
        # Initialize Qlib
        qlib_instance = init_qlib()
        if not qlib_instance:
            logger.warning("Qlib initialization failed, using fallback mode")
        
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
            },
            'ml_ensemble': {
                'name': 'ML Ensemble Strategy',
                'description': 'Machine learning ensemble approach',
                'parameters': {
                    'feature_window': 60,
                    'prediction_horizon': 5,
                    'ensemble_size': 5,
                    'rebalance_frequency': 'weekly'
                }
            }
        }
    
    async def run_backtest(self, 
                          strategy_name: str,
                          symbols: List[str],
                          start_date: str,
                          end_date: str,
                          parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run comprehensive backtest for a strategy"""
        
        logger.info(f"Starting backtest for {strategy_name} on {len(symbols)} symbols")
        
        # Merge parameters
        params = self.default_params.copy()
        if parameters:
            params.update(parameters)
        
        # Get strategy configuration
        strategy_config = self.strategy_templates.get(strategy_name, {})
        
        # Prepare data
        data = await self._prepare_backtest_data(symbols, start_date, end_date)
        if not data:
            return {'success': False, 'error': 'Failed to prepare data'}
        
        # Run strategy
        if strategy_name == 'momentum':
            results = await self._run_momentum_strategy(data, params, strategy_config)
        elif strategy_name == 'mean_reversion':
            results = await self._run_mean_reversion_strategy(data, params, strategy_config)
        elif strategy_name == 'ml_ensemble':
            results = await self._run_ml_ensemble_strategy(data, params, strategy_config)
        else:
            return {'success': False, 'error': f'Unknown strategy: {strategy_name}'}
        
        # Calculate performance metrics
        performance = self._calculate_performance_metrics(results)
        
        # Generate reports
        reports = await self._generate_backtest_reports(results, performance, strategy_name)
        
        # Save results
        experiment_id = f"{strategy_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        await self._save_backtest_results(experiment_id, results, performance, reports)
        
        return {
            'success': True,
            'experiment_id': experiment_id,
            'strategy_name': strategy_name,
            'symbols': symbols,
            'start_date': start_date,
            'end_date': end_date,
            'parameters': params,
            'performance': performance,
            'reports': reports
        }
    
    async def _prepare_backtest_data(self, symbols: List[str], start_date: str, end_date: str) -> Dict[str, pd.DataFrame]:
        """Prepare data for backtesting"""
        data = {}
        
        for symbol in symbols:
            try:
                # Try to load from processed data first
                processed_file = Path(self.config.get_config("data")["processed_dir"]).expanduser() / symbol / f"{symbol}_processed.csv"
                
                if processed_file.exists():
                    df = pd.read_csv(processed_file, index_col=0, parse_dates=True)
                else:
                    # Fallback to yfinance
                    import yfinance as yf
                    ticker = yf.Ticker(symbol)
                    df = ticker.history(start=start_date, end=end_date)
                    
                    if df.empty:
                        logger.warning(f"No data available for {symbol}")
                        continue
                    
                    # Calculate additional features
                    df = self._calculate_features(df)
                
                # Filter date range
                df = df[(df.index >= start_date) & (df.index <= end_date)]
                
                if not df.empty:
                    data[symbol] = df
                    logger.info(f"✅ Loaded data for {symbol}: {len(df)} rows")
                
            except Exception as e:
                logger.error(f"❌ Failed to load data for {symbol}: {e}")
                continue
        
        return data
    
    def _calculate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical features for backtesting"""
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
    
    async def _run_momentum_strategy(self, data: Dict[str, pd.DataFrame], params: Dict, config: Dict) -> Dict[str, Any]:
        """Run momentum strategy backtest"""
        logger.info("Running momentum strategy backtest")
        
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
        logger.info("Running mean reversion strategy backtest")
        
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
    
    async def _run_ml_ensemble_strategy(self, data: Dict[str, pd.DataFrame], params: Dict, config: Dict) -> Dict[str, Any]:
        """Run ML ensemble strategy backtest"""
        logger.info("Running ML ensemble strategy backtest")
        
        # This is a simplified ML strategy - in production, you'd use actual ML models
        # For now, we'll use a combination of technical indicators as a proxy
        
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
            
            # Simple ML-like signal based on multiple indicators
            if len(results['positions']) < params['max_positions']:
                for symbol, df in data.items():
                    if symbol not in results['positions'] and date in df.index:
                        # Calculate composite score
                        score = 0
                        
                        # RSI signal
                        rsi = df.loc[date, 'rsi']
                        if 30 < rsi < 70:
                            score += 1
                        
                        # MACD signal
                        macd = df.loc[date, 'macd']
                        macd_signal = df.loc[date, 'macd_signal']
                        if macd > macd_signal:
                            score += 1
                        
                        # Volume signal
                        volume_ratio = df.loc[date, 'volume_ratio']
                        if volume_ratio > 1.2:
                            score += 1
                        
                        # Price above SMA
                        close = df.loc[date, 'Close']
                        sma_20 = df.loc[date, 'sma_20']
                        if close > sma_20:
                            score += 1
                        
                        # Entry signal if score is high enough
                        if score >= 3:
                            price = close
                            
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
        
        # Generate charts
        if results['portfolio_value']:
            # Portfolio value chart
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=results['dates'],
                y=results['portfolio_value'],
                mode='lines',
                name='Portfolio Value',
                line=dict(color='blue')
            ))
            fig.update_layout(
                title=f'{strategy_name} - Portfolio Value Over Time',
                xaxis_title='Date',
                yaxis_title='Portfolio Value ($)',
                template='plotly_white'
            )
            reports['charts']['portfolio_value'] = fig.to_html()
            
            # Returns distribution
            if len(results['trades']) > 0:
                trades_df = pd.DataFrame(results['trades'])
                returns = trades_df['pnl_pct']
                
                fig = px.histogram(
                    returns, 
                    nbins=30,
                    title=f'{strategy_name} - Trade Returns Distribution',
                    labels={'value': 'Return (%)', 'count': 'Frequency'}
                )
                reports['charts']['returns_distribution'] = fig.to_html()
        
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
    
    async def _save_backtest_results(self, experiment_id: str, results: Dict[str, Any], performance: Dict[str, Any], reports: Dict[str, Any]):
        """Save backtest results to disk"""
        experiment_dir = self.experiment_dir / experiment_id
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
        
        # Save charts as HTML files
        charts_dir = experiment_dir / 'charts'
        charts_dir.mkdir(exist_ok=True)
        
        for chart_name, chart_html in reports.get('charts', {}).items():
            with open(charts_dir / f'{chart_name}.html', 'w') as f:
                f.write(chart_html)
        
        logger.info(f"Backtest results saved to {experiment_dir}")
    
    async def compare_strategies(self, symbols: List[str], start_date: str, end_date: str) -> Dict[str, Any]:
        """Compare multiple strategies"""
        logger.info("Running strategy comparison")
        
        comparison_results = {}
        
        for strategy_name in self.strategy_templates.keys():
            try:
                result = await self.run_backtest(strategy_name, symbols, start_date, end_date)
                if result['success']:
                    comparison_results[strategy_name] = result['performance']
                else:
                    comparison_results[strategy_name] = {'error': result['error']}
            except Exception as e:
                comparison_results[strategy_name] = {'error': str(e)}
        
        return comparison_results
    
    async def get_experiment_history(self) -> List[Dict[str, Any]]:
        """Get history of all experiments"""
        experiments = []
        
        for experiment_dir in self.experiment_dir.iterdir():
            if experiment_dir.is_dir():
                try:
                    # Load performance metrics
                    performance_file = experiment_dir / 'performance.json'
                    if performance_file.exists():
                        with open(performance_file, 'r') as f:
                            performance = json.load(f)
                        
                        experiments.append({
                            'experiment_id': experiment_dir.name,
                            'performance': performance,
                            'created_at': experiment_dir.stat().st_ctime
                        })
                except Exception as e:
                    logger.error(f"Failed to load experiment {experiment_dir.name}: {e}")
        
        # Sort by creation time
        experiments.sort(key=lambda x: x['created_at'], reverse=True)
        
        return experiments

async def main():
    """Main function for testing"""
    print("Qlib Backtesting Test")
    print("====================")
    
    backtester = QlibBacktester()
    
    # Test symbols
    symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']
    start_date = '2023-01-01'
    end_date = '2023-12-31'
    
    # Run momentum strategy
    print(f"\nRunning momentum strategy backtest...")
    momentum_result = await backtester.run_backtest('momentum', symbols, start_date, end_date)
    
    if momentum_result['success']:
        print(f"✅ Momentum strategy completed")
        print(f"Total Return: {momentum_result['performance']['total_return']:.2%}")
        print(f"Sharpe Ratio: {momentum_result['performance']['sharpe_ratio']:.2f}")
        print(f"Max Drawdown: {momentum_result['performance']['max_drawdown']:.2%}")
    else:
        print(f"❌ Momentum strategy failed: {momentum_result['error']}")
    
    # Run mean reversion strategy
    print(f"\nRunning mean reversion strategy backtest...")
    mean_rev_result = await backtester.run_backtest('mean_reversion', symbols, start_date, end_date)
    
    if mean_rev_result['success']:
        print(f"✅ Mean reversion strategy completed")
        print(f"Total Return: {mean_rev_result['performance']['total_return']:.2%}")
        print(f"Sharpe Ratio: {mean_rev_result['performance']['sharpe_ratio']:.2f}")
        print(f"Max Drawdown: {mean_rev_result['performance']['max_drawdown']:.2%}")
    else:
        print(f"❌ Mean reversion strategy failed: {mean_rev_result['error']}")
    
    # Compare strategies
    print(f"\nComparing strategies...")
    comparison = await backtester.compare_strategies(symbols, start_date, end_date)
    
    print("\nStrategy Comparison:")
    print("===================")
    for strategy, metrics in comparison.items():
        if 'error' not in metrics:
            print(f"{strategy}:")
            print(f"  Total Return: {metrics['total_return']:.2%}")
            print(f"  Sharpe Ratio: {metrics['sharpe_ratio']:.2f}")
            print(f"  Win Rate: {metrics['win_rate']:.2%}")
            print(f"  Max Drawdown: {metrics['max_drawdown']:.2%}")
        else:
            print(f"{strategy}: {metrics['error']}")
        print()

if __name__ == "__main__":
    asyncio.run(main())
