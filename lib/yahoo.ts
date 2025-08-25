// lib/yahoo.ts
import yahooFinance from "yahoo-finance2";

export type YFBar = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type TF = "5m" | "15m" | "30m" | "60m" | "1d" | "1w" | "1mo";

function tfToInterval(tf: TF) {
  // Yahoo no ofrece 15m/30m en todos; si falla, usa 60m o 1d.
  switch (tf) {
    case "5m": return "5m";
    case "15m": return "15m";
    case "30m": return "30m";
    case "60m": return "60m";
    case "1d": return "1d";
    case "1w": return "1wk";
    case "1mo": return "1mo";
    default: return "1d";
  }
}

export async function fetchYahooBars(symbol: string, tf: TF, rangeDays: number): Promise<YFBar[]> {
  const interval = tfToInterval(tf);
  // Rango temporal: restamos 'rangeDays' desde hoy
  const end = new Date();
  const start = new Date(end.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  const queryOptions = {
    period1: start,          // fecha inicio
    period2: end,            // fecha fin
    interval: interval as any,
    events: "history" as const,
    includeAdjustedClose: true,
    // note: Yahoo aplica límites; si pide demasiado intradía, reduce rangeDays
  };

  const res = await yahooFinance.historical(symbol, queryOptions).catch(() => []);
  // Adaptar a tu OHLC interno
  return res
    .filter((r) => r.open != null && r.close != null && r.high != null && r.low != null)
    .map((r) => ({
      time: (r.date as unknown as Date).getTime() / 1000,
      open: r.open!,
      high: r.high!,
      low: r.low!,
      close: r.close!,
      volume: (r.volume ?? 0) as number,
    }));
}
