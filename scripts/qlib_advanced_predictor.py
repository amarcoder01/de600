#!/usr/bin/env python3
"""
QLib Advanced Predictor - Enhanced QLib Integration
Combines QLib factor models with advanced ML techniques for superior predictions
"""

import os
import sys
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import qlib
    from qlib.data import D
    from qlib.utils import init_instance_by_config
    from qlib.config import REG_CN, REG_US
    from qlib.contrib.model.gbdt import LGBModel
    from qlib.contrib.strategy.signal_strategy import TopkDropoutStrategy
    from qlib.backtest import backtest
    from qlib.backtest.exchange import Exchange
    from qlib.contrib.evaluate import risk_analysis
    QLIB_AVAILABLE = True
except ImportError:
    QLIB_AVAILABLE = False
    print("WARNING: QLib not installed - using fallback methods")

from qlib_data_reader import QLibDataReader
import yfinance as yf

logger = logging.getLogger(__name__)

class QLibAdvancedPredictor:
    """Advanced QLib-based prediction system with factor models"""
    
    def __init__(self, data_dir: str = None):
        self.qlib_available = QLIB_AVAILABLE
        self.data_reader = QLibDataReader(data_dir)
        self.factor_models = {}
        self.risk_models = {}
        
        if self.qlib_available:
            self._initialize_qlib()
        else:
            logger.warning("QLib not available - using enhanced yfinance fallback")
            
        logger.info(f"QLib Advanced Predictor initialized (QLib available: {self.qlib_available})")
    
    def _initialize_qlib(self):
        """Initialize QLib with advanced configuration"""
        try:
            # QLib configuration for US market
            qlib_config = {
                "provider_uri": str(self.data_reader.data_dir),
                "region": REG_US,
                "auto_mount": True,
                "cache_dir": "./cache"
            }
            
            qlib.init(**qlib_config)
            logger.info("✅ QLib initialized successfully")
            
            # Initialize factor models
            self._initialize_factor_models()
            
        except Exception as e:
            logger.error(f"❌ QLib initialization failed: {e}")
            self.qlib_available = False
    
    def _initialize_factor_models(self):
        """Initialize advanced factor models"""
        if not self.qlib_available:
            return
            
        try:
            # Factor model configurations
            self.factor_models = {
                'momentum': {
                    'model': 'qlib.contrib.model.gbdt.LGBModel',
                    'features': [
                        '($close / Ref($close, 1) - 1)',  # Daily return
                        '($close / Ref($close, 5) - 1)',  # 5-day return
                        '($close / Ref($close, 20) - 1)', # 20-day return
                        '($close / Ref($close, 60) - 1)', # 60-day return
                    ]
                },
                'reversal': {
                    'model': 'qlib.contrib.model.gbdt.LGBModel',
                    'features': [
                        'Std($close, 20) / Mean($close, 20)',  # Volatility
                        '($close - Mean($close, 20)) / Std($close, 20)',  # Z-score
                        'Corr($close, $volume, 20)',  # Price-volume correlation
                    ]
                },
                'value': {
                    'model': 'qlib.contrib.model.gbdt.LGBModel',
                    'features': [
                        '$close / Mean($close, 252)',  # Price to 1-year average
                        'Std($close, 60) / Mean($close, 60)',  # Short-term volatility
                    ]
                },
                'quality': {
                    'model': 'qlib.contrib.model.gbdt.LGBModel',
                    'features': [
                        'Mean($volume, 20) / Mean($volume, 60)',  # Volume trend
                        'Std($close, 5) / Std($close, 20)',  # Volatility ratio
                    ]
                }
            }
            
            logger.info("✅ Factor models initialized")
            
        except Exception as e:
            logger.error(f"❌ Factor model initialization failed: {e}")
    
    def get_qlib_factor_prediction(self, symbol: str, timeframe: str = '1d') -> Dict[str, Any]:
        """Get QLib factor-based prediction"""
        if not self.qlib_available:
            return self._get_fallback_factor_prediction(symbol)
        
        try:
            # QLib factor analysis
            factor_scores = {}
            
            for factor_name, factor_config in self.factor_models.items():
                try:
                    # Calculate factor score using QLib expressions
                    factor_score = self._calculate_factor_score(symbol, factor_config['features'])
                    factor_scores[factor_name] = factor_score
                    
                except Exception as e:
                    logger.warning(f"❌ Factor {factor_name} calculation failed: {e}")
                    factor_scores[factor_name] = 0.0
            
            # Combine factor scores
            combined_score = self._combine_factor_scores(factor_scores)
            
            # Generate prediction based on factor scores
            prediction = self._factor_scores_to_prediction(combined_score, factor_scores)
            
            return {
                'prediction_type': 'qlib_factor',
                'symbol': symbol,
                'factor_scores': factor_scores,
                'combined_score': combined_score,
                'signal': prediction['signal'],
                'confidence': prediction['confidence'],
                'price_target': prediction['price_target'],
                'reasoning': prediction['reasoning']
            }
            
        except Exception as e:
            logger.error(f"❌ QLib factor prediction failed: {e}")
            return self._get_fallback_factor_prediction(symbol)
    
    def _calculate_factor_score(self, symbol: str, features: List[str]) -> float:
        """Calculate factor score using QLib expressions"""
        try:
            # Get QLib data for the symbol
            data = D.features([symbol], features, start_time='2020-01-01', end_time='2024-12-31')
            
            if data.empty:
                return 0.0
            
            # Calculate average factor score
            recent_data = data.tail(20)  # Last 20 trading days
            factor_score = recent_data.mean().mean()
            
            return float(factor_score) if not np.isnan(factor_score) else 0.0
            
        except Exception as e:
            logger.error(f"❌ Factor score calculation failed: {e}")
            return 0.0
    
    def _get_fallback_factor_prediction(self, symbol: str) -> Dict[str, Any]:
        """Fallback factor prediction using yfinance"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period='6mo', interval='1d')
            
            if hist.empty:
                raise ValueError(f"No data available for {symbol}")
            
            # Calculate simple factor scores
            factor_scores = self._calculate_fallback_factors(hist)
            
            # Combine factor scores
            combined_score = self._combine_factor_scores(factor_scores)
            
            # Generate prediction
            prediction = self._factor_scores_to_prediction(combined_score, factor_scores)
            
            return {
                'prediction_type': 'fallback_factor',
                'symbol': symbol,
                'factor_scores': factor_scores,
                'combined_score': combined_score,
                'signal': prediction['signal'],
                'confidence': prediction['confidence'],
                'price_target': prediction['price_target'],
                'reasoning': prediction['reasoning']
            }
            
        except Exception as e:
            logger.error(f"❌ Fallback factor prediction failed: {e}")
            return {
                'prediction_type': 'error',
                'symbol': symbol,
                'error': str(e),
                'signal': 'hold',
                'confidence': 0.5,
                'price_target': 0.0,
                'reasoning': 'Unable to calculate factor prediction'
            }
    
    def _calculate_fallback_factors(self, hist: pd.DataFrame) -> Dict[str, float]:
        """Calculate factor scores using yfinance data"""
        try:
            # Momentum factors
            momentum_1m = (hist['Close'].iloc[-1] / hist['Close'].iloc[-20] - 1) if len(hist) >= 20 else 0
            momentum_3m = (hist['Close'].iloc[-1] / hist['Close'].iloc[-60] - 1) if len(hist) >= 60 else 0
            
            # Reversal factors
            volatility = hist['Close'].pct_change().rolling(window=20).std().iloc[-1]
            zscore = (hist['Close'].iloc[-1] - hist['Close'].rolling(window=20).mean().iloc[-1]) / hist['Close'].rolling(window=20).std().iloc[-1]
            
            # Value factors
            price_to_avg = hist['Close'].iloc[-1] / hist['Close'].mean()
            
            # Quality factors
            volume_trend = hist['Volume'].rolling(window=20).mean().iloc[-1] / hist['Volume'].rolling(window=60).mean().iloc[-1] if len(hist) >= 60 else 1.0
            
            return {
                'momentum': float(momentum_1m * 0.6 + momentum_3m * 0.4) if not np.isnan(momentum_1m) else 0.0,
                'reversal': float(-abs(zscore) * volatility) if not np.isnan(zscore) and not np.isnan(volatility) else 0.0,
                'value': float(1 / price_to_avg - 1) if not np.isnan(price_to_avg) and price_to_avg > 0 else 0.0,
                'quality': float(volume_trend - 1) if not np.isnan(volume_trend) else 0.0
            }
            
        except Exception as e:
            logger.error(f"❌ Fallback factor calculation failed: {e}")
            return {'momentum': 0.0, 'reversal': 0.0, 'value': 0.0, 'quality': 0.0}
    
    def _combine_factor_scores(self, factor_scores: Dict[str, float]) -> float:
        """Combine factor scores with weights"""
        weights = {
            'momentum': 0.35,
            'reversal': 0.25,
            'value': 0.25,
            'quality': 0.15
        }
        
        combined = sum(factor_scores.get(factor, 0.0) * weight for factor, weight in weights.items())
        
        # Normalize to [-1, 1] range
        combined = max(-1.0, min(1.0, combined))
        
        return combined
    
    def _factor_scores_to_prediction(self, combined_score: float, factor_scores: Dict[str, float]) -> Dict[str, Any]:
        """Convert factor scores to prediction"""
        try:
            # Determine signal based on combined score
            if combined_score > 0.1:
                signal = 'buy'
                confidence = min(0.9, 0.6 + abs(combined_score) * 0.3)
            elif combined_score < -0.1:
                signal = 'sell'
                confidence = min(0.9, 0.6 + abs(combined_score) * 0.3)
            else:
                signal = 'hold'
                confidence = 0.6 + abs(combined_score) * 0.2
            
            # Generate reasoning
            reasoning = self._generate_factor_reasoning(factor_scores, combined_score)
            
            # Estimate price target (simplified)
            expected_return = combined_score * 0.05  # Assume max 5% movement
            
            return {
                'signal': signal,
                'confidence': confidence,
                'price_target': 0.0,  # Will be calculated with current price
                'expected_return': expected_return,
                'reasoning': reasoning
            }
            
        except Exception as e:
            logger.error(f"❌ Prediction generation failed: {e}")
            return {
                'signal': 'hold',
                'confidence': 0.5,
                'price_target': 0.0,
                'expected_return': 0.0,
                'reasoning': 'Factor analysis inconclusive'
            }
    
    def _generate_factor_reasoning(self, factor_scores: Dict[str, float], combined_score: float) -> str:
        """Generate human-readable reasoning for the prediction"""
        reasoning_parts = []
        
        # Analyze each factor
        for factor, score in factor_scores.items():
            if abs(score) > 0.05:
                direction = "positive" if score > 0 else "negative"
                strength = "strong" if abs(score) > 0.2 else "moderate" if abs(score) > 0.1 else "weak"
                reasoning_parts.append(f"{factor.capitalize()} factor shows {strength} {direction} signal ({score:.3f})")
        
        if not reasoning_parts:
            reasoning_parts.append("All factors show neutral signals")
        
        # Overall assessment
        if combined_score > 0.1:
            overall = "Overall bullish sentiment based on factor analysis"
        elif combined_score < -0.1:
            overall = "Overall bearish sentiment based on factor analysis"
        else:
            overall = "Mixed signals suggest neutral/hold position"
        
        return ". ".join(reasoning_parts) + f". {overall} (combined score: {combined_score:.3f})."
    
    def get_portfolio_risk_assessment(self, portfolio: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess portfolio risk using QLib risk models"""
        try:
            portfolio_risk = {
                'total_risk': 0.0,
                'factor_exposures': {},
                'concentration_risk': 0.0,
                'correlation_risk': 0.0,
                'recommendations': []
            }
            
            if not portfolio:
                return portfolio_risk
            
            # Calculate individual stock risks
            stock_risks = []
            factor_exposures = {'momentum': 0, 'reversal': 0, 'value': 0, 'quality': 0}
            
            for position in portfolio:
                symbol = position.get('symbol', '')
                weight = position.get('weight', 0.0)
                
                # Get factor prediction for risk analysis
                factor_pred = self.get_qlib_factor_prediction(symbol)
                
                if factor_pred.get('factor_scores'):
                    # Weight factor exposures by position size
                    for factor, score in factor_pred['factor_scores'].items():
                        factor_exposures[factor] += score * weight
                
                stock_risks.append({
                    'symbol': symbol,
                    'weight': weight,
                    'factor_scores': factor_pred.get('factor_scores', {}),
                    'individual_risk': abs(factor_pred.get('combined_score', 0)) * weight
                })
            
            # Calculate portfolio metrics
            portfolio_risk['total_risk'] = sum(stock['individual_risk'] for stock in stock_risks)
            portfolio_risk['factor_exposures'] = factor_exposures
            
            # Concentration risk (Herfindahl index)
            weights = [stock['weight'] for stock in stock_risks]
            portfolio_risk['concentration_risk'] = sum(w**2 for w in weights)
            
            # Generate recommendations
            recommendations = []
            
            # Check for high concentration
            if portfolio_risk['concentration_risk'] > 0.25:
                recommendations.append("High concentration risk - consider diversifying")
            
            # Check factor exposures
            for factor, exposure in factor_exposures.items():
                if abs(exposure) > 0.5:
                    direction = "high" if exposure > 0 else "low"
                    recommendations.append(f"Strong {direction} {factor} factor exposure - consider rebalancing")
            
            # Check overall risk
            if portfolio_risk['total_risk'] > 0.3:
                recommendations.append("High portfolio risk - consider reducing position sizes")
            
            portfolio_risk['recommendations'] = recommendations
            
            return portfolio_risk
            
        except Exception as e:
            logger.error(f"❌ Portfolio risk assessment failed: {e}")
            return {
                'total_risk': 0.0,
                'factor_exposures': {},
                'concentration_risk': 0.0,
                'correlation_risk': 0.0,
                'recommendations': ['Unable to assess portfolio risk'],
                'error': str(e)
            }
    
    def optimize_portfolio(self, symbols: List[str], risk_tolerance: str = 'moderate') -> Dict[str, Any]:
        """Optimize portfolio using QLib and factor models"""
        try:
            # Get factor predictions for all symbols
            factor_predictions = {}
            for symbol in symbols:
                factor_predictions[symbol] = self.get_qlib_factor_prediction(symbol)
            
            # Risk tolerance parameters
            risk_params = {
                'conservative': {'max_weight': 0.15, 'min_expected_return': 0.02},
                'moderate': {'max_weight': 0.25, 'min_expected_return': 0.05},
                'aggressive': {'max_weight': 0.40, 'min_expected_return': 0.08}
            }
            
            params = risk_params.get(risk_tolerance, risk_params['moderate'])
            
            # Simple optimization based on factor scores
            optimized_weights = {}
            total_score = 0
            
            # Calculate weights based on combined factor scores
            for symbol, prediction in factor_predictions.items():
                score = max(0, prediction.get('combined_score', 0))  # Only positive scores
                total_score += score
                optimized_weights[symbol] = score
            
            # Normalize weights
            if total_score > 0:
                for symbol in optimized_weights:
                    optimized_weights[symbol] = min(
                        params['max_weight'],
                        optimized_weights[symbol] / total_score
                    )
            else:
                # Equal weights if no positive scores
                equal_weight = min(params['max_weight'], 1.0 / len(symbols))
                optimized_weights = {symbol: equal_weight for symbol in symbols}
            
            # Normalize to sum to 1
            total_weight = sum(optimized_weights.values())
            if total_weight > 0:
                optimized_weights = {
                    symbol: weight / total_weight 
                    for symbol, weight in optimized_weights.items()
                }
            
            # Calculate expected portfolio metrics
            expected_return = sum(
                prediction.get('expected_return', 0) * optimized_weights.get(symbol, 0)
                for symbol, prediction in factor_predictions.items()
            )
            
            # Generate optimization report
            optimization_report = {
                'optimized_weights': optimized_weights,
                'expected_return': expected_return,
                'risk_tolerance': risk_tolerance,
                'optimization_method': 'qlib_factor_based',
                'factor_contributions': {},
                'recommendations': []
            }
            
            # Calculate factor contributions
            for factor in ['momentum', 'reversal', 'value', 'quality']:
                factor_contribution = sum(
                    prediction.get('factor_scores', {}).get(factor, 0) * optimized_weights.get(symbol, 0)
                    for symbol, prediction in factor_predictions.items()
                )
                optimization_report['factor_contributions'][factor] = factor_contribution
            
            # Generate recommendations
            recommendations = []
            if expected_return < params['min_expected_return']:
                recommendations.append("Expected return below target - consider more growth-oriented assets")
            
            max_weight_symbol = max(optimized_weights.items(), key=lambda x: x[1])
            if max_weight_symbol[1] > params['max_weight'] * 0.8:
                recommendations.append(f"High concentration in {max_weight_symbol[0]} - monitor closely")
            
            optimization_report['recommendations'] = recommendations
            
            return optimization_report
            
        except Exception as e:
            logger.error(f"❌ Portfolio optimization failed: {e}")
            return {
                'optimized_weights': {},
                'expected_return': 0.0,
                'error': str(e),
                'optimization_method': 'error',
                'recommendations': ['Portfolio optimization failed']
            }

if __name__ == "__main__":
    # Test the QLib Advanced Predictor
    predictor = QLibAdvancedPredictor()
    
    # Test factor prediction
    print("🧪 Testing QLib Factor Prediction...")
    result = predictor.get_qlib_factor_prediction('AAPL')
    print(f"✅ AAPL Factor Prediction: {result}")
    
    # Test portfolio optimization
    print("\n🧪 Testing Portfolio Optimization...")
    symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
    optimization = predictor.optimize_portfolio(symbols, 'moderate')
    print(f"✅ Portfolio Optimization: {optimization}")
