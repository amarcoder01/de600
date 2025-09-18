#!/usr/bin/env python3
import yfinance as yf
import json
import sys

def search_stocks(query):
    try:
        # Search for stocks using yfinance
        search_results = yf.Tickers(query)
        
        stocks = []
        count = 0
        
        for symbol in search_results.tickers:
            if count >= 8:  # Limit to 8 results
                break
                
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                # Get basic data
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
                
                stocks.append(stock)
                count += 1
                
            except Exception as e:
                continue  # Skip this stock if there's an error
        
        return {"success": True, "stocks": stocks}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Query argument required"}))
        sys.exit(1)
    
    query = sys.argv[1]
    result = search_stocks(query)
    print(json.dumps(result))
