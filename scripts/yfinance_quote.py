#!/usr/bin/env python3
import yfinance as yf
import json
import sys
from datetime import datetime, timedelta

def get_stock_quote(symbol):
    try:
        # Get stock info
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Get current price and basic data
        current_price = info.get('currentPrice', 0)
        if not current_price:
            current_price = info.get('regularMarketPrice', 0)
        
        previous_close = info.get('previousClose', current_price)
        change = current_price - previous_close
        change_percent = (change / previous_close * 100) if previous_close > 0 else 0
        
        # Get additional data
        volume = info.get('volume', 0)
        market_cap = info.get('marketCap', 0)
        pe_ratio = info.get('trailingPE', 0)
        dividend_yield = info.get('dividendYield', 0)
        day_high = info.get('dayHigh', current_price)
        day_low = info.get('dayLow', current_price)
        fifty_two_week_high = info.get('fiftyTwoWeekHigh', current_price)
        fifty_two_week_low = info.get('fiftyTwoWeekLow', current_price)
        avg_volume = info.get('averageVolume', volume)
        beta = info.get('beta', 0)
        eps = info.get('trailingEps', 0)
        
        # Company info
        company_name = info.get('longName', info.get('shortName', symbol))
        sector = info.get('sector', 'Unknown')
        industry = info.get('industry', 'Unknown')
        exchange = info.get('exchange', 'NASDAQ')
        
        # Map exchange
        if 'NYSE' in exchange:
            exchange_mapped = 'NYSE'
        elif 'NASDAQ' in exchange:
            exchange_mapped = 'NASDAQ'
        else:
            exchange_mapped = 'OTC'
        
        # Create stock object
        stock = {
            "symbol": symbol,
            "name": company_name,
            "price": current_price,
            "change": change,
            "changePercent": change_percent,
            "volume": volume,
            "marketCap": market_cap,
            "pe": pe_ratio,
            "dividend": dividend_yield * current_price if dividend_yield else 0,
            "sector": sector,
            "industry": industry,
            "exchange": exchange_mapped,
            "dayHigh": day_high,
            "dayLow": day_low,
            "fiftyTwoWeekHigh": fifty_two_week_high,
            "fiftyTwoWeekLow": fifty_two_week_low,
            "avgVolume": avg_volume,
            "dividendYield": dividend_yield * 100 if dividend_yield else 0,
            "beta": beta,
            "eps": eps,
            "lastUpdated": "2024-01-01T00:00:00.000Z"
        }
        
        return {"success": True, "stock": stock}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_chart_data(symbol, range='1d', interval='1m'):
    try:
        # Get ticker data
        ticker = yf.Ticker(symbol)
        
        # Get historical data
        hist = ticker.history(period=range, interval=interval)
        
        if hist.empty:
            return {"success": False, "error": f"No data available for {symbol}"}
        
        # Convert to chart data format
        data = []
        for index, row in hist.iterrows():
            data_point = {
                "time": int(index.timestamp() * 1000),  # Convert to milliseconds
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            }
            data.append(data_point)
        
        return {"success": True, "data": data}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Symbol argument required"}))
        sys.exit(1)
    
    symbol = sys.argv[1]
    
    # Check if we need chart data or stock quote
    if len(sys.argv) >= 4:
        # Chart data request: symbol, range, interval
        range_param = sys.argv[2]
        interval_param = sys.argv[3]
        result = get_chart_data(symbol, range_param, interval_param)
    else:
        # Stock quote request
        result = get_stock_quote(symbol)
    
    print(json.dumps(result))
