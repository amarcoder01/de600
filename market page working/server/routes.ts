import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { StockDataService } from "./services/stockDataService";
import { OpenAIStockService } from "./services/openai";
import { insertStockSchema, insertMarketIndexSchema, insertWatchlistSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const stockDataService = new StockDataService();
  const openAIService = new OpenAIStockService();

  // Initialize with some stock data
  const initializeData = async () => {
    try {
      console.log('Initializing stock data...');
      
      // In production, log more details for debugging
      if (process.env.NODE_ENV === 'production') {
        console.log('Production mode: starting data initialization...');
      }
      
      // Fetch market indices (fast operation)
      const indices = await stockDataService.fetchMarketIndices();
      for (const index of indices) {
        await storage.createMarketIndex(index);
      }

      // Fetch all US stock data from Polygon API (slower operation)
      const stocks = await stockDataService.fetchStockData(); // No symbols = fetch all
      
      // Batch insert stocks for better performance
      const batchSize = 100;
      for (let i = 0; i < stocks.length; i += batchSize) {
        const batch = stocks.slice(i, i + batchSize);
        await Promise.all(batch.map(stock => storage.createStock(stock)));
        
        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < stocks.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      console.log(`Initialized ${stocks.length} stocks and ${indices.length} market indices`);
    } catch (error) {
      console.error('Error initializing data:', error);
      // Don't throw - let the server continue running
    }
  };

  // Initialize data based on environment
  if (process.env.NODE_ENV === 'production') {
    // In production, delay initialization to allow server to start successfully first
    setTimeout(() => {
      initializeData().catch(error => {
        console.error('Background data initialization failed:', error);
      });
    }, 5000); // 5 second delay
  } else {
    // In development, initialize immediately
    initializeData().catch(error => {
      console.error('Failed to initialize stock data:', error);
    });
  }

  // Add fallback test data in case API initialization fails
  setTimeout(async () => {
    try {
      const existingStocks = await storage.getStocks(1, 1);
      if (existingStocks.stocks.length === 0) {
        console.log('No stocks found, adding fallback test data...');
        const testStocks = [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            currentPrice: 175.25,
            previousClose: 170.10,
            change: 5.15,
            changePercent: 3.03,
            volume: 52431100,
            marketCap: 2780000000000,
            isActive: true,
          },
          {
            symbol: 'MSFT',
            name: 'Microsoft Corporation',
            sector: 'Technology',
            currentPrice: 412.80,
            previousClose: 408.15,
            change: 4.65,
            changePercent: 1.14,
            volume: 18654200,
            marketCap: 3080000000000,
            isActive: true,
          },
          {
            symbol: 'GOOGL',
            name: 'Alphabet Inc. Class A',
            sector: 'Technology',
            currentPrice: 140.85,
            previousClose: 138.40,
            change: 2.45,
            changePercent: 1.77,
            volume: 23145600,
            marketCap: 1780000000000,
            isActive: true,
          },
          {
            symbol: 'TSLA',
            name: 'Tesla, Inc.',
            sector: 'Consumer Cyclical',
            currentPrice: 245.60,
            previousClose: 240.15,
            change: 5.45,
            changePercent: 2.27,
            volume: 45789300,
            marketCap: 780000000000,
            isActive: true,
          },
          {
            symbol: 'NVDA',
            name: 'NVIDIA Corporation',
            sector: 'Technology',
            currentPrice: 875.30,
            previousClose: 862.15,
            change: 13.15,
            changePercent: 1.53,
            volume: 31205400,
            marketCap: 2150000000000,
            isActive: true,
          },
        ];

        for (const stock of testStocks) {
          await storage.createStock(stock);
        }
        console.log(`Added ${testStocks.length} fallback test stocks`);
      }
    } catch (error) {
      console.error('Error adding fallback test data:', error);
    }
  }, 3000);

  // Get stocks with pagination
  app.get("/api/stocks", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const sortBy = req.query.sortBy as string;
      
      const { stocks, total } = await storage.getStocks(page, limit, sortBy);
      const hasMore = page * limit < total;

      res.json({
        stocks,
        hasMore,
        page,
        total,
      });
    } catch (error) {
      console.error('Error fetching stocks:', error);
      res.status(500).json({ message: "Failed to fetch stocks" });
    }
  });

  // Get single stock
  app.get("/api/stocks/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const stock = await storage.getStock(symbol);
      
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }

      res.json(stock);
    } catch (error) {
      console.error('Error fetching stock:', error);
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  // Get detailed stock information with financial metrics from Yahoo Finance
  app.get("/api/stocks/:symbol/details", async (req, res) => {
    try {
      const { symbol } = req.params;
      const upperSymbol = symbol.toUpperCase();
      
      // Get enhanced stock data from Yahoo Finance
      const detailedData = await stockDataService.getDetailedStockData(upperSymbol);
      
      if (!detailedData) {
        return res.status(404).json({ message: "Stock details not found" });
      }
      
      res.json(detailedData);
    } catch (error) {
      console.error(`Error fetching detailed stock data for ${req.params.symbol}:`, error);
      res.status(500).json({ message: "Failed to fetch stock details" });
    }
  });

  // Analyze stock with AI
  app.get("/api/stocks/:symbol/analysis", async (req, res) => {
    try {
      const { symbol } = req.params;
      const stock = await storage.getStock(symbol);
      
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }

      // Prepare stock data for analysis
      const stockData = {
        symbol: stock.symbol,
        name: stock.name,
        price: stock.currentPrice,
        change: stock.change,
        changePercent: stock.changePercent,
        volume: stock.volume,
        sector: stock.sector,
      };

      const analysis = await openAIService.analyzeStock(stockData);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing stock:', error);
      res.status(500).json({ message: "Failed to analyze stock" });
    }
  });

  // AI Expert Chat endpoint
  app.post("/api/chat/expert", async (req, res) => {
    try {
      const { messages, context } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array is required" });
      }

      // Validate message format
      for (const msg of messages) {
        if (!msg.role || !msg.content || !['user', 'assistant'].includes(msg.role)) {
          return res.status(400).json({ message: "Invalid message format" });
        }
      }

      const response = await openAIService.chatWithExpert(messages, context);
      res.json({ response });
    } catch (error) {
      console.error('Error in expert chat:', error);
      res.status(500).json({ message: "Failed to chat with expert" });
    }
  });

  // Get news for a stock
  app.get("/api/stocks/:symbol/news", async (req, res) => {
    try {
      const { symbol } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const stock = await storage.getStock(symbol);
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }

      const articles = await stockDataService.getNews(symbol, limit);
      
      res.json({
        articles,
        symbol,
        total: articles.length,
      });
    } catch (error) {
      console.error('Error fetching news:', error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // Search stocks (GET method for backward compatibility)
  app.get("/api/stocks/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 1) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // First search local storage
      let stocks = await storage.searchStocks(query);
      
      // If no local results, search APIs
      if (stocks.length === 0) {
        const apiStocks = await stockDataService.searchStocks(query);
        
        // Store new stocks in local storage
        for (const stock of apiStocks) {
          const existing = await storage.getStock(stock.symbol);
          if (!existing) {
            await storage.createStock(stock);
          }
          const savedStock = await storage.getStock(stock.symbol);
          if (savedStock) {
            stocks.push(savedStock);
          }
        }
      }

      res.json({ stocks });
    } catch (error) {
      console.error('Error searching stocks:', error);
      res.status(500).json({ message: "Failed to search stocks" });
    }
  });

  // Search stocks (POST method - matches frontend expectation)
  app.post("/api/stocks/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || query.length < 1) {
        return res.status(400).json({ message: "Search query is required" });
      }

      console.log(`Searching for stocks with query: "${query}"`);

      // First search local storage
      let stocks = await storage.searchStocks(query);
      console.log(`Found ${stocks.length} stocks in local storage`);
      
      // If no local results, search APIs
      if (stocks.length === 0) {
        console.log('No local results, searching external APIs...');
        const apiStocks = await stockDataService.searchStocks(query);
        console.log(`Found ${apiStocks.length} stocks from external APIs`);
        
        // Store new stocks in local storage
        for (const stock of apiStocks) {
          const existing = await storage.getStock(stock.symbol);
          if (!existing) {
            await storage.createStock(stock);
          }
          const savedStock = await storage.getStock(stock.symbol);
          if (savedStock) {
            stocks.push(savedStock);
          }
        }
      }

      console.log(`Returning ${stocks.length} search results`);
      res.json({ stocks });
    } catch (error) {
      console.error('Error searching stocks:', error);
      res.status(500).json({ message: "Failed to search stocks" });
    }
  });

  // Get market indices
  app.get("/api/market/indices", async (req, res) => {
    try {
      const indices = await storage.getMarketIndices();
      res.json({
        indices,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching market indices:', error);
      res.status(500).json({ message: "Failed to fetch market indices" });
    }
  });

  // Refresh stock data
  app.post("/api/stocks/refresh", async (req, res) => {
    try {
      const symbols = req.body.symbols as string[] || [];
      const stocks = await stockDataService.fetchStockData(symbols);
      
      for (const stock of stocks) {
        const existing = await storage.getStock(stock.symbol);
        if (existing) {
          await storage.updateStock(stock.symbol, stock);
        } else {
          await storage.createStock(stock);
        }
      }

      res.json({ message: "Stock data refreshed", count: stocks.length });
    } catch (error) {
      console.error('Error refreshing stock data:', error);
      res.status(500).json({ message: "Failed to refresh stock data" });
    }
  });

  // Watchlist operations
  app.get("/api/watchlist", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const watchlist = await storage.getWatchlist(userId);
      res.json(watchlist);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const validatedData = insertWatchlistSchema.parse(req.body);
      const item = await storage.addToWatchlist(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid watchlist data", errors: error.errors });
      }
      console.error('Error adding to watchlist:', error);
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/watchlist/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const userId = req.query.userId as string;
      
      const removed = await storage.removeFromWatchlist(symbol, userId);
      
      if (!removed) {
        return res.status(404).json({ message: "Watchlist item not found" });
      }

      res.json({ message: "Removed from watchlist" });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  // Health check endpoint for deployment readiness
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
