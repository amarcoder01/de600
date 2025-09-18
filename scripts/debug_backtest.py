#!/usr/bin/env python3
"""
Debug Backtest Script
Identifies the specific issue causing HTTP 500 errors
"""

import requests
import json
import time

def debug_backtest_issue():
    """Debug the backtest issue step by step"""
    print("🔍 Debugging Backtest Issue")
    print("=" * 40)
    
    try:
        # Step 1: Test server connection
        print("1. Testing server connection...")
        response = requests.get("http://localhost:3000", timeout=5)
        print(f"   ✅ Server status: {response.status_code}")
        
        # Step 2: Test strategy creation
        print("\n2. Testing strategy creation...")
        strategy_data = {
            "action": "createStrategy",
            "name": "Debug Test Strategy",
            "type": "momentum",
            "symbol": "AAPL",
            "timeframe": "1d",
            "description": "Debug test strategy",
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
        }
        
        response = requests.post(
            "http://localhost:3000/api/strategy-builder",
            json=strategy_data,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"   ❌ Strategy creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
        
        result = response.json()
        if not result.get("success"):
            print(f"   ❌ Strategy creation failed: {result.get('error')}")
            return
        
        strategy_id = result["data"]["id"]
        print(f"   ✅ Strategy created: {strategy_id}")
        
        # Step 3: Test backtest with detailed error handling
        print("\n3. Testing backtest execution...")
        backtest_data = {
            "action": "runBacktest",
            "strategyId": strategy_id,
            "startDate": "2023-01-01",
            "endDate": "2023-12-31",
            "initialCapital": 100000
        }
        
        print(f"   📤 Sending backtest request...")
        print(f"   Strategy ID: {strategy_id}")
        print(f"   Date range: 2023-01-01 to 2023-12-31")
        
        response = requests.post(
            "http://localhost:3000/api/strategy-builder",
            json=backtest_data,
            timeout=60
        )
        
        print(f"   📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print("   ✅ Backtest completed successfully!")
                performance = result["data"]["performance"]
                print(f"   Win Rate: {performance.get('winRate', 0):.2f}%")
                print(f"   Total Return: {performance.get('totalReturn', 0):.2f}%")
            else:
                print(f"   ❌ Backtest failed: {result.get('error')}")
        else:
            print(f"   ❌ HTTP error: {response.status_code}")
            print(f"   Response headers: {dict(response.headers)}")
            print(f"   Response body: {response.text[:500]}...")
            
            # Try to get more detailed error information
            try:
                error_data = response.json()
                print(f"   Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Raw response: {response.text}")
        
        # Step 4: Test with shorter date range
        print("\n4. Testing with shorter date range...")
        backtest_data_short = {
            "action": "runBacktest",
            "strategyId": strategy_id,
            "startDate": "2023-06-01",
            "endDate": "2023-12-31",
            "initialCapital": 100000
        }
        
        response = requests.post(
            "http://localhost:3000/api/strategy-builder",
            json=backtest_data_short,
            timeout=60
        )
        
        print(f"   📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print("   ✅ Short backtest completed successfully!")
            else:
                print(f"   ❌ Short backtest failed: {result.get('error')}")
        else:
            print(f"   ❌ Short backtest HTTP error: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
        
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_backtest_issue()
