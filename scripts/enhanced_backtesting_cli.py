#!/usr/bin/env python3
"""
Enhanced Backtesting CLI - Command Line Interface
Handles API calls from the frontend for enhanced backtesting
"""

import os
import sys
import json
import argparse
import asyncio
import math
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from enhanced_backtesting_engine import EnhancedBacktester

def safe_json_serializer(obj):
    """Custom JSON serializer to handle NaN values"""
    if isinstance(obj, float):
        if math.isnan(obj):
            return None
        if math.isinf(obj):
            return None
    return str(obj)

async def run_backtest_command(args):
    """Run backtest command"""
    try:
        backtester = EnhancedBacktester()
        
        # Parse parameters
        strategy_name = args.strategy
        symbols = args.symbols.split(',') if args.symbols else ['AAPL', 'MSFT', 'GOOGL']
        start_date = args.start_date
        end_date = args.end_date
        parameters = json.loads(args.parameters) if args.parameters else {}
        
        # Run enhanced backtest
        result = await backtester.run_enhanced_backtest(
            strategy_name=strategy_name,
            symbols=symbols,
            start_date=start_date,
            end_date=end_date,
            parameters=parameters
        )
        
        # Output result as JSON
        print(json.dumps(result, default=safe_json_serializer))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))

async def compare_strategies_command(args):
    """Compare strategies command"""
    try:
        backtester = EnhancedBacktester()
        
        # Parse parameters
        symbols = args.symbols.split(',') if args.symbols else ['AAPL', 'MSFT', 'GOOGL']
        start_date = args.start_date
        end_date = args.end_date
        strategies = args.strategies.split(',') if args.strategies else None
        
        # Run strategy comparison
        result = await backtester.compare_strategies(
            symbols=symbols,
            start_date=start_date,
            end_date=end_date,
            strategies=strategies
        )
        
        # Output result as JSON
        print(json.dumps(result, default=safe_json_serializer))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))

async def test_enhanced_backtesting():
    """Test the enhanced backtesting system"""
    try:
        backtester = EnhancedBacktester()
        
        # Test parameters
        symbols = ['AAPL', 'MSFT']
        start_date = '2023-01-01'
        end_date = '2023-12-31'
        
        print("Testing Enhanced Backtesting System...")
        
        # Test momentum strategy
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
        
        print("\n🎉 Enhanced Backtesting System Test Completed!")
        
    except Exception as e:
        print(f"❌ Test Failed: {e}")

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(description='Enhanced Backtesting CLI')
    parser.add_argument('command', choices=['backtest', 'compare', 'test'], help='Command to execute')
    parser.add_argument('--strategy', help='Strategy name')
    parser.add_argument('--symbols', help='Comma-separated symbols')
    parser.add_argument('--start-date', help='Start date')
    parser.add_argument('--end-date', help='End date')
    parser.add_argument('--parameters', help='JSON parameters')
    parser.add_argument('--strategies', help='Comma-separated strategies')
    
    args = parser.parse_args()
    
    if args.command == 'backtest':
        asyncio.run(run_backtest_command(args))
    elif args.command == 'compare':
        asyncio.run(compare_strategies_command(args))
    elif args.command == 'test':
        asyncio.run(test_enhanced_backtesting())
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
