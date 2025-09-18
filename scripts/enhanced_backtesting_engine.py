#!/usr/bin/env python3
"""
Enhanced Backtesting Engine - Main Integration
Professional-grade backtesting with all advanced features
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

# Import enhanced backtesting components
try:
    from enhanced_backtesting import EnhancedDataManager, AdvancedStrategy, MomentumStrategy, MeanReversionStrategy
    from enhanced_backtesting_part2 import RiskManager, PerformanceAnalytics, WalkForwardAnalyzer, MonteCarloSimulator, EnhancedReporting
except ImportError:
    print("Warning: Enhanced backtesting components not found. Using basic functionality.")

# Import data managers
try:
    from polygon_data_provider import PolygonDataManager
    from qlib_data_reader import QLibDataManager
except ImportError:
    print("Warning: Data managers not found. Using basic data manager.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EnhancedBacktester:
    """Enhanced backtesting engine with professional features"""
    
    def __init__(self):
        # Use Polygon.io data manager as primary, QLib as fallback, enhanced data manager as last resort
        try:
            self.data_manager = PolygonDataManager()
            logger.info("Using Polygon.io Data Manager for backtesting (5+ years of historical data)")
        except Exception as e:
            logger.warning(f"Failed to initialize Polygon.io Data Manager: {e}")
            try:
                self.data_manager = QLibDataManager()
                logger.info("Using QLib Data Manager as fallback")
            except Exception as e2:
                logger.warning(f"Failed to initialize QLib Data Manager: {e2}")
                self.data_manager = EnhancedDataManager()
                logger.info("Using Enhanced Data Manager as last resort")
        
        self.risk_manager = RiskManager()
        self.performance_analytics = PerformanceAnalytics()
        self.walk_forward_analyzer = WalkForwardAnalyzer()
        self.monte_carlo_simulator = MonteCarloSimulator()
        self.reporting = EnhancedReporting()
        self.config = get_qlib_config()
        
        # Strategy registry
        self.strategies = {
            'momentum': MomentumStrategy,
            'mean_reversion': MeanReversionStrategy
        }
        
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
        
    async def run_enhanced_backtest(self, 
                                  strategy_name: str,
                                  symbols: List[str],
                                  start_date: str,
                                  end_date: str,
                                  parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run enhanced backtest with professional features"""
        try:
            logger.info(f"Starting enhanced backtest for {strategy_name}")
            
            # Merge parameters with defaults
            params = {**self.default_params, **(parameters or {})}
            
            # Get clean data
            data = await self.data_manager.get_clean_data(symbols, start_date, end_date)
            if not data:
                return {'error': 'No data available for backtesting'}
            
            # Debug: Check data structure
            logger.info(f"Data retrieved for {len(data)} symbols")
            for symbol, df in data.items():
                logger.info(f"{symbol}: {len(df)} rows, columns: {list(df.columns)}")
                if 'Price' not in df.columns:
                    logger.error(f"Missing Price column for {symbol}")
                if 'RSI' not in df.columns:
                    logger.error(f"Missing RSI column for {symbol}")
            
            # Initialize strategy
            strategy_class = self.strategies.get(strategy_name)
            if not strategy_class:
                return {'error': f'Strategy {strategy_name} not found'}
            
            strategy = strategy_class(params)
            
            # Run backtest for each symbol
            results = {}
            portfolio_returns = pd.Series(0.0, index=next(iter(data.values())).index)
            
            for symbol, symbol_data in data.items():
                logger.info(f"Running backtest for {symbol}")
                
                # Calculate signals
                signals = strategy.calculate_signals(symbol_data)
                
                # Execute trades
                trades = self._execute_trades(signals, symbol, params)
                
                # Calculate performance
                performance = self._calculate_performance(trades, symbol_data)
                
                # Add to portfolio returns
                symbol_returns = self._calculate_symbol_returns(trades, symbol_data)
                portfolio_returns += symbol_returns * params['position_size']
                
                results[symbol] = {
                    'trades': trades,
                    'performance': performance,
                    'signals': signals,
                    'returns': symbol_returns
                }
            
            # Calculate portfolio-level metrics
            portfolio_performance = self.performance_analytics.calculate_advanced_metrics(portfolio_returns)
            
            # Aggregate results
            aggregated_results = self._aggregate_results(results, portfolio_performance)
            
            # Run advanced analysis
            advanced_analysis = await self._run_advanced_analysis(strategy, data, params)
            
            # Generate comprehensive report
            report = self._generate_comprehensive_report(aggregated_results, strategy_name, advanced_analysis)
            
            return {
                'success': True,
                'strategy': strategy_name,
                'symbols': symbols,
                'period': f"{start_date} to {end_date}",
                'parameters': params,
                'results': aggregated_results,
                'advanced_analysis': advanced_analysis,
                'report': report
            }
            
        except Exception as e:
            logger.error(f"Error in enhanced backtest: {e}")
            return {'error': str(e)}
    
    def _execute_trades(self, signals: pd.DataFrame, symbol: str, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute trades based on signals with realistic constraints"""
        try:
            trades = []
            position = 0
            entry_price = 0
            entry_date = None
            cash = parameters['initial_capital']
            
            for date, row in signals.iterrows():
                if pd.isna(row['Signal']):
                    continue
                
                signal = row['Signal']
                price = row['Price']
                
                # Apply slippage
                if signal > 0:  # Buy
                    execution_price = price * (1 + parameters['slippage'])
                elif signal < 0:  # Sell
                    execution_price = price * (1 - parameters['slippage'])
                else:
                    execution_price = price
                
                # Close existing position if signal changes
                if position != 0 and signal != position:
                    # Close position
                    exit_price = execution_price
                    shares = abs(position)
                    gross_pnl = (exit_price - entry_price) * shares
                    
                    # Apply commission
                    commission = exit_price * shares * parameters['commission']
                    net_pnl = gross_pnl - commission
                    
                    # Update cash
                    cash += exit_price * shares - commission
                    
                    trades.append({
                        'symbol': symbol,
                        'entry_date': entry_date,
                        'exit_date': date,
                        'entry_price': entry_price,
                        'exit_price': exit_price,
                        'position': position,
                        'shares': shares,
                        'gross_pnl': gross_pnl,
                        'commission': commission,
                        'net_pnl': net_pnl,
                        'return': net_pnl / (entry_price * shares),
                        'cash_after': cash
                    })
                    
                    position = 0
                
                # Open new position
                if signal != 0 and position == 0:
                    # Calculate position size
                    position_value = cash * parameters['position_size']
                    shares = int(position_value / execution_price)
                    
                    if shares > 0:
                        position = signal * shares
                        entry_price = execution_price
                        entry_date = date
                        
                        # Apply commission
                        commission = execution_price * shares * parameters['commission']
                        cash -= (execution_price * shares + commission)
            
            # Close final position if still open
            if position != 0:
                exit_price = signals.iloc[-1]['Price'] * (1 - parameters['slippage'])
                shares = abs(position)
                gross_pnl = (exit_price - entry_price) * shares
                
                # Apply commission
                commission = exit_price * shares * parameters['commission']
                net_pnl = gross_pnl - commission
                
                trades.append({
                    'symbol': symbol,
                    'entry_date': entry_date,
                    'exit_date': signals.index[-1],
                    'entry_price': entry_price,
                    'exit_price': exit_price,
                    'position': position,
                    'shares': shares,
                    'gross_pnl': gross_pnl,
                    'commission': commission,
                    'net_pnl': net_pnl,
                    'return': net_pnl / (entry_price * shares),
                    'cash_after': cash + exit_price * shares - commission
                })
            
            return trades
            
        except Exception as e:
            logger.error(f"Error executing trades: {e}")
            return []
    
    def _calculate_performance(self, trades: List[Dict[str, Any]], data: pd.DataFrame) -> Dict[str, Any]:
        """Calculate performance metrics for trades"""
        try:
            if not trades:
                return {}
            
            # Convert trades to returns series
            returns = pd.Series(0.0, index=data.index)
            
            for trade in trades:
                exit_date = trade['exit_date']
                trade_return = trade['return']
                
                # Assign return to the exit date
                if exit_date in returns.index:
                    returns.loc[exit_date] = trade_return
            
            # Calculate performance metrics
            performance = self.performance_analytics.calculate_advanced_metrics(returns)
            
            # Add trade-specific metrics
            performance['total_trades'] = len(trades)
            performance['winning_trades'] = len([t for t in trades if t['net_pnl'] > 0])
            performance['losing_trades'] = len([t for t in trades if t['net_pnl'] < 0])
            
            if trades:
                performance['avg_trade_return'] = np.mean([t['return'] for t in trades])
                performance['avg_win'] = np.mean([t['return'] for t in trades if t['net_pnl'] > 0])
                performance['avg_loss'] = np.mean([t['return'] for t in trades if t['net_pnl'] < 0])
                performance['total_commission'] = sum([t['commission'] for t in trades])
                performance['total_slippage'] = sum([t['gross_pnl'] - t['net_pnl'] - t['commission'] for t in trades])
            
            return performance
            
        except Exception as e:
            logger.error(f"Error calculating performance: {e}")
            return {}
    
    def _calculate_symbol_returns(self, trades: List[Dict[str, Any]], data: pd.DataFrame) -> pd.Series:
        """Calculate returns series for a symbol"""
        try:
            returns = pd.Series(0.0, index=data.index)
            
            for trade in trades:
                exit_date = trade['exit_date']
                trade_return = trade['return']
                
                if exit_date in returns.index:
                    returns.loc[exit_date] = trade_return
            
            return returns
            
        except Exception as e:
            logger.error(f"Error calculating symbol returns: {e}")
            return pd.Series(0.0, index=data.index)
    
    def _aggregate_results(self, results: Dict[str, Any], portfolio_performance: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregate results across all symbols"""
        try:
            aggregated = {
                'total_trades': 0,
                'total_pnl': 0,
                'total_commission': 0,
                'symbols': len(results),
                'performance': portfolio_performance
            }
            
            for symbol, result in results.items():
                aggregated['total_trades'] += result['performance'].get('total_trades', 0)
                aggregated['total_pnl'] += sum([t['net_pnl'] for t in result['trades']])
                aggregated['total_commission'] += result['performance'].get('total_commission', 0)
            
            return aggregated
            
        except Exception as e:
            logger.error(f"Error aggregating results: {e}")
            return {}
    
    async def _run_advanced_analysis(self, strategy, data: Dict[str, pd.DataFrame], params: Dict[str, Any]) -> Dict[str, Any]:
        """Run advanced analysis including walk-forward and Monte Carlo"""
        try:
            advanced_analysis = {}
            
            # Combine all symbol data for portfolio analysis
            if data:
                # Use the first symbol's data for walk-forward analysis
                first_symbol = next(iter(data.keys()))
                symbol_data = data[first_symbol]
                
                # Walk-forward analysis
                logger.info("Running walk-forward analysis...")
                walk_forward_results = await self.walk_forward_analyzer.run_walk_forward(strategy, symbol_data)
                advanced_analysis['walk_forward'] = walk_forward_results
                
                # Monte Carlo simulation
                logger.info("Running Monte Carlo simulation...")
                returns = symbol_data['Returns'].dropna()
                if len(returns) > 0:
                    mc_results = self.monte_carlo_simulator.run_monte_carlo(returns, params['initial_capital'])
                    advanced_analysis['monte_carlo'] = mc_results
                
                # Risk analysis
                logger.info("Running risk analysis...")
                risk_analysis = self._analyze_risk(data, params)
                advanced_analysis['risk_analysis'] = risk_analysis
            
            return advanced_analysis
            
        except Exception as e:
            logger.error(f"Error in advanced analysis: {e}")
            return {}
    
    def _analyze_risk(self, data: Dict[str, pd.DataFrame], params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze risk characteristics"""
        try:
            risk_analysis = {
                'portfolio_risk': {},
                'correlation_analysis': {},
                'sector_analysis': {},
                'stress_test': {}
            }
            
            # Calculate portfolio risk metrics
            if len(data) > 1:
                # Create portfolio returns
                portfolio_returns = pd.Series(0.0, index=next(iter(data.values())).index)
                
                for symbol, symbol_data in data.items():
                    symbol_returns = symbol_data['Returns'].fillna(0)
                    portfolio_returns += symbol_returns * params['position_size']
                
                # Portfolio risk metrics
                risk_metrics = self.risk_manager.calculate_portfolio_risk(
                    {symbol: params['position_size'] for symbol in data.keys()},
                    pd.DataFrame({symbol: data[symbol]['Price'] for symbol in data.keys()})
                )
                
                risk_analysis['portfolio_risk'] = risk_metrics
            
            return risk_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing risk: {e}")
            return {}
    
    def _generate_comprehensive_report(self, results: Dict[str, Any], strategy_name: str, advanced_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive backtesting report"""
        try:
            # Prepare results for reporting
            report_data = {
                'strategy': strategy_name,
                'total_trades': results.get('total_trades', 0),
                'total_pnl': results.get('total_pnl', 0),
                'performance': results.get('performance', {}),
                'advanced_analysis': advanced_analysis
            }
            
            # Generate report
            report = self.reporting.generate_comprehensive_report(report_data)
            
            # Add custom sections
            report['advanced_features'] = {
                'walk_forward_analysis': advanced_analysis.get('walk_forward', {}),
                'monte_carlo_simulation': advanced_analysis.get('monte_carlo', {}),
                'risk_analysis': advanced_analysis.get('risk_analysis', {})
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating comprehensive report: {e}")
            return {}
    
    async def compare_strategies(self, symbols: List[str], start_date: str, end_date: str, strategies: List[str] = None) -> Dict[str, Any]:
        """Compare multiple strategies"""
        try:
            if strategies is None:
                strategies = list(self.strategies.keys())
            
            comparison_results = {}
            
            for strategy_name in strategies:
                logger.info(f"Running comparison for {strategy_name}")
                
                result = await self.run_enhanced_backtest(
                    strategy_name,
                    symbols,
                    start_date,
                    end_date
                )
                
                if result.get('success'):
                    comparison_results[strategy_name] = {
                        'performance': result['results']['performance'],
                        'total_trades': result['results']['total_trades'],
                        'total_pnl': result['results']['total_pnl']
                    }
            
            # Generate comparison report
            comparison_report = self._generate_comparison_report(comparison_results)
            
            return {
                'success': True,
                'strategies': strategies,
                'results': comparison_results,
                'comparison_report': comparison_report
            }
            
        except Exception as e:
            logger.error(f"Error comparing strategies: {e}")
            return {'error': str(e)}
    
    def _generate_comparison_report(self, comparison_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate strategy comparison report"""
        try:
            comparison_report = {
                'summary': {},
                'performance_comparison': {},
                'risk_comparison': {},
                'recommendations': []
            }
            
            # Performance comparison
            performance_metrics = ['total_return', 'annualized_return', 'sharpe_ratio', 'max_drawdown', 'win_rate']
            
            for metric in performance_metrics:
                comparison_report['performance_comparison'][metric] = {}
                for strategy, result in comparison_results.items():
                    comparison_report['performance_comparison'][metric][strategy] = result['performance'].get(metric, 0)
            
            # Find best performing strategy
            best_strategy = max(comparison_results.keys(), 
                              key=lambda x: comparison_results[x]['performance'].get('sharpe_ratio', 0))
            
            comparison_report['summary']['best_strategy'] = best_strategy
            comparison_report['summary']['best_sharpe'] = comparison_results[best_strategy]['performance'].get('sharpe_ratio', 0)
            
            # Generate recommendations
            recommendations = []
            for strategy, result in comparison_results.items():
                sharpe = result['performance'].get('sharpe_ratio', 0)
                max_dd = abs(result['performance'].get('max_drawdown', 0))
                
                if sharpe > 1.0 and max_dd < 0.15:
                    recommendations.append(f"{strategy}: Strong performance with good risk management")
                elif sharpe > 0.5:
                    recommendations.append(f"{strategy}: Moderate performance, consider optimization")
                else:
                    recommendations.append(f"{strategy}: Poor performance, needs improvement")
            
            comparison_report['recommendations'] = recommendations
            
            return comparison_report
            
        except Exception as e:
            logger.error(f"Error generating comparison report: {e}")
            return {}

# Main execution function
async def main():
    """Main function for testing enhanced backtesting engine"""
    try:
        backtester = EnhancedBacktester()
        
        # Test parameters
        symbols = ['AAPL', 'MSFT', 'GOOGL']
        start_date = '2023-01-01'
        end_date = '2023-12-31'
        
        print("Running Enhanced Backtesting Engine...")
        
        # Test single strategy
        print("\n1. Testing Momentum Strategy...")
        momentum_result = await backtester.run_enhanced_backtest(
            'momentum',
            symbols,
            start_date,
            end_date,
            {
                'initial_capital': 100000,
                'position_size': 0.1,
                'commission': 0.001
            }
        )
        
        if momentum_result.get('success'):
            print("✅ Momentum Strategy Backtest Completed")
            performance = momentum_result['results']['performance']
            print(f"   Total Return: {performance.get('total_return', 0):.2%}")
            print(f"   Sharpe Ratio: {performance.get('sharpe_ratio', 0):.2f}")
            print(f"   Max Drawdown: {performance.get('max_drawdown', 0):.2%}")
            print(f"   Total Trades: {momentum_result['results']['total_trades']}")
        else:
            print(f"❌ Momentum Strategy Failed: {momentum_result.get('error')}")
        
        # Test strategy comparison
        print("\n2. Testing Strategy Comparison...")
        comparison_result = await backtester.compare_strategies(
            symbols,
            start_date,
            end_date,
            ['momentum', 'mean_reversion']
        )
        
        if comparison_result.get('success'):
            print("✅ Strategy Comparison Completed")
            best_strategy = comparison_result['comparison_report']['summary']['best_strategy']
            print(f"   Best Strategy: {best_strategy}")
            
            for strategy, result in comparison_result['results'].items():
                performance = result['performance']
                print(f"   {strategy}: Return={performance.get('total_return', 0):.2%}, "
                      f"Sharpe={performance.get('sharpe_ratio', 0):.2f}")
        else:
            print(f"❌ Strategy Comparison Failed: {comparison_result.get('error')}")
        
        print("\n🎉 Enhanced Backtesting Engine Test Completed!")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")

if __name__ == "__main__":
    asyncio.run(main())
