#!/usr/bin/env python3
"""
Backtest Validation CLI
Command-line interface for running comprehensive backtest validation tests
"""

import os
import sys
import argparse
import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import pandas as pd

# Add the scripts directory to the path
sys.path.append(str(Path(__file__).parent))

from polygon_backtesting_engine import PolygonBacktestingEngine
from backtest_validator import BacktestValidator

async def run_validation_test(symbols: List[str], start_date: str, end_date: str, strategy: str = 'momentum'):
    """Run a comprehensive validation test"""
    print(f"🔍 Running validation test for {strategy} strategy")
    print(f"📊 Symbols: {', '.join(symbols)}")
    print(f"📅 Date range: {start_date} to {end_date}")
    print("=" * 60)
    
    try:
        async with PolygonBacktestingEngine() as engine:
            # Run backtest with validation
            result = await engine.run_backtest(strategy, symbols, start_date, end_date)
            
            if result['success']:
                print("✅ Backtest completed successfully")
                
                # Extract validation results
                validation = result.get('validation', {})
                validation_report = validation.get('validation_report', {})
                
                # Display validation summary
                print("\n📋 VALIDATION SUMMARY")
                print("=" * 40)
                print(f"Overall Status: {validation_report.get('overall_status', 'UNKNOWN')}")
                print(f"Accuracy Grade: {validation_report.get('summary', {}).get('accuracy_grade', 'N/A')}")
                
                # Display accuracy metrics
                accuracy_metrics = validation_report.get('accuracy_metrics', {})
                print(f"\n📈 ACCURACY METRICS")
                print("=" * 40)
                print(f"Data Accuracy: {accuracy_metrics.get('data_accuracy', 0):.2%}")
                print(f"Calculation Accuracy: {accuracy_metrics.get('calculation_accuracy', 0):.2%}")
                print(f"Overall Accuracy: {accuracy_metrics.get('overall_accuracy', 0):.2%}")
                print(f"Confidence Level: {accuracy_metrics.get('confidence_level', 0):.2%}")
                print(f"Validation Score: {accuracy_metrics.get('validation_score', 0):.2%}")
                
                # Display threshold compliance
                threshold_compliance = validation_report.get('threshold_compliance', {})
                print(f"\n🎯 THRESHOLD COMPLIANCE")
                print("=" * 40)
                for test, passed in threshold_compliance.items():
                    status = "✅ PASS" if passed else "❌ FAIL"
                    print(f"{test.replace('_', ' ').title()}: {status}")
                
                # Display recommendations
                recommendations = validation_report.get('recommendations', [])
                if recommendations:
                    print(f"\n💡 RECOMMENDATIONS")
                    print("=" * 40)
                    for i, rec in enumerate(recommendations, 1):
                        print(f"{i}. {rec}")
                
                # Display performance metrics
                performance = result.get('performance', {})
                print(f"\n📊 PERFORMANCE METRICS")
                print("=" * 40)
                print(f"Total Return: {performance.get('total_return', 0):.2%}")
                print(f"Sharpe Ratio: {performance.get('sharpe_ratio', 0):.2f}")
                print(f"Max Drawdown: {performance.get('max_drawdown', 0):.2%}")
                print(f"Total Trades: {performance.get('total_trades', 0)}")
                print(f"Win Rate: {performance.get('win_rate', 0):.2%}")
                
                return True
            else:
                print(f"❌ Backtest failed: {result.get('error', 'Unknown error')}")
                return False
                
    except Exception as e:
        print(f"❌ Validation test failed: {e}")
        return False

