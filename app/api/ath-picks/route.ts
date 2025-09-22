import { NextResponse } from "next/server";
import us from "@/data/universe-us.json";
import sp500 from "@/data/universe-sp500.json";
import eu from "@/data/universe-eu.json";

/* ============ Utils ============ */
function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/* ============ Cache ============ */
const CACHE_TTL_MS = 10 * 60 * 1000;
type CacheEntry = { ts: number; payload: any };
const cache = new Map<string, CacheEntry>();
async function cached(key: string, compute: () => Promise<any>) {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.ts < CACHE_TTL_MS) return hit.payload;
  const payload = await compute();
  cache.set(key, { ts: now, payload });
  return payload;
}

/* ============ Tipos / Yahoo ============ */
type OHLC = { time: number; open: number; high: number; low: number; close: number; volume: number };

function toYahoo(interval: "1d" | "1w" | "1mo", range: "1M" | "3M" | "6M" | "1A" | "MAX") {
  const mapInt: Record<string, string> = { "1d": "1d", "1w": "1wk", "1mo": "1mo" };
  const mapRange: Record<string, string> = { "1M": "1mo", "3M": "3mo", "6M": "6mo", "1A": "1y", "MAX": "max" };
  return { interval: mapInt[interval], range: mapRange[range] };
}
async function fetchYahooBars(symbol: string, tf: "1d" | "1w" | "1mo", range: "1M" | "3M" | "6M" | "1A" | "MAX"): Promise<OHLC[]> {
  const { interval, range: r } = toYahoo(tf, range);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${r}`;
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo ${symbol} ${res.status}`);
  const j = await res.json();

  const result = j?.chart?.result?.[0];
  const t: number[] = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0] ?? {};
  const o: number[] = q.open ?? [], h: number[] = q.high ?? [], l: number[] = q.low ?? [], c: number[] = q.close ?? [], v: number[] = q.volume ?? [];

  const out: OHLC[] = [];
  for (let i = 0; i < t.length; i++) {
    const open = o[i], high = h[i], low = l[i], close = c[i], vol = v[i];
    if ([open, high, low, close].some((x) => x == null || Number.isNaN(x))) continue;
    out.push({ time: t[i], open, high, low, close, volume: vol ?? 0 });
  }
  return out;
}

/* ============ Helpers ATH ============ */
function maxClose(data: OHLC[]) { return data.length===0 ? NaN : Math.max(...data.map(d=>d.close)); }
function maxCloseIndex(data: OHLC[]) { let mi=-1,mv=-Infinity; for(let i=0;i<data.length;i++){ if(data[i].close>mv){mv=data[i].close; mi=i;} } return mi; }
function minLowInWindow(data: OHLC[], lookback: number) {
  if (data.length === 0) return NaN;
  const n = Math.max(1, Math.min(lookback, data.length));
  const slice = data.slice(-n);
  return Math.min(...slice.map((d) => d.low));
}
const isFiniteNum = (x: any): x is number => typeof x === "number" && Number.isFinite(x);

/* ============ Handler ============ */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const market = (searchParams.get("market") as "us50" | "sp500" | "eu") || "us50";
    const tf = (searchParams.get("tf") as "1d" | "1w" | "1mo") || "1d";
    const range = (searchParams.get("range") as "1M" | "3M" | "6M" | "1A" | "MAX") || "MAX";
    const strict = (searchParams.get("strict") ?? "true") === "true";
    const tolPct = Number(searchParams.get("tolPct") ?? "0.5");
    const recentDays = Number(searchParams.get("recentDays") ?? "30");
    const lookback = Number(searchParams.get("lookback") ?? "60");

    const cacheKey = JSON.stringify({ market, tf, range, strict, tolPct, recentDays, lookback });
    const payload = await cached(cacheKey, async () => {
      let universe: string[] = [];
      if (market === "us50") universe = (us as string[]);
      else if (market === "sp500") universe = (sp500 as string[]);
      else universe = (eu as string[]);

      const symbols = universe.slice(0, 120);
      const concurrency = 6;
      const chunks: string[][] = [];
      for (let i = 0; i < symbols.length; i += concurrency) chunks.push(symbols.slice(i, i + concurrency));

      const picks: any[] = [];

      for (const batch of chunks) {
        const batchRes = await Promise.allSettled(
          batch.map(async (sym) => {
            const data = await fetchYahooBars(sym, tf, range);
            if (data.length < 30) return null;

            const last = data[data.length - 1];
            const ath = maxClose(data);
            if (!isFiniteNum(ath)) return null;

            const ddPct = ((ath - last.close) / ath) * 100;
            const idxAth = maxCloseIndex(data);
            const isRecent = recentDays > 0 ? data.length - 1 - idxAth <= recentDays : true;

            const supportRaw = minLowInWindow(data, Math.max(10, lookback));
            const support = isFiniteNum(supportRaw) ? Number(supportRaw.toFixed(2)) : null;

            const condATH = strict ? (last.close >= ath && idxAth === data.length - 1) : ddPct <= tolPct;
            if (!isRecent) return null;

            const holdsSupport = support != null ? last.close > support : true;

            if (condATH && holdsSupport) {
              return {
                symbol: sym,
                lastClose: Number(last.close.toFixed(2)),
                maxClose: Number(ath.toFixed(2)),
                ddPct: Number(ddPct.toFixed(2)),
                lastSwingLow: support,
                rationale: strict
                  ? `Nuevo ATH confirmado${support != null ? " y por encima del soporte reciente" : ""}.`
                  : `A ≤ ${tolPct}% del ATH${support != null ? " y por encima del soporte reciente" : ""}.`,
              };
            }
            return null;
          })
        );

        for (const r of batchRes) {
          if (r.status === "fulfilled" && r.value) picks.push(r.value);
        }
      }

      const uniq = Array.from(new Map(picks.map((p) => [p.symbol, p])).values());
      uniq.sort((a, b) => {
        const dd = a.ddPct - b.ddPct;
        if (dd !== 0) return dd;
        const aBuff = isFiniteNum(a.lastSwingLow) ? a.lastClose - a.lastSwingLow : -Infinity;
        const bBuff = isFiniteNum(b.lastSwingLow) ? b.lastClose - b.lastSwingLow : -Infinity;
        return bBuff - aBuff;
      });

      const top = uniq.slice(0, 20);

      return {
        ok: true,
        picks: top,
        updatedAt: new Date().toISOString(),
        meta: { market, tf, range, strict, tolPct, recentDays, lookback, scanned: symbols.length },
      };
    });

    return json(payload, 200);
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "Error inesperado" }, 200);
  }
}
