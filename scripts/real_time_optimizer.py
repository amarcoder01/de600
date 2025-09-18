#!/usr/bin/env python3
"""
Real-Time Optimization Engine for Phase 4
Implements continuous model optimization, auto-retraining, and market regime adaptation
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import json
import threading
import time
import warnings
warnings.filterwarnings('ignore')

from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score
try:
    import talib
    TALIB_AVAILABLE = True
except ImportError:
    TALIB_AVAILABLE = False

class RealTimeOptimizer:
    """Real-time optimization engine for ML models"""
    
    def __init__(self):
        self.monitoring_active = False
        self.optimization_schedule = {}
        self.performance_thresholds = {
            'r2_score_min': 0.3,
            'mse_max': 0.1,
            'staleness_hours': 24,
            'drift_threshold': 0.15
        }
        
        self.market_regimes = {
            'bull': {'volatility_threshold': 0.15, 'momentum_threshold': 0.05},
            'bear': {'volatility_threshold': 0.25, 'momentum_threshold': -0.05},
            'sideways': {'volatility_threshold': 0.20, 'momentum_threshold': 0.02}
        }
        
        self.optimization_history = []
        self.model_registry = {}
        
        print("⚡ Real-Time Optimizer initialized")

    def detect_market_regime(self, symbol):
        """Detect current market regime for adaptive strategies"""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period='3mo')
            
            # Calculate regime indicators
            returns = data['Close'].pct_change().dropna()
            volatility = returns.rolling(window=20).std() * np.sqrt(252)
            momentum = (data['Close'].iloc[-1] / data['Close'].iloc[-20] - 1)
            
            current_vol = volatility.iloc[-1]
            current_momentum = momentum
            
            # Classify regime
            if current_momentum > self.market_regimes['bull']['momentum_threshold']:
                if current_vol < self.market_regimes['bull']['volatility_threshold']:
                    regime = 'bull_low_vol'
                else:
                    regime = 'bull_high_vol'
            elif current_momentum < self.market_regimes['bear']['momentum_threshold']:
                if current_vol < self.market_regimes['bear']['volatility_threshold']:
                    regime = 'bear_low_vol'
                else:
                    regime = 'bear_high_vol'
            else:
                regime = 'sideways'
            
            # Additional regime features
            regime_features = {
                'regime': regime,
                'volatility': current_vol,
                'momentum': current_momentum,
                'trend_strength': abs(current_momentum),
                'volatility_regime': 'high' if current_vol > 0.25 else 'low' if current_vol < 0.15 else 'normal',
                'momentum_regime': 'strong_up' if current_momentum > 0.1 else 'strong_down' if current_momentum < -0.1 else 'weak',
                'market_stress': self.calculate_market_stress(data),
                'liquidity_score': self.calculate_liquidity_score(data),
                'correlation_breakdown': self.detect_correlation_breakdown(symbol)
            }
            
            return regime_features
            
        except Exception as e:
            print(f"Error detecting market regime for {symbol}: {e}")
            return {
                'regime': 'unknown',
                'volatility': 0.2,
                'momentum': 0.0,
                'trend_strength': 0.0,
                'volatility_regime': 'normal',
                'momentum_regime': 'weak',
                'market_stress': 0.5,
                'liquidity_score': 0.7,
                'correlation_breakdown': False
            }

    def calculate_market_stress(self, data):
        """Calculate market stress indicator"""
        returns = data['Close'].pct_change().dropna()
        
        # VIX-like calculation
        rolling_vol = returns.rolling(window=20).std()
        vol_of_vol = rolling_vol.rolling(window=10).std()
        
        # Stress score (0-1)
        stress_score = min(1.0, vol_of_vol.iloc[-1] * 10)
        return stress_score

    def calculate_liquidity_score(self, data):
        """Calculate liquidity score based on volume patterns"""
        volume = data['Volume']
        avg_volume = volume.rolling(window=20).mean()
        
        # Volume ratio as liquidity proxy
        recent_volume_ratio = volume.iloc[-5:].mean() / avg_volume.iloc[-1]
        
        # Normalize to 0-1 scale
        liquidity_score = min(1.0, max(0.1, recent_volume_ratio))
        return liquidity_score

    def detect_correlation_breakdown(self, symbol):
        """Detect if stock correlations are breaking down (crisis indicator)"""
        try:
            # Get market data (SPY as market proxy)
            spy = yf.Ticker('SPY').history(period='2mo')
            stock = yf.Ticker(symbol).history(period='2mo')
            
            # Calculate rolling correlation
            spy_returns = spy['Close'].pct_change().dropna()
            stock_returns = stock['Close'].pct_change().dropna()
            
            # Align dates
            common_dates = spy_returns.index.intersection(stock_returns.index)
            spy_aligned = spy_returns.loc[common_dates]
            stock_aligned = stock_returns.loc[common_dates]
            
            if len(common_dates) > 30:
                recent_corr = spy_aligned.tail(20).corr(stock_aligned.tail(20))
                long_term_corr = spy_aligned.corr(stock_aligned)
                
                # Correlation breakdown if recent correlation drops significantly
                correlation_breakdown = abs(recent_corr - long_term_corr) > 0.3
                return correlation_breakdown
            
        except:
            pass
        
        return False

    def evaluate_model_performance(self, symbol, model_predictions, actual_prices):
        """Evaluate model performance in real-time"""
        if len(model_predictions) < 5 or len(actual_prices) < 5:
            return None
        
        # Align predictions and actuals
        min_len = min(len(model_predictions), len(actual_prices))
        predictions = np.array(model_predictions[-min_len:])
        actuals = np.array(actual_prices[-min_len:])
        
        # Calculate metrics
        mse = mean_squared_error(actuals, predictions)
        r2 = r2_score(actuals, predictions)
        
        # Calculate directional accuracy
        pred_direction = np.sign(np.diff(predictions))
        actual_direction = np.sign(np.diff(actuals))
        directional_accuracy = np.mean(pred_direction == actual_direction)
        
        # Calculate prediction intervals
        errors = predictions - actuals
        error_std = np.std(errors)
        
        performance = {
            'mse': mse,
            'r2_score': r2,
            'directional_accuracy': directional_accuracy,
            'error_std': error_std,
            'bias': np.mean(errors),
            'recent_performance': r2,  # Could be calculated on more recent subset
            'drift_score': self.calculate_drift_score(errors),
            'needs_retraining': self.needs_retraining(r2, mse, error_std)
        }
        
        return performance

    def calculate_drift_score(self, errors):
        """Calculate model drift score"""
        if len(errors) < 10:
            return 0.0
        
        # Calculate drift as trend in absolute errors
        recent_errors = np.abs(errors[-10:])
        older_errors = np.abs(errors[-20:-10]) if len(errors) >= 20 else recent_errors
        
        drift_score = (np.mean(recent_errors) - np.mean(older_errors)) / (np.mean(older_errors) + 1e-8)
        return max(0.0, drift_score)

    def needs_retraining(self, r2_score, mse, error_std):
        """Determine if model needs retraining"""
        conditions = [
            r2_score < self.performance_thresholds['r2_score_min'],
            mse > self.performance_thresholds['mse_max'],
            error_std > 0.1  # High prediction uncertainty
        ]
        
        return any(conditions)

    def optimize_ensemble_weights(self, model_predictions, actual_prices, model_names):
        """Optimize ensemble weights based on recent performance"""
        if len(model_predictions) < len(model_names) or len(actual_prices) < 5:
            # Return equal weights if insufficient data
            equal_weight = 1.0 / len(model_names)
            return {name: equal_weight for name in model_names}
        
        # Calculate individual model performance
        model_scores = {}
        min_len = min(len(model_predictions[0]), len(actual_prices))
        actuals = np.array(actual_prices[-min_len:])
        
        for i, model_name in enumerate(model_names):
            if i < len(model_predictions):
                predictions = np.array(model_predictions[i][-min_len:])
                
                # Calculate weighted score (recent performance weighted more)
                recent_weight = 0.7
                older_weight = 0.3
                
                recent_split = max(1, min_len // 3)
                recent_r2 = r2_score(actuals[-recent_split:], predictions[-recent_split:])
                older_r2 = r2_score(actuals[:-recent_split], predictions[:-recent_split]) if min_len > recent_split else recent_r2
                
                weighted_score = recent_r2 * recent_weight + older_r2 * older_weight
                model_scores[model_name] = max(0.01, weighted_score)  # Minimum weight
        
        # Normalize weights
        total_score = sum(model_scores.values())
        if total_score > 0:
            optimized_weights = {name: score / total_score for name, score in model_scores.items()}
        else:
            equal_weight = 1.0 / len(model_names)
            optimized_weights = {name: equal_weight for name in model_names}
        
        return optimized_weights

    def adaptive_strategy_selection(self, symbol, market_regime):
        """Select optimal strategy based on market regime"""
        strategies = {
            'bull_low_vol': {
                'strategy': 'momentum_following',
                'model_weights': {'lstm': 0.4, 'transformer': 0.3, 'rf': 0.3},
                'risk_adjustment': 1.2,
                'position_sizing': 'aggressive'
            },
            'bull_high_vol': {
                'strategy': 'volatility_adjusted_momentum',
                'model_weights': {'lstm': 0.5, 'transformer': 0.3, 'rf': 0.2},
                'risk_adjustment': 0.8,
                'position_sizing': 'moderate'
            },
            'bear_low_vol': {
                'strategy': 'mean_reversion',
                'model_weights': {'rf': 0.4, 'gb': 0.3, 'lstm': 0.3},
                'risk_adjustment': 0.6,
                'position_sizing': 'conservative'
            },
            'bear_high_vol': {
                'strategy': 'defensive',
                'model_weights': {'rf': 0.5, 'gb': 0.4, 'transformer': 0.1},
                'risk_adjustment': 0.4,
                'position_sizing': 'very_conservative'
            },
            'sideways': {
                'strategy': 'range_trading',
                'model_weights': {'rf': 0.35, 'gb': 0.35, 'lstm': 0.3},
                'risk_adjustment': 0.9,
                'position_sizing': 'moderate'
            }
        }
        
        regime_key = market_regime.get('regime', 'sideways')
        strategy_config = strategies.get(regime_key, strategies['sideways'])
        
        # Adjust for market stress
        market_stress = market_regime.get('market_stress', 0.5)
        if market_stress > 0.7:
            strategy_config['risk_adjustment'] *= 0.7
            strategy_config['position_sizing'] = 'very_conservative'
        
        # Adjust for correlation breakdown
        if market_regime.get('correlation_breakdown', False):
            strategy_config['strategy'] = 'crisis_mode'
            strategy_config['risk_adjustment'] *= 0.5
            strategy_config['model_weights'] = {'rf': 0.6, 'gb': 0.4}  # Conservative models only
        
        return strategy_config

    def auto_retrain_trigger(self, symbol, performance_metrics):
        """Trigger automatic retraining based on performance degradation"""
        retrain_conditions = [
            performance_metrics.get('r2_score', 0) < self.performance_thresholds['r2_score_min'],
            performance_metrics.get('drift_score', 0) > self.performance_thresholds['drift_threshold'],
            performance_metrics.get('directional_accuracy', 1) < 0.5
        ]
        
        if any(retrain_conditions):
            print(f"🔄 Auto-retraining triggered for {symbol}")
            return self.schedule_retraining(symbol, reason='performance_degradation')
        
        return False

    def schedule_retraining(self, symbol, reason='scheduled'):
        """Schedule model retraining"""
        retraining_job = {
            'symbol': symbol,
            'reason': reason,
            'scheduled_time': datetime.now(),
            'priority': 'high' if reason == 'performance_degradation' else 'normal',
            'estimated_duration': '30-45 minutes',
            'status': 'pending'
        }
        
        self.optimization_schedule[symbol] = retraining_job
        print(f"📅 Retraining scheduled for {symbol} - Reason: {reason}")
        
        # In a real implementation, this would trigger a background process
        return True

    def dynamic_parameter_adjustment(self, symbol, market_regime, recent_performance):
        """Dynamically adjust model parameters based on conditions"""
        adjustments = {
            'learning_rate_multiplier': 1.0,
            'regularization_strength': 1.0,
            'ensemble_diversity': 1.0,
            'volatility_adjustment': 1.0,
            'momentum_sensitivity': 1.0
        }
        
        # Adjust based on market regime
        regime = market_regime.get('regime', 'sideways')
        volatility = market_regime.get('volatility', 0.2)
        
        if 'high_vol' in regime:
            adjustments['learning_rate_multiplier'] = 0.8  # More conservative learning
            adjustments['regularization_strength'] = 1.3  # Stronger regularization
            adjustments['volatility_adjustment'] = 1.5
        
        if 'bull' in regime:
            adjustments['momentum_sensitivity'] = 1.2
        elif 'bear' in regime:
            adjustments['momentum_sensitivity'] = 0.8
        
        # Adjust based on recent performance
        if recent_performance.get('r2_score', 0.5) < 0.4:
            adjustments['ensemble_diversity'] = 1.3  # Increase model diversity
            adjustments['regularization_strength'] = 0.8  # Reduce overfitting protection
        
        # Adjust for market stress
        market_stress = market_regime.get('market_stress', 0.5)
        if market_stress > 0.7:
            adjustments['learning_rate_multiplier'] *= 0.7
            adjustments['regularization_strength'] *= 1.4
        
        return adjustments

    def risk_parity_optimization(self, symbols, market_regime):
        """Optimize portfolio using risk parity principles"""
        try:
            # Get correlation matrix
            returns_data = {}
            for symbol in symbols:
                ticker = yf.Ticker(symbol)
                data = ticker.history(period='3mo')
                returns_data[symbol] = data['Close'].pct_change().dropna()
            
            # Create returns dataframe
            returns_df = pd.DataFrame(returns_data).dropna()
            
            if len(returns_df) < 30:
                # Fallback to equal weights
                equal_weight = 1.0 / len(symbols)
                return {symbol: equal_weight for symbol in symbols}
            
            # Calculate risk metrics
            volatilities = returns_df.std() * np.sqrt(252)
            correlations = returns_df.corr()
            
            # Risk parity weights (inverse volatility)
            inv_vol_weights = 1 / volatilities
            normalized_weights = inv_vol_weights / inv_vol_weights.sum()
            
            # Adjust for market regime
            regime_adjustments = self.get_regime_adjustments(market_regime)
            
            adjusted_weights = {}
            for symbol in symbols:
                base_weight = normalized_weights.get(symbol, 1.0 / len(symbols))
                adjustment = regime_adjustments.get('volatility_adjustment', 1.0)
                adjusted_weights[symbol] = base_weight * adjustment
            
            # Renormalize
            total_weight = sum(adjusted_weights.values())
            final_weights = {symbol: weight / total_weight for symbol, weight in adjusted_weights.items()}
            
            return final_weights
            
        except Exception as e:
            print(f"Error in risk parity optimization: {e}")
            # Fallback to equal weights
            equal_weight = 1.0 / len(symbols)
            return {symbol: equal_weight for symbol in symbols}

    def get_regime_adjustments(self, market_regime):
        """Get regime-specific adjustments"""
        regime = market_regime.get('regime', 'sideways')
        
        adjustments = {
            'bull_low_vol': {'volatility_adjustment': 1.2, 'momentum_boost': 1.1},
            'bull_high_vol': {'volatility_adjustment': 0.9, 'momentum_boost': 1.0},
            'bear_low_vol': {'volatility_adjustment': 0.8, 'momentum_boost': 0.9},
            'bear_high_vol': {'volatility_adjustment': 0.6, 'momentum_boost': 0.8},
            'sideways': {'volatility_adjustment': 1.0, 'momentum_boost': 1.0}
        }
        
        return adjustments.get(regime, adjustments['sideways'])

    def generate_optimization_report(self, symbol):
        """Generate comprehensive optimization report"""
        market_regime = self.detect_market_regime(symbol)
        strategy_config = self.adaptive_strategy_selection(symbol, market_regime)
        
        report = {
            'symbol': symbol,
            'timestamp': datetime.now().isoformat(),
            'market_analysis': {
                'regime': market_regime,
                'strategy_recommendation': strategy_config,
                'optimization_schedule': self.optimization_schedule.get(symbol, {}),
                'risk_assessment': {
                    'volatility_level': market_regime.get('volatility_regime', 'normal'),
                    'momentum_strength': market_regime.get('momentum_regime', 'weak'),
                    'market_stress': market_regime.get('market_stress', 0.5),
                    'liquidity_condition': market_regime.get('liquidity_score', 0.7),
                    'correlation_stability': not market_regime.get('correlation_breakdown', False)
                }
            },
            'optimization_recommendations': {
                'immediate_actions': self.get_immediate_actions(market_regime, strategy_config),
                'parameter_adjustments': self.dynamic_parameter_adjustment(symbol, market_regime, {}),
                'retraining_priority': 'high' if market_regime.get('correlation_breakdown', False) else 'normal',
                'monitoring_frequency': 'hourly' if market_regime.get('market_stress', 0) > 0.7 else 'daily'
            },
            'performance_targets': {
                'expected_r2_improvement': 0.05,
                'target_directional_accuracy': 0.65,
                'max_acceptable_drift': 0.10,
                'retraining_threshold': 0.30
            }
        }
        
        return report

    def get_immediate_actions(self, market_regime, strategy_config):
        """Get immediate actions based on current conditions"""
        actions = []
        
        if market_regime.get('market_stress', 0) > 0.8:
            actions.append('Reduce position sizes immediately')
            actions.append('Increase model update frequency to hourly')
        
        if market_regime.get('correlation_breakdown', False):
            actions.append('Switch to crisis mode strategy')
            actions.append('Prioritize conservative models')
        
        if strategy_config.get('position_sizing') == 'very_conservative':
            actions.append('Implement capital preservation mode')
        
        regime = market_regime.get('regime', 'sideways')
        if 'bull' in regime:
            actions.append('Consider increasing momentum exposure')
        elif 'bear' in regime:
            actions.append('Activate defensive positioning')
        
        return actions if actions else ['Continue current optimization schedule']

def main():
    """Test the Real-Time Optimizer"""
    if len(sys.argv) < 2:
        print("Usage: python real_time_optimizer.py <symbol>")
        sys.exit(1)
    
    symbol = sys.argv[1].upper()
    
    try:
        optimizer = RealTimeOptimizer()
        
        # Generate optimization report
        report = optimizer.generate_optimization_report(symbol)
        
        # Test specific functions
        market_regime = optimizer.detect_market_regime(symbol)
        strategy_config = optimizer.adaptive_strategy_selection(symbol, market_regime)
        
        result = {
            'success': True,
            'symbol': symbol,
            'optimization_report': report,
            'market_regime': market_regime,
            'strategy_config': strategy_config,
            'timestamp': datetime.now().isoformat()
        }
        
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e),
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        }))

if __name__ == "__main__":
    import sys
    main()
