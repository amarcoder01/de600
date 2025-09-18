#!/usr/bin/env python3
"""
Polygon.io Backtesting CLI
Command-line interface for the Polygon.io backtesting engine
"""

import sys
import json
import asyncio
import argparse
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

from polygon_backtesting_engine import PolygonBacktestingEngine

async def run_backtest(strategy_name: str, symbols: str, start_date: str, end_date: str, parameters: str = None):
    """Run a backtest with the specified parameters"""
    try:
        # Parse symbols
        symbol_list = [s.strip() for s in symbols.split(',')]
        
        # Parse parameters
        params = None
        if parameters:
            try:
                params = json.loads(parameters)
            except json.JSONDecodeError:
                print(f"Error: Invalid parameters JSON: {parameters}")
                return
        
        # Initialize backtesting engine
        async with PolygonBacktestingEngine() as engine:
            # Run backtest
            result = await engine.run_backtest(
                strategy_name=strategy_name,
                symbols=symbol_list,
                start_date=start_date,
                end_date=end_date,
                parameters=params
            )
            
            # Output result as JSON
            print(json.dumps(result, indent=2, default=str))
            
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'strategy': strategy_name,
            'symbols': symbols,
            'start_date': start_date,
            'end_date': end_date
        }
        print(json.dumps(error_result, indent=2))

async def test_data_fetching(symbols: str, start_date: str, end_date: str):
    """Test data fetching from Polygon.io"""
    try:
        # Parse symbols
        symbol_list = [s.strip() for s in symbols.split(',')]
        
        # Initialize backtesting engine
        async with PolygonBacktestingEngine() as engine:
            # Test data fetching
            data = await engine.get_multiple_stocks_data(symbol_list, start_date, end_date)
            
            result = {
                'success': True,
                'data_source': 'Polygon.io',
                'symbols_fetched': len(data),
                'total_symbols': len(symbol_list),
                'symbol_details': {}
            }
            
            for symbol, df in data.items():
                result['symbol_details'][symbol] = {
                    'rows': len(df),
                    'start_date': str(df.index[0]) if len(df) > 0 else None,
                    'end_date': str(df.index[-1]) if len(df) > 0 else None,
                    'columns': list(df.columns)
                }
            
            print(json.dumps(result, indent=2))
            
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'symbols': symbols,
            'start_date': start_date,
            'end_date': end_date
        }
        print(json.dumps(error_result, indent=2))

async def get_data_summary():
    """Get summary of Polygon.io data capabilities"""
    try:
        async with PolygonBacktestingEngine() as engine:
            summary = engine.get_data_summary()
            result = {
                'success': True,
                'data_summary': summary,
                'available_strategies': list(engine.strategy_templates.keys())
            }
            print(json.dumps(result, indent=2))
            
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result, indent=2))

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(description='Polygon.io Backtesting CLI')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Backtest command
    backtest_parser = subparsers.add_parser('backtest', help='Run a backtest')
    backtest_parser.add_argument('--strategy', required=True, help='Strategy name (momentum, mean_reversion)')
    backtest_parser.add_argument('--symbols', required=True, help='Comma-separated list of symbols')
    backtest_parser.add_argument('--start-date', required=True, help='Start date (YYYY-MM-DD)')
    backtest_parser.add_argument('--end-date', required=True, help='End date (YYYY-MM-DD)')
    backtest_parser.add_argument('--parameters', help='JSON string of parameters')
    
    # Test data command
    test_parser = subparsers.add_parser('test-data', help='Test data fetching')
    test_parser.add_argument('--symbols', required=True, help='Comma-separated list of symbols')
    test_parser.add_argument('--start-date', required=True, help='Start date (YYYY-MM-DD)')
    test_parser.add_argument('--end-date', required=True, help='End date (YYYY-MM-DD)')
    
    # Summary command
    summary_parser = subparsers.add_parser('summary', help='Get data summary')
    
    args = parser.parse_args()
    
    if args.command == 'backtest':
        asyncio.run(run_backtest(
            strategy_name=args.strategy,
            symbols=args.symbols,
            start_date=args.start_date,
            end_date=args.end_date,
            parameters=args.parameters
        ))
    elif args.command == 'test-data':
        asyncio.run(test_data_fetching(
            symbols=args.symbols,
            start_date=args.start_date,
            end_date=args.end_date
        ))
    elif args.command == 'summary':
        asyncio.run(get_data_summary())
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
