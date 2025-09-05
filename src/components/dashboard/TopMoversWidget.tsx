"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { TopMoversApiService } from "@/lib/top-movers-api";
import type { StockData } from "@/types/top-movers";

const LIMIT = 5; // compact view for dashboard

export default function TopMoversWidget() {
  const [gainers, setGainers] = useState<StockData[]>([]);
  const [losers, setLosers] = useState<StockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, l] = await Promise.all([
        TopMoversApiService.getTopGainers(),
        TopMoversApiService.getTopLosers(),
      ]);

      const gainersData = (g?.results || []).slice(0, LIMIT);
      const losersData = (l?.results || []).slice(0, LIMIT);

      setGainers(gainersData);
      setLosers(losersData);

      if (gainersData.length === 0 && losersData.length === 0) {
        setError("No top movers available right now. Market may be closed or data unavailable.");
      }
    } catch (e: any) {
      setError(
        typeof e?.message === "string"
          ? e.message
          : "Failed to load Top Movers. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // initial load only; avoid intervals to not affect dashboard perf
    loadData();
  }, [loadData]);

  const Row = ({ item, type }: { item: StockData; type: "g" | "l" }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-xs shrink-0 ${
            type === "g" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {item.ticker?.[0] || "?"}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{item.ticker}</div>
          <div className="text-xs text-muted-foreground truncate">{item.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold">${item.value?.toFixed(2)}</div>
        <div
          className={`text-xs font-medium ${
            (item.change_percent || 0) >= 0 ? "text-green-600" : "text-red-600"
          } flex items-center justify-end gap-1`}
        >
          {(item.change_percent || 0) >= 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {`${(item.change_percent || 0) > 0 ? "+" : ""}${(item.change_percent || 0).toFixed(2)}%`}
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Top Movers</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div>{error}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold">Top Gainers</span>
            </div>
            <div className="bg-muted/30 rounded-md p-2">
              {loading && gainers.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
              ) : gainers.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No data</div>
              ) : (
                gainers.map((g) => <Row key={g.ticker} item={g} type="g" />)
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold">Top Losers</span>
            </div>
            <div className="bg-muted/30 rounded-md p-2">
              {loading && losers.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
              ) : losers.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No data</div>
              ) : (
                losers.map((l) => <Row key={l.ticker} item={l} type="l" />)
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
