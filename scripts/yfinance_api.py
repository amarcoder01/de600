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
import time

# Try to import yfinance, handle gracefully if not available
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
    print("✅ yfinance imported successfully", file=sys.stderr)
except ImportError as e:
    YFINANCE_AVAILABLE = False
    print(f"⚠️ yfinance not available: {e}", file=sys.stderr)
    print("⚠️ Using fallback data", file=sys.stderr)

def get_stock_data(symbol, max_retries=2, retry_delay=1):
    """Fetch stock data for a given symbol using yfinance with rate limiting protection"""
    if not YFINANCE_AVAILABLE:
        return {
            "success": False,
            "error": "yfinance module not available",
            "fallback": True
        }
    
    for attempt in range(max_retries + 1):
        try:
            # Only print debug info to stderr, never to stdout
            print(f"🔍 Fetching data for {symbol} using yfinance... (attempt {attempt + 1})", file=sys.stderr)
            
            # Add small delay between requests to avoid rate limiting
            if attempt > 0:
                print(f"⏳ Waiting {retry_delay} seconds before retry...", file=sys.stderr)
                time.sleep(retry_delay)
            
            # Suppress stdout output from yfinance to prevent JSON parsing issues
            # Create a null output stream to completely suppress stdout
            null_stream = io.StringIO()
            with contextlib.redirect_stdout(null_stream):
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
            error_msg = str(e)
            print(f"❌ Error fetching data for {symbol}: {error_msg}", file=sys.stderr)
            
            # Check if it's a rate limiting error
            if "429" in error_msg or "Too Many Requests" in error_msg:
                print(f"⚠️ Rate limit detected for {symbol}, will retry...", file=sys.stderr)
                if attempt < max_retries:
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    print(f"❌ Max retries reached for {symbol}, giving up", file=sys.stderr)
                    return None
            else:
                # For other errors, don't retry
                print(traceback.format_exc(), file=sys.stderr)
                return None
    
    return None

def search_stocks(query):
    """Search for stocks using yfinance with rate limiting protection"""
    try:
        search_term = query.upper().strip()
        
        if len(search_term) < 1:
            return []
        
        print(f"🔍 Searching for: '{search_term}' using yfinance", file=sys.stderr)
        
        results = []
        
        # 1. Try exact symbol match first (most common case)
        exact_match = get_stock_data(search_term)
        if exact_match:
            print(f"✅ Exact match found: {exact_match['symbol']}", file=sys.stderr)
            results = [exact_match]
        else:
            # 2. Try only the most common suffixes to avoid rate limiting
            # Reduced from 9 suffixes to 3 most common ones
            common_suffixes = ['.TO', '.V', '.AX']  # Canada, Vancouver, Australia
            
            for suffix in common_suffixes:
                symbol_with_suffix = search_term + suffix
                stock_data = get_stock_data(symbol_with_suffix)
                if stock_data:
                    print(f"✅ Found match with suffix: {symbol_with_suffix}", file=sys.stderr)
                    results = [stock_data]
                    break
            
            # 3. If still no results, try a limited set of popular symbols
            # Only if the search term is very short (likely a partial match)
            if not results and len(search_term) <= 4:
                popular_symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'NFLX']
                matching_symbols = [s for s in popular_symbols if search_term in s or s in search_term]
                
                # Limit to only 2 results to avoid rate limiting
                for symbol in matching_symbols[:2]:
                    stock_data = get_stock_data(symbol)
                    if stock_data:
                        results.append(stock_data)
                        if len(results) >= 2:  # Stop after 2 results
                            break
        
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