async def run_accuracy_benchmark():
    """Run accuracy benchmark tests"""
    print("🏆 Running Accuracy Benchmark Tests")
    print("=" * 50)
    
    # Test scenarios
    test_scenarios = [
        {
            'name': 'Single Stock Test',
            'symbols': ['AAPL'],
            'start_date': '2021-01-01',
            'end_date': '2021-12-31',
            'strategy': 'momentum'
        },
        {
            'name': 'Multi-Stock Test',
            'symbols': ['AAPL', 'MSFT', 'GOOGL'],
            'start_date': '2021-01-01',
            'end_date': '2021-12-31',
            'strategy': 'momentum'
        },
        {
            'name': 'Mean Reversion Test',
            'symbols': ['AAPL', 'MSFT'],
            'start_date': '2021-01-01',
            'end_date': '2021-12-31',
            'strategy': 'mean_reversion'
        },
        {
            'name': 'Longer Period Test',
            'symbols': ['AAPL'],
            'start_date': '2020-08-01',
            'end_date': '2023-12-31',
            'strategy': 'momentum'
        }
    ]
    
    results = []
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n🧪 Test {i}: {scenario['name']}")
        print("-" * 40)
        
        success = await run_validation_test(
            scenario['symbols'],
            scenario['start_date'],
            scenario['end_date'],
            scenario['strategy']
        )
        
        results.append({
            'test_name': scenario['name'],
            'success': success,
            'scenario': scenario
        })
        
        if i < len(test_scenarios):
            print("\n⏳ Waiting 2 seconds before next test...")
            await asyncio.sleep(2)
    
    # Generate benchmark report
    print(f"\n📊 BENCHMARK SUMMARY")
    print("=" * 50)
    successful_tests = sum(1 for r in results if r['success'])
    total_tests = len(results)
    success_rate = successful_tests / total_tests if total_tests > 0 else 0
    
    print(f"Total Tests: {total_tests}")
    print(f"Successful Tests: {successful_tests}")
    print(f"Success Rate: {success_rate:.2%}")
    
    if success_rate >= 0.95:
        print("🏆 EXCELLENT: 95%+ success rate achieved!")
    elif success_rate >= 0.90:
        print("✅ GOOD: 90%+ success rate achieved")
    elif success_rate >= 0.80:
        print("⚠️  FAIR: 80%+ success rate achieved")
    else:
        print("❌ POOR: Success rate below 80%")
    
    return results

async def validate_data_quality():
    """Validate data quality independently"""
    print("🔍 Running Data Quality Validation")
    print("=" * 40)
    
    try:
        async with PolygonBacktestingEngine() as engine:
            # Test data fetching
            symbols = ['AAPL', 'MSFT', 'GOOGL']
            start_date = '2021-01-01'
            end_date = '2021-12-31'
            
            print(f"Fetching data for {len(symbols)} symbols...")
            data = await engine.get_multiple_stocks_data(symbols, start_date, end_date)
            
            if data:
                print(f"✅ Successfully fetched data for {len(data)} symbols")
                
                # Run data validation
                validator = BacktestValidator()
                data_validation = await validator.validate_backtest_data(data)
                
                print(f"\n📊 Data Quality Results")
                print("=" * 30)
                print(f"Overall Score: {data_validation.score:.2%}")
                print(f"Status: {'✅ PASSED' if data_validation.passed else '❌ FAILED'}")
                
                # Display details
                details = data_validation.details
                print(f"\n📋 Detailed Results")
                print("=" * 30)
                for symbol, df in data.items():
                    print(f"\n{symbol}:")
                    print(f"  Rows: {len(df)}")
                    print(f"  Date Range: {df.index[0]} to {df.index[-1]}")
                    print(f"  Missing Values: {df.isnull().sum().sum()}")
                    
                    # Check for data issues
                    issues = []
                    if len(df[df['Close'] <= 0]) > 0:
                        issues.append("Negative/zero prices")
                    if len(df[df['Volume'] <= 0]) > 0:
                        issues.append("Negative/zero volumes")
                    if len(df[df['High'] < df['Low']]) > 0:
                        issues.append("Invalid OHLC")
                    
                    if issues:
                        print(f"  ⚠️  Issues: {', '.join(issues)}")
                    else:
                        print(f"  ✅ No issues detected")
                
                return data_validation.passed
            else:
                print("❌ Failed to fetch data")
                return False
                
    except Exception as e:
        print(f"❌ Data quality validation failed: {e}")
        return False

