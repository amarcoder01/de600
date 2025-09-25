import React from 'react';
import SmartScreener from '@/components/screener/SmartScreener';

export default function SmartScreenerPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            AI-Powered Stock Screener
          </h1>
          <p className="text-muted-foreground">
            Use natural language to find stocks that match your criteria. 
            Ask questions like "Find tech stocks with high growth" or "Show me dividend stocks under $50".
          </p>
        </div>
        <SmartScreener />
      </div>
    </div>
  );
}