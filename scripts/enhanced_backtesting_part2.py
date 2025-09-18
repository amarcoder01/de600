#!/usr/bin/env python3
"""
Enhanced Backtesting System - Part 2: Performance Analytics & Risk Management
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

class RiskManager:
    """Comprehensive risk management for backtesting"""
    
    def __init__(self, max_drawdown: float = 0.20, max_position_size: float = 0.10):
        self.max_drawdown = max_drawdown
        self.max_position_size = max_position_size
        self.portfolio_risk = {}
        
    def calculate_portfolio_risk(self, positions: Dict[str, float], prices: pd.DataFrame) -> Dict[str, float]:
        """Calculate portfolio-level risk metrics"""
        try:
            if not positions or prices.empty:
                return {}
            
            # Calculate portfolio returns
            portfolio_returns = pd.Series(0.0, index=prices.index)
            
            for symbol, position in positions.items():
                if symbol in prices.columns:
                    symbol_returns = prices[symbol].pct_change()
                    portfolio_returns += position * symbol_returns
            
            # Risk metrics
            risk_metrics = {
                'volatility': portfolio_returns.std() * np.sqrt(252),  # Annualized
                'var_95': np.percentile(portfolio_returns, 5),
                'cvar_95': portfolio_returns[portfolio_returns <= np.percentile(portfolio_returns, 5)].mean(),
                'max_drawdown': self._calculate_max_drawdown(portfolio_returns),
                'skewness': portfolio_returns.skew(),
                'kurtosis': portfolio_returns.kurtosis()
            }
            
            return risk_metrics
            
        except Exception as e:
            logger.error(f"Error calculating portfolio risk: {e}")
            return {}
    
    def check_risk_limits(self, new_position: Dict[str, Any], portfolio: Dict[str, Any]) -> bool:
        """Check if new position violates risk limits"""
        try:
            # Position size limit
            if new_position.get('size', 0) > self.max_position_size:
                return False
            
            # Drawdown limit
            current_drawdown = portfolio.get('current_drawdown', 0)
            if current_drawdown > self.max_drawdown:
                return False
            
            # Sector concentration limit (if applicable)
            # Add sector concentration checks here
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking risk limits: {e}")
            return False
    
    def _calculate_max_drawdown(self, returns: pd.Series) -> float:
        """Calculate maximum drawdown"""
        try:
            cumulative = (1 + returns).cumprod()
            running_max = cumulative.expanding().max()
            drawdown = (cumulative - running_max) / running_max
            return drawdown.min()
        except Exception as e:
            logger.error(f"Error calculating max drawdown: {e}")
            return 0.0

class PerformanceAnalytics:
    """Advanced performance analysis and reporting"""
    
    def __init__(self):
        self.metrics = {}
        
    def calculate_advanced_metrics(self, returns: pd.Series, benchmark: pd.Series = None) -> Dict[str, float]:
        """Calculate comprehensive performance metrics"""
        try:
            # Remove NaN values
            returns = returns.dropna()
            if benchmark is not None:
                benchmark = benchmark.dropna()
            
            metrics = {
                # Return metrics
                'total_return': self._calculate_total_return(returns),
                'annualized_return': self._calculate_annualized_return(returns),
                'excess_return': self._calculate_excess_return(returns, benchmark),
                
                # Risk metrics
                'volatility': self._calculate_volatility(returns),
                'var_95': self._calculate_var(returns, 0.95),
                'cvar_95': self._calculate_cvar(returns, 0.95),
                'max_drawdown': self._calculate_max_drawdown(returns),
                
                # Risk-adjusted returns
                'sharpe_ratio': self._calculate_sharpe_ratio(returns),
                'sortino_ratio': self._calculate_sortino_ratio(returns),
                'calmar_ratio': self._calculate_calmar_ratio(returns),
                'information_ratio': self._calculate_information_ratio(returns, benchmark),
                
                # Trading metrics
                'win_rate': self._calculate_win_rate(returns),
                'profit_factor': self._calculate_profit_factor(returns),
                'recovery_factor': self._calculate_recovery_factor(returns),
                
                # Market metrics
                'beta': self._calculate_beta(returns, benchmark),
                'alpha': self._calculate_alpha(returns, benchmark),
                'tracking_error': self._calculate_tracking_error(returns, benchmark)
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating advanced metrics: {e}")
            return {}
    
    def _calculate_total_return(self, returns: pd.Series) -> float:
        """Calculate total return"""
        return (1 + returns).prod() - 1
    
    def _calculate_annualized_return(self, returns: pd.Series) -> float:
        """Calculate annualized return"""
        total_return = self._calculate_total_return(returns)
        years = len(returns) / 252
        return (1 + total_return) ** (1 / years) - 1 if years > 0 else 0
    
    def _calculate_excess_return(self, returns: pd.Series, benchmark: pd.Series) -> float:
        """Calculate excess return vs benchmark"""
        if benchmark is None:
            return 0
        return self._calculate_total_return(returns) - self._calculate_total_return(benchmark)
    
    def _calculate_volatility(self, returns: pd.Series) -> float:
        """Calculate annualized volatility"""
        return returns.std() * np.sqrt(252)
    
    def _calculate_var(self, returns: pd.Series, confidence: float) -> float:
        """Calculate Value at Risk"""
        return np.percentile(returns, (1 - confidence) * 100)
    
    def _calculate_cvar(self, returns: pd.Series, confidence: float) -> float:
        """Calculate Conditional Value at Risk"""
        var = self._calculate_var(returns, confidence)
        return returns[returns <= var].mean()
    
    def _calculate_max_drawdown(self, returns: pd.Series) -> float:
        """Calculate maximum drawdown"""
        cumulative = (1 + returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        return drawdown.min()
    
    def _calculate_sharpe_ratio(self, returns: pd.Series, risk_free_rate: float = 0.02) -> float:
        """Calculate Sharpe ratio"""
        excess_returns = returns - risk_free_rate / 252
        return excess_returns.mean() / returns.std() * np.sqrt(252) if returns.std() != 0 else 0
    
    def _calculate_sortino_ratio(self, returns: pd.Series, risk_free_rate: float = 0.02) -> float:
        """Calculate Sortino ratio"""
        excess_returns = returns - risk_free_rate / 252
        downside_returns = returns[returns < 0]
        downside_deviation = downside_returns.std() * np.sqrt(252)
        return excess_returns.mean() / downside_deviation * np.sqrt(252) if downside_deviation != 0 else 0
    
    def _calculate_calmar_ratio(self, returns: pd.Series) -> float:
        """Calculate Calmar ratio"""
        annualized_return = self._calculate_annualized_return(returns)
        max_drawdown = abs(self._calculate_max_drawdown(returns))
        return annualized_return / max_drawdown if max_drawdown != 0 else 0
    
    def _calculate_information_ratio(self, returns: pd.Series, benchmark: pd.Series) -> float:
        """Calculate Information ratio"""
        if benchmark is None:
            return 0
        active_returns = returns - benchmark
        return active_returns.mean() / active_returns.std() * np.sqrt(252) if active_returns.std() != 0 else 0
    
    def _calculate_win_rate(self, returns: pd.Series) -> float:
        """Calculate win rate"""
        return (returns > 0).mean()
    
    def _calculate_profit_factor(self, returns: pd.Series) -> float:
        """Calculate profit factor"""
        gains = returns[returns > 0].sum()
        losses = abs(returns[returns < 0].sum())
        return gains / losses if losses != 0 else float('inf')
    
    def _calculate_recovery_factor(self, returns: pd.Series) -> float:
        """Calculate recovery factor"""
        total_return = self._calculate_total_return(returns)
        max_drawdown = abs(self._calculate_max_drawdown(returns))
        return total_return / max_drawdown if max_drawdown != 0 else 0
    
    def _calculate_beta(self, returns: pd.Series, benchmark: pd.Series) -> float:
        """Calculate beta"""
        if benchmark is None:
            return 1
        covariance = returns.cov(benchmark)
        variance = benchmark.var()
        return covariance / variance if variance != 0 else 1
    
    def _calculate_alpha(self, returns: pd.Series, benchmark: pd.Series, risk_free_rate: float = 0.02) -> float:
        """Calculate alpha"""
        if benchmark is None:
            return 0
        beta = self._calculate_beta(returns, benchmark)
        benchmark_return = self._calculate_annualized_return(benchmark)
        strategy_return = self._calculate_annualized_return(returns)
        return strategy_return - (risk_free_rate + beta * (benchmark_return - risk_free_rate))
    
    def _calculate_tracking_error(self, returns: pd.Series, benchmark: pd.Series) -> float:
        """Calculate tracking error"""
        if benchmark is None:
            return 0
        active_returns = returns - benchmark
        return active_returns.std() * np.sqrt(252)

class WalkForwardAnalyzer:
    """Walk-forward analysis for robust strategy validation"""
    
    def __init__(self, train_period: int = 252, test_period: int = 63, step_size: int = 21):
        self.train_period = train_period  # 1 year
        self.test_period = test_period    # 3 months
        self.step_size = step_size        # 1 month
        
    async def run_walk_forward(self, strategy, data: pd.DataFrame) -> Dict[str, Any]:
        """Run walk-forward analysis"""
        try:
            results = []
            
            for start_idx in range(0, len(data) - self.train_period - self.test_period, self.step_size):
                # Training period
                train_start = start_idx
                train_end = start_idx + self.train_period
                
                # Testing period
                test_start = train_end
                test_end = test_start + self.test_period
                
                # Train strategy
                train_data = data.iloc[train_start:train_end]
                strategy.train(train_data)
                
                # Test strategy
                test_data = data.iloc[test_start:test_end]
                test_results = strategy.backtest(test_data)
                
                results.append({
                    'period': f"{data.index[train_start].date()} - {data.index[test_end-1].date()}",
                    'train_period': f"{data.index[train_start].date()} - {data.index[train_end-1].date()}",
                    'test_period': f"{data.index[test_start].date()} - {data.index[test_end-1].date()}",
                    'test_results': test_results
                })
                
            return self._analyze_walk_forward_results(results)
            
        except Exception as e:
            logger.error(f"Error in walk-forward analysis: {e}")
            return {}
    
    def _analyze_walk_forward_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze walk-forward results"""
        try:
            if not results:
                return {}
            
            # Extract performance metrics
            test_returns = []
            for result in results:
                if 'test_results' in result and 'performance' in result['test_results']:
                    test_returns.append(result['test_results']['performance'])
            
            # Calculate statistics
            analysis = {
                'total_periods': len(results),
                'avg_test_return': np.mean([r.get('total_return', 0) for r in test_returns]),
                'std_test_return': np.std([r.get('total_return', 0) for r in test_returns]),
                'min_test_return': np.min([r.get('total_return', 0) for r in test_returns]),
                'max_test_return': np.max([r.get('total_return', 0) for r in test_returns]),
                'positive_periods': sum(1 for r in test_returns if r.get('total_return', 0) > 0),
                'negative_periods': sum(1 for r in test_returns if r.get('total_return', 0) < 0)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing walk-forward results: {e}")
            return {}

class MonteCarloSimulator:
    """Monte Carlo simulation for strategy robustness testing"""
    
    def __init__(self, n_simulations: int = 1000):
        self.n_simulations = n_simulations
        
    def run_monte_carlo(self, returns: pd.Series, initial_capital: float = 100000) -> Dict[str, Any]:
        """Run Monte Carlo simulation"""
        try:
            results = []
            
            for i in range(self.n_simulations):
                # Bootstrap resample returns
                bootstrapped_returns = returns.sample(n=len(returns), replace=True)
                
                # Calculate cumulative returns
                cumulative_returns = (1 + bootstrapped_returns).cumprod()
                portfolio_values = initial_capital * cumulative_returns
                
                # Calculate metrics
                final_value = portfolio_values.iloc[-1]
                max_drawdown = self._calculate_max_drawdown(portfolio_values)
                
                results.append({
                    'simulation': i,
                    'final_value': final_value,
                    'total_return': (final_value - initial_capital) / initial_capital,
                    'max_drawdown': max_drawdown
                })
                
            return self._analyze_monte_carlo_results(results)
            
        except Exception as e:
            logger.error(f"Error in Monte Carlo simulation: {e}")
            return {}
    
    def _calculate_max_drawdown(self, portfolio_values: pd.Series) -> float:
        """Calculate maximum drawdown"""
        running_max = portfolio_values.expanding().max()
        drawdown = (portfolio_values - running_max) / running_max
        return drawdown.min()
    
    def _analyze_monte_carlo_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze Monte Carlo simulation results"""
        try:
            if not results:
                return {}
            
            # Extract metrics
            total_returns = [r['total_return'] for r in results]
            max_drawdowns = [r['max_drawdown'] for r in results]
            final_values = [r['final_value'] for r in results]
            
            # Calculate statistics
            analysis = {
                'n_simulations': len(results),
                'avg_total_return': np.mean(total_returns),
                'std_total_return': np.std(total_returns),
                'min_total_return': np.min(total_returns),
                'max_total_return': np.max(total_returns),
                'avg_max_drawdown': np.mean(max_drawdowns),
                'std_max_drawdown': np.std(max_drawdowns),
                'min_max_drawdown': np.min(max_drawdowns),
                'max_max_drawdown': np.max(max_drawdowns),
                'avg_final_value': np.mean(final_values),
                'std_final_value': np.std(final_values),
                'min_final_value': np.min(final_values),
                'max_final_value': np.max(final_values),
                'positive_simulations': sum(1 for r in total_returns if r > 0),
                'negative_simulations': sum(1 for r in total_returns if r < 0),
                'confidence_intervals': {
                    'return_95': np.percentile(total_returns, [2.5, 97.5]),
                    'drawdown_95': np.percentile(max_drawdowns, [2.5, 97.5])
                }
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing Monte Carlo results: {e}")
            return {}

class EnhancedReporting:
    """Professional-grade reporting and visualization"""
    
    def __init__(self):
        self.report_templates = {
            'executive_summary': self._create_executive_summary,
            'detailed_analysis': self._create_detailed_analysis,
            'risk_report': self._create_risk_report,
            'performance_attribution': self._create_performance_attribution
        }
        
    def generate_comprehensive_report(self, backtest_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive backtesting report"""
        try:
            report = {
                'executive_summary': self._create_executive_summary(backtest_results),
                'detailed_analysis': self._create_detailed_analysis(backtest_results),
                'risk_report': self._create_risk_report(backtest_results),
                'performance_attribution': self._create_performance_attribution(backtest_results),
                'charts': self._create_charts(backtest_results),
                'tables': self._create_tables(backtest_results)
            }
            return report
            
        except Exception as e:
            logger.error(f"Error generating comprehensive report: {e}")
            return {}
    
    def _create_executive_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create executive summary"""
        try:
            performance = results.get('performance', {})
            
            summary = {
                'strategy_name': results.get('strategy', 'Unknown'),
                'test_period': results.get('period', 'Unknown'),
                'total_return': f"{performance.get('total_return', 0):.2%}",
                'annualized_return': f"{performance.get('annualized_return', 0):.2%}",
                'sharpe_ratio': f"{performance.get('sharpe_ratio', 0):.2f}",
                'max_drawdown': f"{performance.get('max_drawdown', 0):.2%}",
                'win_rate': f"{performance.get('win_rate', 0):.2%}",
                'total_trades': results.get('total_trades', 0),
                'risk_level': self._assess_risk_level(performance)
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error creating executive summary: {e}")
            return {}
    
    def _create_detailed_analysis(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create detailed analysis"""
        try:
            performance = results.get('performance', {})
            
            analysis = {
                'return_analysis': {
                    'total_return': performance.get('total_return', 0),
                    'annualized_return': performance.get('annualized_return', 0),
                    'excess_return': performance.get('excess_return', 0)
                },
                'risk_analysis': {
                    'volatility': performance.get('volatility', 0),
                    'var_95': performance.get('var_95', 0),
                    'cvar_95': performance.get('cvar_95', 0),
                    'max_drawdown': performance.get('max_drawdown', 0)
                },
                'risk_adjusted_returns': {
                    'sharpe_ratio': performance.get('sharpe_ratio', 0),
                    'sortino_ratio': performance.get('sortino_ratio', 0),
                    'calmar_ratio': performance.get('calmar_ratio', 0),
                    'information_ratio': performance.get('information_ratio', 0)
                },
                'trading_metrics': {
                    'win_rate': performance.get('win_rate', 0),
                    'profit_factor': performance.get('profit_factor', 0),
                    'recovery_factor': performance.get('recovery_factor', 0)
                }
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error creating detailed analysis: {e}")
            return {}
    
    def _create_risk_report(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create risk report"""
        try:
            performance = results.get('performance', {})
            
            risk_report = {
                'risk_metrics': {
                    'volatility': performance.get('volatility', 0),
                    'var_95': performance.get('var_95', 0),
                    'cvar_95': performance.get('cvar_95', 0),
                    'max_drawdown': performance.get('max_drawdown', 0),
                    'skewness': performance.get('skewness', 0),
                    'kurtosis': performance.get('kurtosis', 0)
                },
                'risk_assessment': self._assess_risk_level(performance),
                'risk_recommendations': self._generate_risk_recommendations(performance)
            }
            
            return risk_report
            
        except Exception as e:
            logger.error(f"Error creating risk report: {e}")
            return {}
    
    def _create_performance_attribution(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create performance attribution"""
        try:
            performance = results.get('performance', {})
            
            attribution = {
                'market_metrics': {
                    'beta': performance.get('beta', 1),
                    'alpha': performance.get('alpha', 0),
                    'tracking_error': performance.get('tracking_error', 0)
                },
                'attribution_analysis': {
                    'market_contribution': 'To be calculated',
                    'selection_contribution': 'To be calculated',
                    'timing_contribution': 'To be calculated'
                }
            }
            
            return attribution
            
        except Exception as e:
            logger.error(f"Error creating performance attribution: {e}")
            return {}
    
    def _create_charts(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create professional charts"""
        try:
            charts = {
                'equity_curve': 'Chart data placeholder',
                'drawdown_chart': 'Chart data placeholder',
                'monthly_returns_heatmap': 'Chart data placeholder',
                'rolling_metrics': 'Chart data placeholder',
                'trade_analysis': 'Chart data placeholder',
                'risk_return_scatter': 'Chart data placeholder'
            }
            
            return charts
            
        except Exception as e:
            logger.error(f"Error creating charts: {e}")
            return {}
    
    def _create_tables(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create data tables"""
        try:
            tables = {
                'performance_summary': 'Table data placeholder',
                'risk_metrics': 'Table data placeholder',
                'trade_analysis': 'Table data placeholder'
            }
            
            return tables
            
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            return {}
    
    def _assess_risk_level(self, performance: Dict[str, Any]) -> str:
        """Assess overall risk level"""
        try:
            volatility = performance.get('volatility', 0)
            max_dd = abs(performance.get('max_drawdown', 0))
            sharpe = performance.get('sharpe_ratio', 0)
            
            if volatility < 0.15 and max_dd < 0.10 and sharpe > 1.0:
                return 'Low'
            elif volatility < 0.25 and max_dd < 0.20 and sharpe > 0.5:
                return 'Medium'
            else:
                return 'High'
                
        except Exception as e:
            logger.error(f"Error assessing risk level: {e}")
            return 'Unknown'
    
    def _generate_risk_recommendations(self, performance: Dict[str, Any]) -> List[str]:
        """Generate risk recommendations"""
        try:
            recommendations = []
            
            volatility = performance.get('volatility', 0)
            max_dd = abs(performance.get('max_drawdown', 0))
            sharpe = performance.get('sharpe_ratio', 0)
            
            if volatility > 0.25:
                recommendations.append("High volatility detected. Consider reducing position sizes.")
            
            if max_dd > 0.20:
                recommendations.append("Large maximum drawdown. Implement stricter stop-losses.")
            
            if sharpe < 0.5:
                recommendations.append("Low risk-adjusted returns. Review strategy parameters.")
            
            if not recommendations:
                recommendations.append("Risk metrics are within acceptable ranges.")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating risk recommendations: {e}")
            return ["Unable to generate recommendations"]

# Main execution function
async def main():
    """Main function for testing enhanced backtesting components"""
    try:
        # Test performance analytics
        print("Testing Performance Analytics...")
        
        # Create sample returns
        np.random.seed(42)
        returns = pd.Series(np.random.normal(0.001, 0.02, 252))
        
        analytics = PerformanceAnalytics()
        metrics = analytics.calculate_advanced_metrics(returns)
        
        print("Performance Metrics:")
        for key, value in metrics.items():
            print(f"  {key}: {value:.4f}")
        
        # Test risk manager
        print("\nTesting Risk Manager...")
        
        risk_manager = RiskManager()
        positions = {'AAPL': 0.5, 'MSFT': 0.5}
        
        # Create sample price data
        prices = pd.DataFrame({
            'AAPL': np.random.normal(150, 10, 252),
            'MSFT': np.random.normal(300, 15, 252)
        })
        
        risk_metrics = risk_manager.calculate_portfolio_risk(positions, prices)
        
        print("Risk Metrics:")
        for key, value in risk_metrics.items():
            print(f"  {key}: {value:.4f}")
        
        # Test Monte Carlo simulation
        print("\nTesting Monte Carlo Simulation...")
        
        mc_simulator = MonteCarloSimulator(n_simulations=100)
        mc_results = mc_simulator.run_monte_carlo(returns)
        
        print("Monte Carlo Results:")
        for key, value in mc_results.items():
            if isinstance(value, (int, float)):
                print(f"  {key}: {value:.4f}")
            else:
                print(f"  {key}: {value}")
        
        # Test reporting
        print("\nTesting Enhanced Reporting...")
        
        reporting = EnhancedReporting()
        
        # Create sample backtest results
        sample_results = {
            'strategy': 'Test Strategy',
            'period': '2023-01-01 to 2023-12-31',
            'total_trades': 50,
            'performance': metrics
        }
        
        report = reporting.generate_comprehensive_report(sample_results)
        
        print("Report Generated:")
        print(f"  Executive Summary: {len(report.get('executive_summary', {}))} items")
        print(f"  Detailed Analysis: {len(report.get('detailed_analysis', {}))} items")
        print(f"  Risk Report: {len(report.get('risk_report', {}))} items")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")

if __name__ == "__main__":
    asyncio.run(main())