async def generate_accuracy_report():
    """Generate comprehensive accuracy report"""
    print("📊 Generating Comprehensive Accuracy Report")
    print("=" * 50)
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'tests': [],
        'summary': {}
    }
    
    # Run data quality validation
    print("\n1. Data Quality Validation")
    data_quality_passed = await validate_data_quality()
    report['tests'].append({
        'test_name': 'Data Quality Validation',
        'passed': data_quality_passed,
        'type': 'data_quality'
    })
    
    # Run accuracy benchmark
    print("\n2. Accuracy Benchmark Tests")
    benchmark_results = await run_accuracy_benchmark()
    report['tests'].extend(benchmark_results)
    
        # Calculate summary statistics
    total_tests = len(report['tests'])
    passed_tests = sum(1 for test in report['tests'] if test.get('success', False))
    success_rate = passed_tests / total_tests if total_tests > 0 else 0
    
    report['summary'] = {
        'total_tests': total_tests,
        'passed_tests': passed_tests,
        'failed_tests': total_tests - passed_tests,
        'success_rate': success_rate,
        'accuracy_grade': get_accuracy_grade(success_rate),
        'recommendations': generate_recommendations(success_rate)
    }
    
    # Save report
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = Path(f"accuracy_report_{timestamp}.json")
    
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n📄 Report saved to: {report_file}")
    
    # Display final summary
    print(f"\n🎯 FINAL ACCURACY SUMMARY")
    print("=" * 40)
    print(f"Total Tests: {total_tests}")
    print(f"Passed Tests: {passed_tests}")
    print(f"Failed Tests: {total_tests - passed_tests}")
    print(f"Success Rate: {success_rate:.2%}")
    print(f"Accuracy Grade: {report['summary']['accuracy_grade']}")
    
    recommendations = report['summary']['recommendations']
    if recommendations:
        print(f"\n💡 Recommendations:")
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec}")
    
    return report

def get_accuracy_grade(success_rate: float) -> str:
    """Get accuracy grade based on success rate"""
    if success_rate >= 0.95:
        return 'A+ (Excellent - 100% Accurate Backtests)'
    elif success_rate >= 0.90:
        return 'A (Very Good - Highly Accurate)'
    elif success_rate >= 0.85:
        return 'B+ (Good - Reliable)'
    elif success_rate >= 0.80:
        return 'B (Satisfactory - Acceptable)'
    elif success_rate >= 0.75:
        return 'C+ (Fair - Needs Improvement)'
    elif success_rate >= 0.70:
        return 'C (Below Average - Significant Issues)'
    else:
        return 'F (Failed - Major Accuracy Problems)'

def generate_recommendations(success_rate: float) -> List[str]:
    """Generate recommendations based on success rate"""
    recommendations = []
    
    if success_rate >= 0.95:
        recommendations.append("Excellent accuracy achieved! Your backtesting system is highly reliable.")
        recommendations.append("Consider implementing additional edge case testing for even higher confidence.")
    elif success_rate >= 0.90:
        recommendations.append("Good accuracy achieved. Minor improvements needed for optimal performance.")
        recommendations.append("Review failed test cases to identify specific areas for improvement.")
    elif success_rate >= 0.80:
        recommendations.append("Acceptable accuracy, but improvements recommended for production use.")
        recommendations.append("Focus on data quality validation and calculation accuracy.")
        recommendations.append("Consider implementing additional validation checks.")
    else:
        recommendations.append("Accuracy below acceptable threshold. Immediate action required.")
        recommendations.append("Review data source reliability and API integration.")
        recommendations.append("Implement comprehensive error handling and validation.")
        recommendations.append("Consider alternative data sources or validation methods.")
    
    return recommendations

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(description='Backtest Validation CLI')
    parser.add_argument('command', choices=['validate', 'benchmark', 'data-quality', 'report'],
                       help='Validation command to run')
    parser.add_argument('--symbols', nargs='+', default=['AAPL'],
                       help='Stock symbols to test')
    parser.add_argument('--start-date', default='2021-01-01',
                       help='Start date for testing')
    parser.add_argument('--end-date', default='2021-12-31',
                       help='End date for testing')
    parser.add_argument('--strategy', choices=['momentum', 'mean_reversion'], default='momentum',
                       help='Strategy to test')
    
    args = parser.parse_args()
    
    if args.command == 'validate':
        asyncio.run(run_validation_test(args.symbols, args.start_date, args.end_date, args.strategy))
    elif args.command == 'benchmark':
        asyncio.run(run_accuracy_benchmark())
    elif args.command == 'data-quality':
        asyncio.run(validate_data_quality())
    elif args.command == 'report':
        asyncio.run(generate_accuracy_report())

if __name__ == "__main__":
    main()
