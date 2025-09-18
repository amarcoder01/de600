#!/usr/bin/env python3
"""
Portfolio Optimization Engine for Phase 4
Implements advanced portfolio optimization with alternative data sources
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import json
import warnings
warnings.filterwarnings('ignore')

from scipy.optimize import minimize
from sklearn.covariance import LedoitWolf
from sklearn.decomposition import PCA
try:
    import talib
    TALIB_AVAILABLE = True
except ImportError:
    TALIB_AVAILABLE = False

class PortfolioOptimizationEngine:
    """Advanced portfolio optimization engine"""
    
    def __init__(self):
        self.optimization_methods = [
            'mean_variance',
            'risk_parity',
            'black_litterman',
            'factor_based',
            'robust_optimization',
            'cvar_optimization'
        ]
        
        self.alternative_data_sources = {
            'social_sentiment': True,
            'options_flow': True,
            'insider_trading': True,
            'earnings_surprises': True,
            'analyst_revisions': True
        }
        
        print("📊 Portfolio Optimization Engine initialized")
    
    def get_market_data(self, symbols, period='1y'):
        """Get market data for portfolio optimization"""
        data = {}
        
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=period)
                
                if len(hist) > 50:  # Minimum data requirement
                    data[symbol] = hist
                else:
                    print(f"⚠️  Insufficient data for {symbol}")
            except Exception as e:
                print(f"❌ Error fetching data for {symbol}: {e}")
        
        return data
    
    def calculate_returns_matrix(self, market_data):
        """Calculate returns matrix from market data"""
        returns_data = {}
        
        for symbol, data in market_data.items():
            returns = data['Close'].pct_change().dropna()
            returns_data[symbol] = returns
        
        # Create aligned returns dataframe
        returns_df = pd.DataFrame(returns_data).dropna()
        
        return returns_df
    
    def estimate_expected_returns(self, returns_df, method='capm'):
        """Estimate expected returns using various methods"""
        if method == 'capm':
            return self.capm_expected_returns(returns_df)
        elif method == 'historical':
            return returns_df.mean() * 252  # Annualized
        elif method == 'black_litterman':
            return self.black_litterman_returns(returns_df)
        else:
            return returns_df.mean() * 252
    
    def capm_expected_returns(self, returns_df):
        """Calculate CAPM expected returns"""
        # Use SPY as market proxy
        try:
            spy_data = yf.Ticker('SPY').history(period='1y')
            market_returns = spy_data['Close'].pct_change().dropna()
            
            # Align dates
            common_dates = returns_df.index.intersection(market_returns.index)
            aligned_returns = returns_df.loc[common_dates]
            aligned_market = market_returns.loc[common_dates]
            
            if len(aligned_returns) < 30:
                return returns_df.mean() * 252  # Fallback to historical
            
            # Calculate betas
            betas = {}
            for symbol in returns_df.columns:
                cov_matrix = np.cov(aligned_returns[symbol], aligned_market)
                beta = cov_matrix[0, 1] / np.var(aligned_market)
                betas[symbol] = beta
            
            # CAPM expected returns
            risk_free_rate = 0.02  # 2% risk-free rate
            market_premium = 0.08  # 8% market risk premium
            
            expected_returns = {}
            for symbol, beta in betas.items():
                expected_return = risk_free_rate + beta * market_premium
                expected_returns[symbol] = expected_return
            
            return pd.Series(expected_returns)
            
        except Exception as e:
            print(f"CAPM calculation failed: {e}")
            return returns_df.mean() * 252
    
    def black_litterman_returns(self, returns_df):
        """Black-Litterman expected returns"""
        try:
            # Market cap weights (simplified - equal weights)
            n_assets = len(returns_df.columns)
            market_weights = np.ones(n_assets) / n_assets
            
            # Risk aversion parameter
            risk_aversion = 3.0
            
            # Covariance matrix
            cov_matrix = returns_df.cov() * 252
            
            # Implied returns
            implied_returns = risk_aversion * np.dot(cov_matrix, market_weights)
            
            return pd.Series(implied_returns, index=returns_df.columns)
            
        except Exception as e:
            print(f"Black-Litterman calculation failed: {e}")
            return returns_df.mean() * 252
    
    def robust_covariance_estimation(self, returns_df):
        """Estimate robust covariance matrix"""
        try:
            # Ledoit-Wolf shrinkage estimator
            lw = LedoitWolf()
            cov_matrix = lw.fit(returns_df).covariance_
            
            # Convert to pandas DataFrame
            cov_df = pd.DataFrame(cov_matrix, 
                                index=returns_df.columns, 
                                columns=returns_df.columns)
            
            return cov_df * 252  # Annualized
            
        except Exception as e:
            print(f"Robust covariance estimation failed: {e}")
            return returns_df.cov() * 252
    
    def factor_analysis(self, returns_df):
        """Perform factor analysis on returns"""
        try:
            # PCA for factor extraction
            pca = PCA(n_components=min(5, len(returns_df.columns) - 1))
            factor_loadings = pca.fit_transform(returns_df.T)
            
            # Factor returns
            factor_returns = pca.transform(returns_df.T)
            
            factor_analysis_results = {
                'n_factors': pca.n_components_,
                'explained_variance_ratio': pca.explained_variance_ratio_,
                'cumulative_variance_explained': np.cumsum(pca.explained_variance_ratio_),
                'factor_loadings': factor_loadings,
                'factor_returns': factor_returns
            }
            
            return factor_analysis_results
            
        except Exception as e:
            print(f"Factor analysis failed: {e}")
            return None
    
    def mean_variance_optimization(self, expected_returns, cov_matrix, risk_aversion=1.0):
        """Classic mean-variance optimization"""
        n_assets = len(expected_returns)
        
        def objective(weights):
            portfolio_return = np.dot(weights, expected_returns)
            portfolio_variance = np.dot(weights.T, np.dot(cov_matrix, weights))
            return -portfolio_return + risk_aversion * portfolio_variance
        
        # Constraints
        constraints = [
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},  # Weights sum to 1
        ]
        
        # Bounds (long-only)
        bounds = [(0, 1) for _ in range(n_assets)]
        
        # Initial guess
        x0 = np.ones(n_assets) / n_assets
        
        # Optimize
        result = minimize(objective, x0, method='SLSQP', bounds=bounds, constraints=constraints)
        
        if result.success:
            weights = pd.Series(result.x, index=expected_returns.index)
            return weights
        else:
            # Fallback to equal weights
            return pd.Series(np.ones(n_assets) / n_assets, index=expected_returns.index)
    
    def risk_parity_optimization(self, cov_matrix):
        """Risk parity optimization"""
        n_assets = len(cov_matrix)
        
        def risk_budget_objective(weights):
            # Calculate risk contributions
            portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            marginal_contrib = np.dot(cov_matrix, weights) / portfolio_vol
            contrib = weights * marginal_contrib
            
            # Risk parity objective: minimize sum of squared differences from equal risk contribution
            target_risk = portfolio_vol / n_assets
            return np.sum((contrib - target_risk) ** 2)
        
        # Constraints
        constraints = [
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
        ]
        
        # Bounds
        bounds = [(0.001, 1) for _ in range(n_assets)]  # Small minimum to avoid division by zero
        
        # Initial guess
        x0 = np.ones(n_assets) / n_assets
        
        # Optimize
        result = minimize(risk_budget_objective, x0, method='SLSQP', bounds=bounds, constraints=constraints)
        
        if result.success:
            weights = pd.Series(result.x, index=cov_matrix.index)
            return weights
        else:
            # Fallback to inverse volatility weights
            volatilities = np.sqrt(np.diag(cov_matrix))
            inv_vol_weights = 1 / volatilities
            weights = inv_vol_weights / np.sum(inv_vol_weights)
            return pd.Series(weights, index=cov_matrix.index)
    
    def maximum_diversification_optimization(self, expected_returns, cov_matrix):
        """Maximum diversification optimization"""
        n_assets = len(expected_returns)
        
        def diversification_objective(weights):
            # Diversification ratio = weighted average volatility / portfolio volatility
            individual_vols = np.sqrt(np.diag(cov_matrix))
            weighted_avg_vol = np.dot(weights, individual_vols)
            portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            
            # Minimize negative diversification ratio (maximize diversification)
            return -weighted_avg_vol / portfolio_vol
        
        # Constraints
        constraints = [
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
        ]
        
        # Bounds
        bounds = [(0, 1) for _ in range(n_assets)]
        
        # Initial guess
        x0 = np.ones(n_assets) / n_assets
        
        # Optimize
        result = minimize(diversification_objective, x0, method='SLSQP', bounds=bounds, constraints=constraints)
        
        if result.success:
            weights = pd.Series(result.x, index=expected_returns.index)
            return weights
        else:
            return pd.Series(np.ones(n_assets) / n_assets, index=expected_returns.index)
    
    def cvar_optimization(self, returns_df, confidence_level=0.05):
        """Conditional Value at Risk (CVaR) optimization"""
        n_assets = len(returns_df.columns)
        n_scenarios = len(returns_df)
        
        def cvar_objective(weights):
            # Calculate portfolio returns for all scenarios
            portfolio_returns = np.dot(returns_df.values, weights)
            
            # Sort returns
            sorted_returns = np.sort(portfolio_returns)
            
            # Calculate VaR and CVaR
            var_index = int(confidence_level * n_scenarios)
            if var_index > 0:
                cvar = np.mean(sorted_returns[:var_index])
            else:
                cvar = sorted_returns[0]
            
            return -cvar  # Maximize CVaR (minimize negative CVaR)
        
        # Constraints
        constraints = [
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
        ]
        
        # Bounds
        bounds = [(0, 1) for _ in range(n_assets)]
        
        # Initial guess
        x0 = np.ones(n_assets) / n_assets
        
        # Optimize
        result = minimize(cvar_objective, x0, method='SLSQP', bounds=bounds, constraints=constraints)
        
        if result.success:
            weights = pd.Series(result.x, index=returns_df.columns)
            return weights
        else:
            return pd.Series(np.ones(n_assets) / n_assets, index=returns_df.columns)
    
    def incorporate_alternative_data(self, symbols, base_weights):
        """Incorporate alternative data signals into portfolio weights"""
        adjusted_weights = base_weights.copy()
        
        for symbol in symbols:
            try:
                # Simulate alternative data signals
                alt_data_signals = self.get_alternative_data_signals(symbol)
                
                # Adjust weights based on alternative data
                adjustment_factor = 1.0
                
                # Social sentiment adjustment
                if alt_data_signals['social_sentiment'] > 0.6:
                    adjustment_factor *= 1.1
                elif alt_data_signals['social_sentiment'] < 0.4:
                    adjustment_factor *= 0.9
                
                # Options flow adjustment
                if alt_data_signals['options_flow'] > 0.6:
                    adjustment_factor *= 1.05
                elif alt_data_signals['options_flow'] < 0.4:
                    adjustment_factor *= 0.95
                
                # Insider trading adjustment
                if alt_data_signals['insider_sentiment'] > 0.7:
                    adjustment_factor *= 1.15
                elif alt_data_signals['insider_sentiment'] < 0.3:
                    adjustment_factor *= 0.85
                
                # Apply adjustment
                if symbol in adjusted_weights.index:
                    adjusted_weights[symbol] *= adjustment_factor
                
            except Exception as e:
                print(f"Alternative data processing failed for {symbol}: {e}")
        
        # Renormalize weights
        adjusted_weights = adjusted_weights / adjusted_weights.sum()
        
        return adjusted_weights
    
    def get_alternative_data_signals(self, symbol):
        """Get alternative data signals (simulated)"""
        # In a real implementation, this would connect to alternative data providers
        # For now, we simulate the signals
        
        np.random.seed(hash(symbol) % 2**32)  # Consistent random seed based on symbol
        
        signals = {
            'social_sentiment': np.random.beta(2, 2),  # 0-1 sentiment score
            'options_flow': np.random.beta(2, 2),     # 0-1 bullish options flow
            'insider_sentiment': np.random.beta(2, 2), # 0-1 insider buying sentiment
            'earnings_surprise': np.random.normal(0, 0.1),  # Earnings surprise factor
            'analyst_revisions': np.random.normal(0, 0.05), # Analyst revision momentum
            'news_momentum': np.random.beta(2, 2),     # News sentiment momentum
            'institutional_flow': np.random.normal(0, 0.1), # Institutional buying/selling
        }
        
        return signals
    
    def calculate_portfolio_metrics(self, weights, expected_returns, cov_matrix, returns_df=None):
        """Calculate comprehensive portfolio metrics"""
        portfolio_return = np.dot(weights, expected_returns)
        portfolio_variance = np.dot(weights.T, np.dot(cov_matrix, weights))
        portfolio_volatility = np.sqrt(portfolio_variance)
        
        sharpe_ratio = (portfolio_return - 0.02) / portfolio_volatility  # Assuming 2% risk-free rate
        
        metrics = {
            'expected_return': portfolio_return,
            'volatility': portfolio_volatility,
            'sharpe_ratio': sharpe_ratio,
            'weights': weights.to_dict()
        }
        
        # Additional metrics if historical returns provided
        if returns_df is not None:
            portfolio_returns = np.dot(returns_df, weights)
            
            # VaR and CVaR
            var_95 = np.percentile(portfolio_returns, 5)
            cvar_95 = np.mean(portfolio_returns[portfolio_returns <= var_95])
            
            # Maximum drawdown
            cumulative_returns = (1 + portfolio_returns).cumprod()
            running_max = cumulative_returns.expanding().max()
            drawdowns = (cumulative_returns - running_max) / running_max
            max_drawdown = drawdowns.min()
            
            # Tracking error vs equal weight
            equal_weight_returns = returns_df.mean(axis=1)
            tracking_error = np.std(portfolio_returns - equal_weight_returns) * np.sqrt(252)
            
            metrics.update({
                'var_95': var_95,
                'cvar_95': cvar_95,
                'max_drawdown': max_drawdown,
                'tracking_error': tracking_error,
                'skewness': portfolio_returns.skew(),
                'kurtosis': portfolio_returns.kurtosis()
            })
        
        return metrics
    
    def multi_objective_optimization(self, symbols, optimization_methods=['mean_variance', 'risk_parity']):
        """Perform multi-objective portfolio optimization"""
        print(f"🎯 Multi-objective optimization for {len(symbols)} assets...")
        
        # Get market data
        market_data = self.get_market_data(symbols, period='2y')
        
        if len(market_data) < 2:
            raise ValueError("Insufficient market data for optimization")
        
        # Calculate returns
        returns_df = self.calculate_returns_matrix(market_data)
        
        if len(returns_df) < 50:
            raise ValueError("Insufficient return data for optimization")
        
        # Estimate inputs
        expected_returns = self.estimate_expected_returns(returns_df, method='capm')
        cov_matrix = self.robust_covariance_estimation(returns_df)
        
        # Perform different optimizations
        optimization_results = {}
        
        for method in optimization_methods:
            try:
                if method == 'mean_variance':
                    weights = self.mean_variance_optimization(expected_returns, cov_matrix, risk_aversion=2.0)
                elif method == 'risk_parity':
                    weights = self.risk_parity_optimization(cov_matrix)
                elif method == 'max_diversification':
                    weights = self.maximum_diversification_optimization(expected_returns, cov_matrix)
                elif method == 'cvar_optimization':
                    weights = self.cvar_optimization(returns_df)
                else:
                    continue
                
                # Calculate metrics
                metrics = self.calculate_portfolio_metrics(weights, expected_returns, cov_matrix, returns_df)
                
                # Incorporate alternative data
                adjusted_weights = self.incorporate_alternative_data(symbols, weights)
                adjusted_metrics = self.calculate_portfolio_metrics(adjusted_weights, expected_returns, cov_matrix, returns_df)
                
                optimization_results[method] = {
                    'base_weights': weights.to_dict(),
                    'adjusted_weights': adjusted_weights.to_dict(),
                    'base_metrics': metrics,
                    'adjusted_metrics': adjusted_metrics
                }
                
                print(f"  ✅ {method}: Sharpe = {adjusted_metrics['sharpe_ratio']:.3f}")
                
            except Exception as e:
                print(f"  ❌ {method} failed: {e}")
        
        # Factor analysis
        factor_results = self.factor_analysis(returns_df)
        
        # Ensemble weights (average of successful optimizations)
        if optimization_results:
            ensemble_weights = self.create_ensemble_portfolio(optimization_results)
            ensemble_metrics = self.calculate_portfolio_metrics(ensemble_weights, expected_returns, cov_matrix, returns_df)
            
            optimization_results['ensemble'] = {
                'base_weights': ensemble_weights.to_dict(),
                'adjusted_weights': ensemble_weights.to_dict(),
                'base_metrics': ensemble_metrics,
                'adjusted_metrics': ensemble_metrics
            }
        
        result = {
            'symbols': symbols,
            'optimization_results': optimization_results,
            'factor_analysis': factor_results,
            'market_summary': {
                'correlation_matrix': returns_df.corr().to_dict(),
                'volatilities': (returns_df.std() * np.sqrt(252)).to_dict(),
                'expected_returns': expected_returns.to_dict()
            },
            'timestamp': datetime.now().isoformat()
        }
        
        return result
    
    def create_ensemble_portfolio(self, optimization_results):
        """Create ensemble portfolio from multiple optimization methods"""
        all_weights = []
        all_sharpe_ratios = []
        
        for method, results in optimization_results.items():
            if 'adjusted_weights' in results:
                weights = pd.Series(results['adjusted_weights'])
                sharpe = results['adjusted_metrics']['sharpe_ratio']
                
                all_weights.append(weights)
                all_sharpe_ratios.append(max(0.1, sharpe))  # Minimum weight
        
        if not all_weights:
            # Fallback to equal weights
            symbols = list(optimization_results.values())[0]['adjusted_weights'].keys()
            equal_weight = 1.0 / len(symbols)
            return pd.Series({symbol: equal_weight for symbol in symbols})
        
        # Weight by Sharpe ratio
        sharpe_weights = np.array(all_sharpe_ratios)
        sharpe_weights = sharpe_weights / np.sum(sharpe_weights)
        
        # Calculate ensemble weights
        ensemble_weights = pd.Series(0.0, index=all_weights[0].index)
        
        for i, weights in enumerate(all_weights):
            ensemble_weights += weights * sharpe_weights[i]
        
        return ensemble_weights
    
    def dynamic_rebalancing_strategy(self, symbols, rebalancing_frequency='monthly'):
        """Create dynamic rebalancing strategy"""
        strategy = {
            'symbols': symbols,
            'rebalancing_frequency': rebalancing_frequency,
            'trigger_conditions': {
                'drift_threshold': 0.05,  # 5% weight drift
                'volatility_spike': 1.5,   # 50% volatility increase
                'correlation_breakdown': 0.3,  # 30% correlation change
                'performance_degradation': -0.10  # -10% performance vs benchmark
            },
            'optimization_methods': ['risk_parity', 'mean_variance', 'max_diversification'],
            'alternative_data_weight': 0.2,  # 20% alternative data influence
            'transaction_cost': 0.001,  # 0.1% transaction cost
            'minimum_trade_size': 0.01,  # 1% minimum position change
        }
        
        return strategy

def main():
    """Test the Portfolio Optimization Engine"""
    if len(sys.argv) < 3:
        print("Usage: python portfolio_optimization_engine.py <symbol1,symbol2,...> [method]")
        print("Methods: mean_variance, risk_parity, max_div, cvar, multi")
        sys.exit(1)
    
    symbols = sys.argv[1].upper().split(',')
    method = sys.argv[2].lower() if len(sys.argv) > 2 else 'multi'
    
    try:
        optimizer = PortfolioOptimizationEngine()
        
        if method == 'multi':
            # Multi-objective optimization
            result = optimizer.multi_objective_optimization(
                symbols, 
                optimization_methods=['mean_variance', 'risk_parity', 'max_diversification', 'cvar_optimization']
            )
        else:
            # Single method optimization
            result = optimizer.multi_objective_optimization(symbols, optimization_methods=[method])
        
        # Add dynamic rebalancing strategy
        result['dynamic_strategy'] = optimizer.dynamic_rebalancing_strategy(symbols)
        
        result['success'] = True
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e),
            'symbols': symbols,
            'method': method,
            'timestamp': datetime.now().isoformat()
        }))

if __name__ == "__main__":
    import sys
    main()
