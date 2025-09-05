#!/usr/bin/env python3
"""
Python script to fetch stock data using yfinance
This script can be called from Next.js API routes
"""

import sys
import json
from datetime import datetime
import traceback
import io
import contextlib

# Try to import yfinance, handle gracefully if not available
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    print("⚠️ yfinance not available, using fallback data", file=sys.stderr)

def get_stock_data(symbol):
    """Fetch stock data for a given symbol using yfinance"""
    if not YFINANCE_AVAILABLE:
        return {
            "success": False,
            "error": "yfinance module not available",
            "fallback": True
        }
    
    try:
        # Only print debug info to stderr, never to stdout
        print(f"🔍 Fetching data for {symbol} using yfinance...", file=sys.stderr)
        
        # Suppress stdout output from yfinance to prevent JSON parsing issues
        with contextlib.redirect_stdout(io.StringIO()):
            # Get ticker info
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Check if we got valid data
            if not info or not info.get('regularMarketPrice') or info.get('regularMarketPrice') == 0:
                print(f"⚠️ No valid data for {symbol}", file=sys.stderr)
                return None
            
            # Calculate change and change percent
            current_price = info.get('regularMarketPrice', 0)
            previous_close = info.get('regularMarketPreviousClose', current_price)
            change = current_price - previous_close
            change_percent = (change / previous_close * 100) if previous_close > 0 else 0
            
            # Build stock data object
            stock_data = {
                "symbol": symbol.upper(),
                "name": info.get('longName') or info.get('shortName') or symbol,
                "price": current_price,
                "change": change,
                "changePercent": change_percent,
                "volume": info.get('volume', 0),
                "marketCap": info.get('marketCap', 0),
                "pe": info.get('trailingPE', 0),
                "dividend": info.get('dividendRate', 0),
                "sector": info.get('sector', 'Unknown'),
                "industry": info.get('industry', 'Unknown'),
                "exchange": info.get('exchange', 'NASDAQ'),
                "dayHigh": info.get('dayHigh', current_price),
                "dayLow": info.get('dayLow', current_price),
                "fiftyTwoWeekHigh": info.get('fiftyTwoWeekHigh', current_price),
                "fiftyTwoWeekLow": info.get('fiftyTwoWeekLow', current_price),
                "avgVolume": info.get('averageVolume', 0),
                "dividendYield": (info.get('dividendYield', 0) * 100) if info.get('dividendYield') else 0,
                "beta": info.get('beta', 0),
                "eps": info.get('trailingEps', 0),
                "lastUpdated": datetime.now().isoformat()
            }
            
            print(f"✅ Successfully fetched data for {symbol}: ${current_price}", file=sys.stderr)
            return stock_data
        
    except Exception as e:
        print(f"❌ Error fetching data for {symbol}: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return None

def search_stocks(query):
    """Search for stocks using yfinance"""
    try:
        search_term = query.upper().strip()
        
        if len(search_term) < 1:
            return []
        
        print(f"🔍 Searching for: '{search_term}' using yfinance", file=sys.stderr)
        
        results = []
        
        # 1. Try exact symbol match first
        exact_match = get_stock_data(search_term)
        if exact_match:
            print(f"✅ Exact match found: {exact_match['symbol']}", file=sys.stderr)
            results = [exact_match]
        else:
            # 2. Try with common suffixes if no exact match
            suffixes = ['', '.TO', '.V', '.AX', '.L', '.PA', '.F', '.MI', '.AS']
            
            for suffix in suffixes:
                symbol_with_suffix = search_term + suffix
                stock_data = get_stock_data(symbol_with_suffix)
                if stock_data:
                    print(f"✅ Found match with suffix: {symbol_with_suffix}", file=sys.stderr)
                    results = [stock_data]
                    break
            
            # 3. If still no results, try popular symbols
            if not results:
                popular_symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'NFLX']
                matching_symbols = [s for s in popular_symbols if search_term in s or s in search_term]
                
                for symbol in matching_symbols[:3]:  # Limit to 3 results
                    stock_data = get_stock_data(symbol)
                    if stock_data:
                        results.append(stock_data)
        
        return results
        
    except Exception as e:
        print(f"❌ Error in yfinance search: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return []

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "search" and len(sys.argv) >= 3:
        query = sys.argv[2]
        results = search_stocks(query)
        print(json.dumps({
            "success": True,
            "results": results,
            "message": f"Found {len(results)} stocks using real-time data",
            "source": "yfinance"
        }))
    
    elif command == "test":
        # Test with AAPL
        if not YFINANCE_AVAILABLE:
            print(json.dumps({
                "success": False,
                "message": "yfinance module not available",
                "error": "ModuleNotFoundError: No module named 'yfinance'"
            }))
        else:
            test_data = get_stock_data("AAPL")
            if test_data and test_data.get("success", False):
                print(json.dumps({
                    "success": True,
                    "message": "yfinance integration is working",
                    "data": test_data
                }))
            else:
                print(json.dumps({
                    "success": False,
                    "message": "yfinance integration test failed",
                    "error": test_data.get("error", "Unknown error") if test_data else "No data returned"
                }))
    
    else:
        print(json.dumps({"error": "Invalid command. Use 'search <query>' or 'test'"}))

if __name__ == "__main__":
    main()
