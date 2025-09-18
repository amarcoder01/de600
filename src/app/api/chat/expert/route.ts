import { NextRequest, NextResponse } from "next/server";
import { OpenAIStockService } from "@/lib/services/openai";

const openAIService = new OpenAIStockService();

// POST /api/chat/expert - AI Expert Chat endpoint
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

    const response = await openAIService.chatWithExpert(messages, context);
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in expert chat:', error);
    return NextResponse.json(
      { message: "Failed to chat with expert" },
      { status: 500 }
    );
  }
}
