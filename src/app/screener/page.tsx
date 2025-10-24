'use client'

import React from 'react';
import StockScreener from '@/components/screener/StockScreener';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ScreenerPage() {
  const router = useRouter();

  const handleBack = () => {
    const canGoBack = typeof window !== 'undefined' && ((window.history?.state as any)?.idx ?? 0) > 0;
    if (canGoBack) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 lg:px-8 pt-4">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  aria-label="Go back"
                  className="h-8 w-8 p-0 transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <ArrowLeft className="w-4 h-4 transition-colors hover:text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                Back to dashboard
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold">Stock Screener</h1>
            <span className="hidden sm:inline text-sm text-muted-foreground">Advanced filters, AI insights, and bulk analysis</span>
          </div>
        </div>
      </div>
      <StockScreener />
    </div>
  );
}
