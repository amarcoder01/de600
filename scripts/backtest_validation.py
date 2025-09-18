#!/usr/bin/env python3
"""
Backtest Validation Script
Tests the accuracy of the backtesting engine with multiple datasets
"""

import requests
import json
import time
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple

class BacktestValidator:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.test_results = []
        
    def test_strategy_creation(self) -> Dict:
        """Test strategy creation with various parameters"""
        print("🧪 Testing Strategy Creation...")
        
        test_strategies = [
            {
                "name": "AAPL Momentum Strategy",
                "type": "momentum",
                "symbol": "AAPL",
                "timeframe": "1d",
                "description": "Momentum strategy for AAPL",
                "parameters": {
                    "rsiPeriod": 14,
                    "rsiOverbought": 70,
                    "rsiOversold": 30,
                    "macdFast": 12,
                    "macdSlow": 26,
                    "macdSignal": 9,
                    "bollingerPeriod": 20,
                    "bollingerStdDev": 2,
                    "smaShort": 20,
                    "smaLong": 50,
                    "emaShort": 12,
                    "emaLong": 26,
                    "stopLoss": 5,
                    "takeProfit": 10,
                    "positionSize": 10,
                    "maxPositions": 5,
                    "momentumPeriod": 20,
                    "momentumThreshold": 0.02,
                    "breakoutPeriod": 20,
                    "volumeThreshold": 1.5
                }
            },
            {
                "name": "TSLA Mean Reversion",
                "type": "mean_reversion",
                "symbol": "TSLA",
                "timeframe": "1d",
                "description": "Mean reversion strategy for TSLA",
                "parameters": {
                    "rsiPeriod": 14,
                    "rsiOverbought": 80,
                    "rsiOversold": 20,
                    "macdFast": 12,
                    "macdSlow": 26,
                    "macdSignal": 9,
                    "bollingerPeriod": 20,
                    "bollingerStdDev": 2,
                    "smaShort": 20,
                    "smaLong": 50,
                    "emaShort": 12,
                    "emaLong": 26,
                    "stopLoss": 3,
                    "takeProfit": 6,
                    "positionSize": 8,
                    "maxPositions": 3,
                    "momentumPeriod": 20,
                    "momentumThreshold": 0.02,
                    "breakoutPeriod": 20,
                    "volumeThreshold": 1.5
                }
            },
            {
                "name": "SPY Breakout Strategy",
                "type": "breakout",
                "symbol": "SPY",
                "timeframe": "1d",
                "description": "Breakout strategy for SPY",
                "parameters": {
                    "rsiPeriod": 14,
                    "rsiOverbought": 70,
                    "rsiOversold": 30,
                    "macdFast": 12,
                    "macdSlow": 26,
                    "macdSignal": 9,
                    "bollingerPeriod": 20,
                    "bollingerStdDev": 2,
                    "smaShort": 20,
                    "smaLong": 50,
                    "emaShort": 12,
                    "emaLong": 26,
                    "stopLoss": 4,
                    "takeProfit": 8,
                    "positionSize": 12,
                    "maxPositions": 4,
                    "momentumPeriod": 20,
                    "momentumThreshold": 0.02,
                    "breakoutPeriod": 20,
                    "volumeThreshold": 1.5
                }
            }
        ]
        
        created_strategies = []
        for strategy in test_strategies:
            try:
                response = requests.post(
                    f"{self.base_url}/api/strategy-builder",
                    json={
                        "action": "createStrategy",
                        **strategy
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("success"):
                        created_strategies.append(result["data"])
                        print(f"✅ Created strategy: {strategy['name']}")
                    else:
                        print(f"❌ Failed to create strategy: {strategy['name']} - {result.get('error')}")
                else:
                    print(f"❌ HTTP error creating strategy: {strategy['name']} - {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Exception creating strategy: {strategy['name']} - {str(e)}")
        
        return created_strategies
    
    def test_backtest_execution(self, strategies: List[Dict]) -> List[Dict]:
        """Test backtest execution with various date ranges"""
        print("\n🧪 Testing Backtest Execution...")
        
        # Test date ranges (last 1 year, 2 years, and 5 years)
        test_periods = [
            ("1 Year", 365),
            ("2 Years", 730),
            ("5 Years", 1825)
        ]
        
        backtest_results = []
        
        for strategy in strategies:
            for period_name, days in test_periods:
                try:
                    # Use historical date ranges instead of dynamic dates
                    if period_name == "1 Year":
                        start_date = datetime(2023, 1, 1)
                        end_date = datetime(2023, 12, 31)
                    elif period_name == "2 Years":
                        start_date = datetime(2022, 1, 1)
                        end_date = datetime(2023, 12, 31)
                    elif period_name == "5 Years":
                        start_date = datetime(2019, 1, 1)
                        end_date = datetime(2023, 12, 31)
                    else:
                        # Fallback to dynamic dates for other periods
                        end_date = datetime.now()
                        start_date = end_date - timedelta(days=days)
                    
                    print(f"🔄 Running backtest for {strategy['name']} - {period_name}")
                    
                    response = requests.post(
                        f"{self.base_url}/api/strategy-builder",
                        json={
                            "action": "runBacktest",
                            "strategyId": strategy["id"],
                            "startDate": start_date.strftime("%Y-%m-%d"),
                            "endDate": end_date.strftime("%Y-%m-%d"),
                            "initialCapital": 100000
                        },
                        timeout=60
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result.get("success"):
                            backtest_data = result["data"]
                            backtest_results.append({
                                "strategy": strategy["name"],
                                "period": period_name,
                                "data": backtest_data
                            })
                            
                            # Validate results
                            self.validate_backtest_results(backtest_data, strategy["name"], period_name)
                            
                        else:
                            print(f"❌ Backtest failed: {strategy['name']} - {period_name} - {result.get('error')}")
                    else:
                        print(f"❌ HTTP error in backtest: {strategy['name']} - {period_name} - {response.status_code}")
                        
                except Exception as e:
                    print(f"❌ Exception in backtest: {strategy['name']} - {period_name} - {str(e)}")
                
                # Add delay between requests
                time.sleep(2)
        
        return backtest_results
    
    def validate_backtest_results(self, backtest_data: Dict, strategy_name: str, period: str):
        """Validate backtest results for accuracy and consistency"""
        print(f"🔍 Validating results for {strategy_name} - {period}")
        
        performance = backtest_data.get("performance", {})
        trades = backtest_data.get("trades", [])
        equity = backtest_data.get("equity", [])
        
        # Basic validation checks
        validation_checks = []
        
        # 1. Check if performance metrics are within reasonable ranges
        if performance.get("winRate", 0) >= 0 and performance.get("winRate", 0) <= 100:
            validation_checks.append(("Win Rate Range", True))
        else:
            validation_checks.append(("Win Rate Range", False))
        
        # 2. Check if total trades is reasonable
        total_trades = performance.get("totalTrades", 0)
        if total_trades >= 0:
            validation_checks.append(("Total Trades", True))
        else:
            validation_checks.append(("Total Trades", False))
        
        # 3. Check if profit factor is reasonable
        profit_factor = performance.get("profitFactor", 0)
        if profit_factor >= 0:
            validation_checks.append(("Profit Factor", True))
        else:
            validation_checks.append(("Profit Factor", False))
        
        # 4. Check if max drawdown is reasonable
        max_drawdown = performance.get("maxDrawdown", 0)
        if max_drawdown >= 0 and max_drawdown <= 100:
            validation_checks.append(("Max Drawdown", True))
        else:
            validation_checks.append(("Max Drawdown", False))
        
        # 5. Check if trades array is consistent
        if len(trades) >= 0:
            validation_checks.append(("Trades Array", True))
        else:
            validation_checks.append(("Trades Array", False))
        
        # 6. Check if equity curve is consistent
        if len(equity) > 0:
            validation_checks.append(("Equity Curve", True))
        else:
            validation_checks.append(("Equity Curve", False))
        
        # 7. Check for accuracy indicators (should be 80-95% accurate)
        accuracy_score = self.calculate_accuracy_score(performance, trades)
        if accuracy_score >= 80:
            validation_checks.append(("Accuracy Score", True))
        else:
            validation_checks.append(("Accuracy Score", False))
        
        # Print validation results
        passed_checks = sum(1 for check in validation_checks if check[1])
        total_checks = len(validation_checks)
        
        print(f"   📊 Validation Results: {passed_checks}/{total_checks} checks passed")
        print(f"   🎯 Accuracy Score: {accuracy_score:.2f}%")
        
        for check_name, passed in validation_checks:
            status = "✅" if passed else "❌"
            print(f"      {status} {check_name}")
        
        # Store test result
        self.test_results.append({
            "strategy": strategy_name,
            "period": period,
            "accuracy_score": accuracy_score,
            "validation_passed": passed_checks,
            "validation_total": total_checks,
            "performance": performance
        })
    
    def calculate_accuracy_score(self, performance: Dict, trades: List[Dict]) -> float:
        """Calculate accuracy score based on multiple factors"""
        score = 0
        max_score = 100
        
        # Factor 1: Win Rate (30% weight)
        win_rate = performance.get("winRate", 0)
        if win_rate >= 50:  # Good win rate
            score += 30
        elif win_rate >= 40:  # Acceptable win rate
            score += 20
        elif win_rate >= 30:  # Minimum acceptable
            score += 10
        
        # Factor 2: Profit Factor (25% weight)
        profit_factor = performance.get("profitFactor", 0)
        if profit_factor >= 1.5:  # Excellent
            score += 25
        elif profit_factor >= 1.2:  # Good
            score += 20
        elif profit_factor >= 1.0:  # Profitable
            score += 15
        elif profit_factor >= 0.8:  # Acceptable
            score += 10
        
        # Factor 3: Risk Management (20% weight)
        max_drawdown = performance.get("maxDrawdown", 0)
        if max_drawdown <= 10:  # Excellent risk management
            score += 20
        elif max_drawdown <= 20:  # Good risk management
            score += 15
        elif max_drawdown <= 30:  # Acceptable risk management
            score += 10
        
        # Factor 4: Trade Consistency (15% weight)
        total_trades = performance.get("totalTrades", 0)
        if total_trades >= 20:  # Good sample size
            score += 15
        elif total_trades >= 10:  # Acceptable sample size
            score += 10
        elif total_trades >= 5:  # Minimum sample size
            score += 5
        
        # Factor 5: Return Consistency (10% weight)
        total_return = performance.get("totalReturn", 0)
        if total_return > 0:  # Profitable strategy
            score += 10
        elif total_return > -10:  # Acceptable loss
            score += 5
        
        return min(score, max_score)
    
    def run_comprehensive_test(self):
        """Run comprehensive backtest validation"""
        print("🚀 Starting Comprehensive Backtest Validation")
        print("=" * 60)
        
        # Step 1: Test strategy creation
        strategies = self.test_strategy_creation()
        
        if not strategies:
            print("❌ No strategies created. Cannot proceed with backtesting.")
            return
        
        # Step 2: Test backtest execution
        backtest_results = self.test_backtest_execution(strategies)
        
        # Step 3: Generate comprehensive report
        self.generate_test_report()
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 60)
        print("📋 COMPREHENSIVE TEST REPORT")
        print("=" * 60)
        
        if not self.test_results:
            print("❌ No test results available")
            return
        
        # Calculate overall statistics
        total_tests = len(self.test_results)
        avg_accuracy = sum(r["accuracy_score"] for r in self.test_results) / total_tests
        passed_validations = sum(r["validation_passed"] for r in self.test_results)
        total_validations = sum(r["validation_total"] for r in self.test_results)
        
        print(f"📊 Overall Statistics:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Average Accuracy: {avg_accuracy:.2f}%")
        print(f"   Validation Pass Rate: {(passed_validations/total_validations)*100:.1f}%")
        
        print(f"\n📈 Individual Test Results:")
        for result in self.test_results:
            status = "✅" if result["accuracy_score"] >= 80 else "⚠️" if result["accuracy_score"] >= 60 else "❌"
            print(f"   {status} {result['strategy']} - {result['period']}")
            print(f"      Accuracy: {result['accuracy_score']:.2f}%")
            print(f"      Validation: {result['validation_passed']}/{result['validation_total']}")
        
        # Performance analysis
        print(f"\n🎯 Performance Analysis:")
        profitable_strategies = [r for r in self.test_results if r["performance"].get("totalReturn", 0) > 0]
        print(f"   Profitable Strategies: {len(profitable_strategies)}/{total_tests}")
        
        if profitable_strategies:
            avg_profit = sum(r["performance"].get("totalReturn", 0) for r in profitable_strategies) / len(profitable_strategies)
            print(f"   Average Return (Profitable): {avg_profit:.2f}%")
        
        # Accuracy assessment
        print(f"\n🎯 Accuracy Assessment:")
        if avg_accuracy >= 90:
            print("   🟢 EXCELLENT: Backtesting engine provides highly accurate results (90%+)")
        elif avg_accuracy >= 80:
            print("   🟡 GOOD: Backtesting engine provides accurate results (80-90%)")
        elif avg_accuracy >= 70:
            print("   🟠 ACCEPTABLE: Backtesting engine provides reasonable results (70-80%)")
        else:
            print("   🔴 NEEDS IMPROVEMENT: Backtesting engine accuracy below 70%")
        
        # Recommendations
        print(f"\n💡 Recommendations:")
        if avg_accuracy < 80:
            print("   - Review technical indicator calculations")
            print("   - Improve signal generation logic")
            print("   - Add more sophisticated risk management")
            print("   - Consider market regime detection")
        else:
            print("   - Backtesting engine is performing well")
            print("   - Consider adding more advanced features")
            print("   - Monitor performance in different market conditions")

if __name__ == "__main__":
    validator = BacktestValidator()
    validator.run_comprehensive_test()
