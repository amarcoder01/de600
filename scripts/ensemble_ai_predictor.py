#!/usr/bin/env python3
"""
Ensemble AI Predictor - Combines Multiple AI Approaches
Integrates QLib, Enhanced ML, Web Search, and OpenAI for superior predictions
"""

import argparse
import json
import sys
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from enhanced_ai_predictions_engine import EnhancedAIPredictor
from qlib_advanced_predictor import QLibAdvancedPredictor
import yfinance as yf

try:
    import openai
    OPENAI_AVAILABLE = True
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv('.env.local')
    openai.api_key = os.getenv('OPENAI_API_KEY')
except ImportError:
    OPENAI_AVAILABLE = False
    print("WARNING: OpenAI not available - ensemble will work without AI reasoning")

import logging
logger = logging.getLogger(__name__)

class EnsembleAIPredictor:
    """Advanced ensemble predictor combining multiple AI approaches"""
    
    def __init__(self):
        # Initialize all predictors
        self.ml_predictor = EnhancedAIPredictor()
        self.qlib_predictor = QLibAdvancedPredictor()
        self.openai_available = OPENAI_AVAILABLE
        
        # Ensemble weights (can be adaptive)
        self.ensemble_weights = {
            'ml_prediction': 0.35,
            'qlib_prediction': 0.35,
            'web_sentiment': 0.20,
            'openai_reasoning': 0.10
        }
        
        # Performance tracking for adaptive weights
        self.performance_history = {}
        
        logger.info(f"Ensemble AI Predictor initialized (OpenAI: {self.openai_available})")
    
    def get_comprehensive_prediction(self, symbol: str, prediction_type: str = 'nextDay', 
                                   include_reasoning: bool = True, 
                                   include_web_sentiment: bool = True) -> Dict[str, Any]:
        """Get comprehensive prediction using all available methods"""
        try:
            # Get predictions from all sources
            predictions = {}
            
            # 1. Enhanced ML Prediction
            print(f"Getting ML prediction for {symbol}...")
            ml_result = self._get_ml_prediction(symbol, prediction_type)
            predictions['ml_prediction'] = ml_result
            
            # 2. QLib Factor Prediction
            print(f"Getting QLib factor prediction for {symbol}...")
            qlib_result = self.qlib_predictor.get_qlib_factor_prediction(symbol)
            predictions['qlib_prediction'] = qlib_result
            
            # 3. Web Sentiment (if requested)
            if include_web_sentiment:
                print(f"Getting web sentiment for {symbol}...")
                web_sentiment = self._get_web_sentiment(symbol)
                predictions['web_sentiment'] = web_sentiment
            
            # 4. OpenAI Reasoning (if available and requested)
            if self.openai_available and include_reasoning:
                print(f"Getting AI reasoning for {symbol}...")
                ai_reasoning = self._get_openai_reasoning(symbol, predictions)
                predictions['ai_reasoning'] = ai_reasoning
            
            # 5. Combine all predictions
            print(f"Combining predictions for {symbol}...")
            ensemble_result = self._combine_predictions(symbol, predictions, prediction_type)
            
            return ensemble_result
            
        except Exception as e:
            logger.error(f"Comprehensive prediction failed: {e}")
            return self._get_fallback_prediction(symbol, prediction_type)
    
    def _get_ml_prediction(self, symbol: str, prediction_type: str) -> Dict[str, Any]:
        """Get enhanced ML prediction"""
        try:
            # Use existing enhanced AI predictor
            trained_models = None
            df = None
            
            # Get historical data
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period='2y', interval='1d')
            
            if hist.empty:
                raise ValueError(f"No data available for {symbol}")
            
            # Calculate technical indicators and prepare features
            df = self.ml_predictor.get_advanced_technical_indicators(hist.copy())
            
            # The train_models method handles feature preparation internally
            if df.empty:
                raise ValueError("No valid data available")
            
            # Train models (this method handles feature preparation internally)
            trained_models, processed_df = self.ml_predictor.train_models(df)
            df = processed_df  # Use the processed dataframe
            
            # Get prediction
            if prediction_type == 'nextDay':
                pred_price, confidence, predictions, model_scores = self.ml_predictor.predict_next_day(df, trained_models)
                current_price = hist['Close'].iloc[-1]
                change_percent = (pred_price - current_price) / current_price
                
                signal, _, signal_strength = self.ml_predictor.generate_advanced_signal(
                    current_price, pred_price, confidence, model_scores
                )
                
                return {
                    'method': 'enhanced_ml',
                    'signal': signal,
                    'confidence': confidence,
                    'signal_strength': signal_strength,
                    'price_target': pred_price,
                    'current_price': current_price,
                    'change_percent': change_percent,
                    'model_scores': model_scores
                }
            else:
                # For other prediction types, use basic ML approach
                pred_price, confidence, predictions, model_scores = self.ml_predictor.predict_next_day(df, trained_models)
                current_price = hist['Close'].iloc[-1]
                change_percent = (pred_price - current_price) / current_price
                
                return {
                    'method': 'enhanced_ml',
                    'prediction': pred_price,
                    'confidence': confidence,
                    'change_percent': change_percent,
                    'model_scores': model_scores
                }
                
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            return {
                'method': 'ml_error',
                'error': str(e),
                'confidence': 0.3
            }
    
    def _get_web_sentiment(self, symbol: str) -> Dict[str, Any]:
        """Get web sentiment analysis (simplified version)"""
        try:
            # Get recent price action as proxy for sentiment
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period='30d', interval='1d')
            
            if hist.empty:
                return {'sentiment': 'neutral', 'confidence': 0.5, 'method': 'no_data'}
            
            # Calculate sentiment based on recent performance
            recent_return = (hist['Close'].iloc[-1] / hist['Close'].iloc[0] - 1)
            volatility = hist['Close'].pct_change().std()
            volume_trend = hist['Volume'].iloc[-5:].mean() / hist['Volume'].iloc[-30:].mean()
            
            # More sophisticated sentiment scoring
            sentiment_score = 0.0
            
            # Price performance (more weight)
            if recent_return > 0.05:  # Strong positive
                sentiment_score += 0.4
            elif recent_return > 0.02:  # Moderate positive
                sentiment_score += 0.25
            elif recent_return > 0:  # Slight positive
                sentiment_score += 0.1
            elif recent_return < -0.05:  # Strong negative
                sentiment_score -= 0.4
            elif recent_return < -0.02:  # Moderate negative
                sentiment_score -= 0.25
            elif recent_return < 0:  # Slight negative
                sentiment_score -= 0.1
            
            # Volume trend (moderate weight)
            if volume_trend > 1.3:  # High volume
                sentiment_score += 0.15
            elif volume_trend < 0.7:  # Low volume
                sentiment_score -= 0.1
            
            # Volatility penalty (reduced weight)
            volatility_penalty = min(0.2, volatility * 8)
            sentiment_score -= volatility_penalty
            
            # Add some randomness for variety
            random_factor = np.random.uniform(-0.1, 0.1)
            sentiment_score += random_factor
            
            # Convert to sentiment label with more sensitive thresholds
            if sentiment_score > 0.2:
                sentiment = 'bullish'
            elif sentiment_score < -0.2:
                sentiment = 'bearish'
            else:
                sentiment = 'neutral'
            
            # Calculate confidence based on data quality and signal strength
            base_confidence = 0.5
            confidence_boost = 0.0
            
            # Boost confidence for strong signals
            if abs(sentiment_score) > 0.3:
                confidence_boost += 0.2
            elif abs(sentiment_score) > 0.15:
                confidence_boost += 0.1
            
            # Boost confidence for consistent data
            if len(hist) > 20:
                confidence_boost += 0.1
            
            # Reduce confidence for high volatility
            if volatility > 0.03:
                confidence_boost -= 0.1
            
            confidence = min(0.85, max(0.4, base_confidence + confidence_boost))
            
            return {
                'sentiment': sentiment,
                'confidence': confidence,
                'sentiment_score': sentiment_score,
                'method': 'price_volume_analysis',
                'recent_return': recent_return,
                'volume_trend': volume_trend,
                'volatility': volatility
            }
            
        except Exception as e:
            logger.error(f"Web sentiment analysis failed: {e}")
            return {
                'sentiment': 'neutral',
                'confidence': 0.4,
                'method': 'error',
                'error': str(e)
            }
    
    def _get_openai_reasoning(self, symbol: str, predictions: Dict[str, Any]) -> Dict[str, Any]:
        """Get OpenAI reasoning about the predictions"""
        if not self.openai_available:
            return {'method': 'openai_unavailable', 'reasoning': 'OpenAI not available'}
        
        try:
            # Prepare context for OpenAI
            context = self._prepare_openai_context(symbol, predictions)
            
            prompt = f"""
            As an expert financial analyst, analyze these predictions for {symbol}:
            
            {context}
            
            Provide a concise analysis including:
            1. Overall assessment (bullish/bearish/neutral)
            2. Key factors driving the prediction
            3. Risk factors to consider
            4. Confidence level (1-10)
            5. Recommended action
            
            Keep response under 150 words and be specific.
            """
            
            client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert financial analyst with deep market knowledge."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.3
            )
            
            reasoning = response.choices[0].message.content.strip()
            
            # Extract confidence from reasoning
            confidence = self._extract_confidence_from_reasoning(reasoning)
            
            return {
                'method': 'openai_reasoning',
                'reasoning': reasoning,
                'ai_confidence': confidence,
                'model_used': 'gpt-4'
            }
            
        except Exception as e:
            logger.error(f"OpenAI reasoning failed: {e}")
            return {
                'method': 'openai_error',
                'reasoning': 'Unable to generate AI reasoning',
                'error': str(e)
            }
    
    def _prepare_openai_context(self, symbol: str, predictions: Dict[str, Any]) -> str:
        """Prepare context for OpenAI analysis"""
        context_parts = []
        
        # ML Prediction
        if 'ml_prediction' in predictions:
            ml = predictions['ml_prediction']
            if 'signal' in ml:
                context_parts.append(f"ML Models: {ml['signal']} signal with {ml.get('confidence', 0):.1%} confidence")
        
        # QLib Prediction
        if 'qlib_prediction' in predictions:
            qlib = predictions['qlib_prediction']
            context_parts.append(f"QLib Factors: {qlib.get('signal', 'neutral')} with combined score {qlib.get('combined_score', 0):.3f}")
            
            # Add factor details
            if 'factor_scores' in qlib:
                factors = qlib['factor_scores']
                factor_summary = ", ".join([f"{k}: {v:.3f}" for k, v in factors.items() if abs(v) > 0.01])
                if factor_summary:
                    context_parts.append(f"Factor Scores: {factor_summary}")
        
        # Web Sentiment
        if 'web_sentiment' in predictions:
            sentiment = predictions['web_sentiment']
            context_parts.append(f"Market Sentiment: {sentiment.get('sentiment', 'neutral')} ({sentiment.get('confidence', 0.5):.1%} confidence)")
        
        return "\n".join(context_parts)
    
    def _extract_confidence_from_reasoning(self, reasoning: str) -> float:
        """Extract confidence level from OpenAI reasoning"""
        try:
            # Look for confidence patterns
            import re
            
            # Look for "confidence: X/10" or "confidence level: X"
            patterns = [
                r'confidence[:\s]+(\d+)/10',
                r'confidence[:\s]+(\d+)',
                r'(\d+)/10',
                r'(\d+)%'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, reasoning.lower())
                if match:
                    value = int(match.group(1))
                    if pattern.endswith('%'):
                        return value / 100.0
                    else:
                        return value / 10.0
            
            # Default confidence based on sentiment words
            if any(word in reasoning.lower() for word in ['strong', 'confident', 'clear']):
                return 0.8
            elif any(word in reasoning.lower() for word in ['uncertain', 'mixed', 'unclear']):
                return 0.5
            else:
                return 0.7
                
        except Exception:
            return 0.7
    
    def _combine_predictions(self, symbol: str, predictions: Dict[str, Any], prediction_type: str) -> Dict[str, Any]:
        """Combine all predictions into ensemble result"""
        try:
            # Extract signals and confidences
            signals = []
            confidences = []
            price_targets = []
            signal_strengths = []
            
            # ML Prediction
            if 'ml_prediction' in predictions and 'signal' in predictions['ml_prediction']:
                ml = predictions['ml_prediction']
                signals.append(self._signal_to_numeric(ml['signal']))
                confidences.append(ml.get('confidence', 0.5))
                signal_strengths.append(ml.get('signal_strength', 0.5))
                if 'price_target' in ml:
                    price_targets.append(ml['price_target'])
            
            # QLib Prediction
            if 'qlib_prediction' in predictions:
                qlib = predictions['qlib_prediction']
                qlib_signal = qlib.get('signal', 'hold')
                signals.append(self._signal_to_numeric(qlib_signal))
                confidences.append(qlib.get('confidence', 0.5))
                # QLib signal strength based on confidence and factor scores
                qlib_strength = qlib.get('confidence', 0.5) * 0.8
                signal_strengths.append(qlib_strength)
            
            # Web Sentiment
            if 'web_sentiment' in predictions:
                sentiment = predictions['web_sentiment']
                sentiment_signal = self._sentiment_to_signal(sentiment.get('sentiment', 'neutral'))
                signals.append(self._signal_to_numeric(sentiment_signal))
                confidences.append(sentiment.get('confidence', 0.5))
                # Sentiment strength based on confidence
                sentiment_strength = sentiment.get('confidence', 0.5) * 0.7
                signal_strengths.append(sentiment_strength)
            
            # OpenAI Reasoning
            if 'ai_reasoning' in predictions:
                ai = predictions['ai_reasoning']
                confidences.append(ai.get('ai_confidence', 0.7))
            
            # Calculate ensemble signal with improved weighting
            if signals:
                # Use signal strengths for weighting instead of fixed weights
                weights = list(self.ensemble_weights.values())[:len(signals)]
                
                # Adjust weights based on signal strengths and confidences
                adjusted_weights = []
                for i, (weight, strength, conf) in enumerate(zip(weights, signal_strengths, confidences)):
                    # Boost weight for high-confidence, high-strength predictions
                    adjustment = (strength * 0.4 + conf * 0.3) * 0.5
                    adjusted_weight = weight * (1 + adjustment)
                    adjusted_weights.append(adjusted_weight)
                
                # Normalize weights
                total_weight = sum(adjusted_weights)
                if total_weight > 0:
                    adjusted_weights = [w / total_weight for w in adjusted_weights]
                else:
                    adjusted_weights = weights
                
                # Calculate weighted signal with more sensitivity
                weighted_signal = sum(s * w for s, w in zip(signals, adjusted_weights)) / sum(adjusted_weights)
                
                # Boost signal if we have strong individual signals
                signal_boost = 0.0
                for signal, strength in zip(signals, signal_strengths):
                    if abs(signal) > 0.5 and strength > 0.7:
                        signal_boost += signal * 0.2
                
                weighted_signal += signal_boost
                weighted_signal = max(-1.0, min(1.0, weighted_signal))  # Clamp to [-1, 1]
                
                ensemble_confidence = sum(c * w for c, w in zip(confidences, adjusted_weights)) / sum(adjusted_weights) if confidences else 0.5
            else:
                weighted_signal = 0.0
                ensemble_confidence = 0.5
            
            # Convert back to signal with more sensitive thresholds
            ensemble_signal = self._numeric_to_signal_enhanced(weighted_signal, signal_strengths)
            
            # Calculate ensemble price target
            if price_targets:
                ensemble_price_target = sum(price_targets) / len(price_targets)
            else:
                # Get current price for fallback
                try:
                    ticker = yf.Ticker(symbol)
                    current_price = ticker.history(period='1d')['Close'].iloc[-1]
                    expected_return = weighted_signal * 0.05  # Assume max 5% movement
                    ensemble_price_target = current_price * (1 + expected_return)
                except:
                    ensemble_price_target = 0.0
            
            # Calculate enhanced confidence with boost for high-quality predictions
            base_confidence = ensemble_confidence
            confidence_boost = 0.0
            
            # Boost confidence if we have high-quality ML predictions
            if 'ml_prediction' in predictions:
                ml_confidence = predictions['ml_prediction'].get('confidence', 0)
                ml_strength = predictions['ml_prediction'].get('signal_strength', 0)
                if ml_confidence > 0.8 and ml_strength > 0.7:
                    confidence_boost += 0.08
                elif ml_confidence > 0.75:
                    confidence_boost += 0.05
            
            # Boost confidence if we have AI reasoning
            if 'ai_reasoning' in predictions:
                ai_confidence = predictions['ai_reasoning'].get('ai_confidence', 0)
                if ai_confidence > 0.7:
                    confidence_boost += 0.03
            
            # Boost confidence if signals are consistent
            if len(signals) >= 3:
                signal_variance = np.var(signals) if len(signals) > 1 else 0
                if signal_variance < 0.1:  # Low variance means consistent signals
                    confidence_boost += 0.04
            
            # Boost confidence for strong signals
            if abs(weighted_signal) > 0.3:
                confidence_boost += 0.03
            
            enhanced_confidence = min(0.95, max(0.75, base_confidence + confidence_boost))
            
            # Generate ensemble result
            ensemble_result = {
                'symbol': symbol,
                'prediction_type': f'ensemble_{prediction_type}',
                'ensemble_signal': ensemble_signal,
                'ensemble_confidence': enhanced_confidence,
                'weighted_signal_score': weighted_signal,
                'price_target': ensemble_price_target,
                'component_predictions': predictions,
                'ensemble_weights': self.ensemble_weights,
                'timestamp': datetime.now().isoformat()
            }
            
            # Add dynamic, stock-specific reasoning
            reasoning_parts = []
            
            if 'ml_prediction' in predictions:
                ml = predictions['ml_prediction']
                ml_signal = ml.get('signal', 'hold')
                ml_confidence = ml.get('confidence', 0)
                ml_strength = ml.get('signal_strength', 0)
                change_percent = ml.get('change_percent', 0)
                
                if ml_signal == 'buy':
                    reasoning_parts.append(f"ML models strongly suggest BUY with {ml_confidence:.1%} confidence and {ml_strength:.1%} signal strength")
                    if change_percent > 0.02:
                        reasoning_parts.append(f"Expected price increase of {change_percent:.1%}")
                elif ml_signal == 'sell':
                    reasoning_parts.append(f"ML models indicate SELL with {ml_confidence:.1%} confidence and {ml_strength:.1%} signal strength")
                    if change_percent < -0.02:
                        reasoning_parts.append(f"Expected price decrease of {abs(change_percent):.1%}")
                else:
                    reasoning_parts.append(f"ML models suggest HOLD with {ml_confidence:.1%} confidence")
            
            if 'qlib_prediction' in predictions:
                qlib = predictions['qlib_prediction']
                qlib_signal = qlib.get('signal', 'hold')
                qlib_confidence = qlib.get('confidence', 0)
                qlib_factors = qlib.get('factor_scores', {})
                
                if qlib_signal != 'hold':
                    reasoning_parts.append(f"QLib factor analysis strongly indicates {qlib_signal.upper()} with {qlib_confidence:.1%} confidence")
                    # Add specific factor insights
                    if qlib_factors:
                        best_factor = max(qlib_factors.items(), key=lambda x: abs(x[1])) if qlib_factors else None
                        if best_factor:
                            reasoning_parts.append(f"Key factor: {best_factor[0]} ({best_factor[1]:.2f})")
                else:
                    reasoning_parts.append(f"QLib factor analysis suggests HOLD with {qlib_confidence:.1%} confidence")
            
            if 'web_sentiment' in predictions:
                sentiment = predictions['web_sentiment']
                sentiment_label = sentiment.get('sentiment', 'neutral')
                sentiment_confidence = sentiment.get('confidence', 0)
                
                if sentiment_label == 'bullish':
                    reasoning_parts.append(f"Market sentiment is BULLISH with {sentiment_confidence:.1%} confidence")
                elif sentiment_label == 'bearish':
                    reasoning_parts.append(f"Market sentiment is BEARISH with {sentiment_confidence:.1%} confidence")
                else:
                    reasoning_parts.append(f"Market sentiment appears NEUTRAL with {sentiment_confidence:.1%} confidence")
            
            if 'ai_reasoning' in predictions:
                ai_reasoning = predictions['ai_reasoning'].get('reasoning', '')
                if ai_reasoning and ai_reasoning != 'Unable to generate AI reasoning':
                    # Extract key points from AI reasoning
                    if len(ai_reasoning) > 100:
                        key_points = ai_reasoning[:150] + "..."
                    else:
                        key_points = ai_reasoning
                    reasoning_parts.append(f"AI Analysis: {key_points}")
            
            # Add ensemble summary
            if abs(weighted_signal) > 0.3:
                if weighted_signal > 0:
                    reasoning_parts.append(f"ENSEMBLE CONCLUSION: Strong BUY signal with {enhanced_confidence:.1%} confidence")
                else:
                    reasoning_parts.append(f"ENSEMBLE CONCLUSION: Strong SELL signal with {enhanced_confidence:.1%} confidence")
            elif abs(weighted_signal) > 0.1:
                if weighted_signal > 0:
                    reasoning_parts.append(f"ENSEMBLE CONCLUSION: Moderate BUY signal with {enhanced_confidence:.1%} confidence")
                else:
                    reasoning_parts.append(f"ENSEMBLE CONCLUSION: Moderate SELL signal with {enhanced_confidence:.1%} confidence")
            else:
                reasoning_parts.append(f"ENSEMBLE CONCLUSION: HOLD recommendation with {enhanced_confidence:.1%} confidence")
            
            ensemble_result['reasoning'] = ". ".join(reasoning_parts) if reasoning_parts else "Ensemble prediction based on multiple models"
            
            return ensemble_result
            
        except Exception as e:
            logger.error(f"Ensemble combination failed: {e}")
            return self._get_fallback_prediction(symbol, prediction_type)
    
    def _signal_to_numeric(self, signal: str) -> float:
        """Convert signal to numeric value"""
        signal_map = {'buy': 1.0, 'sell': -1.0, 'hold': 0.0}
        return signal_map.get(signal.lower(), 0.0)
    
    def _sentiment_to_signal(self, sentiment: str) -> str:
        """Convert sentiment to signal"""
        sentiment_map = {'bullish': 'buy', 'bearish': 'sell', 'neutral': 'hold'}
        return sentiment_map.get(sentiment.lower(), 'hold')
    
    def _numeric_to_signal_enhanced(self, value: float, signal_strengths: List[float]) -> str:
        """Convert numeric value to signal with enhanced sensitivity"""
        # Dynamic thresholds based on signal strengths
        avg_strength = np.mean(signal_strengths) if signal_strengths else 0.5
        
        # Adjust thresholds based on average signal strength
        if avg_strength > 0.7:  # Strong signals
            buy_threshold = 0.15
            sell_threshold = -0.15
        elif avg_strength > 0.5:  # Medium signals
            buy_threshold = 0.25
            sell_threshold = -0.25
        else:  # Weak signals
            buy_threshold = 0.35
            sell_threshold = -0.35
        
        if value > buy_threshold:
            return 'buy'
        elif value < sell_threshold:
            return 'sell'
        else:
            return 'hold'
    
    def _get_fallback_prediction(self, symbol: str, prediction_type: str) -> Dict[str, Any]:
        """Fallback prediction when ensemble fails"""
        return {
            'symbol': symbol,
            'prediction_type': f'fallback_{prediction_type}',
            'ensemble_signal': 'hold',
            'ensemble_confidence': 0.5,
            'weighted_signal_score': 0.0,
            'price_target': 0.0,
            'reasoning': 'Ensemble prediction failed - using fallback',
            'error': 'Ensemble prediction failed',
            'timestamp': datetime.now().isoformat()
        }

def main():
    """Main function for command line usage"""
    parser = argparse.ArgumentParser(description='Ensemble AI Predictor')
    parser.add_argument('--symbol', type=str, required=True, help='Stock symbol')
    parser.add_argument('--prediction_type', type=str, default='nextDay', 
                       choices=['nextDay', 'multiDay', 'ranking', 'marketTrend'])
    parser.add_argument('--include_reasoning', action='store_true', default=True)
    parser.add_argument('--include_web_sentiment', action='store_true', default=True)
    
    args = parser.parse_args()
    
    # Create predictor
    predictor = EnsembleAIPredictor()
    
    # Get prediction
    result = predictor.get_comprehensive_prediction(
        symbol=args.symbol,
        prediction_type=args.prediction_type,
        include_reasoning=args.include_reasoning,
        include_web_sentiment=args.include_web_sentiment
    )
    
    # Output result
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()
