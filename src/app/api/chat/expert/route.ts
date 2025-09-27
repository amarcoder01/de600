import { NextRequest, NextResponse } from "next/server";
import { OpenAIStockService } from "@/lib/services/openai";
import { StockDataService } from "@/lib/services/stockDataService";

const openAIService = new OpenAIStockService();
const stockDataService = new StockDataService();

// POST /api/chat/expert - AI Expert Chat endpoint with real-time data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { message: "Messages array is required" },
        { status: 400 }
      );
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content || !['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          { message: "Invalid message format" },
          { status: 400 }
        );
      }
    }

    // Extract stock symbol from context or message content
    let stockSymbol = context?.symbol;
    if (!stockSymbol) {
      // Try to extract stock symbol from the last user message
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        const symbolMatch = lastUserMessage.content.match(/\b([A-Z]{1,5})\b/g);
        if (symbolMatch) {
          stockSymbol = symbolMatch[symbolMatch.length - 1]; // Take the last found symbol
        }
      }
    }

    // Fetch real-time stock data if symbol is available
    let realTimeData = null;
    if (stockSymbol) {
      try {
        console.log(`🔍 TreadGPT: Fetching real-time data for ${stockSymbol}...`);
        realTimeData = await stockDataService.getDetailedStockData(stockSymbol);
        if (realTimeData) {
          console.log(`✅ TreadGPT: Got real-time data for ${stockSymbol}: $${realTimeData.currentPrice}, Volume: ${realTimeData.volume}, Market Cap: ${realTimeData.marketCap}`);
        } else {
          console.log(`❌ TreadGPT: No real-time data returned for ${stockSymbol}`);
        }
      } catch (error) {
        console.error(`❌ TreadGPT: Failed to fetch real-time data for ${stockSymbol}:`, error);
      }
    } else {
      console.log(`⚠️ TreadGPT: No stock symbol provided in context or extracted from message`);
    }

    // Enhanced context with real-time data
    const enhancedContext = {
      ...context,
      symbol: stockSymbol,
      realTimeData: realTimeData,
      timestamp: new Date().toISOString(),
      dataSource: realTimeData ? 'real-time' : 'analysis-only'
    };

    console.log(`🤖 TreadGPT: Sending to AI with context:`, {
      symbol: stockSymbol,
      hasRealTimeData: !!realTimeData,
      dataSource: enhancedContext.dataSource
    });

    const response = await openAIService.chatWithExpert(messages, enhancedContext);
    
    console.log(`✅ TreadGPT: AI response generated, length: ${response.length} characters`);
    
    return NextResponse.json({ 
      response,
      dataUsed: realTimeData ? {
        symbol: stockSymbol,
        price: realTimeData.currentPrice,
        change: realTimeData.change,
        changePercent: realTimeData.changePercent,
        volume: realTimeData.volume,
        marketCap: realTimeData.marketCap,
        timestamp: new Date().toISOString()
      } : null
    });
  } catch (error) {
    console.error('Error in expert chat:', error);
    return NextResponse.json(
      { message: "Failed to chat with expert" },
      { status: 500 }
    );
  }
}
