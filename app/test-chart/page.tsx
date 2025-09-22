// app/test-chart/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import CandleChart from "@/components/CandleChart";

type OHLC = {
  time: number; open: number; high: number; low: number; close: number; volume: number;
};

type Tf = "1d" | "1w" | "1mo";
type Range = "1M" | "3M" | "6M" | "1A" | "MAX";

const DEFAULT_SYMBOL = "AAPL";
const DEFAULT_TF: Tf = "1d";
const DEFAULT_RANGE: Range = "6M";

// intenta extraer un array de OHLC de distintas formas comunes
function normalizePricesResponse(j: any): OHLC[] | null {
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j?.prices)) return j.prices;
  if (Array.isArray(j?.result)) return j.result;
  // si vino { ok:false, error }, no hay datos válidos
  return null;
}

export default function TestChartPage() {
  const [symbol, setSymbol] = useState<string>(DEFAULT_SYMBOL);
  const [tf, setTf] = useState<Tf>(DEFAULT_TF);
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<OHLC[]>([]);

  // stop plan UI
  const [stopMode, setStopMode] = useState<"atr" | "percent" | "swing">("atr");
  const [atrPeriod, setAtrPeriod] = useState(14);
  const [atrMult, setAtrMult] = useState(2);
  const [pct, setPct] = useState(5);
  const [swingLb, setSwingLb] = useState(20);

  useEffect(() => {
    const s = (symbol || "").trim().toUpperCase();
    if (!s) return;
    const params = new URLSearchParams({ symbol: s, tf, range });
    setLoading(true);
    setErr(null);

    fetch(`/api/prices?${params.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          // intenta leer json de error
          let msg = `HTTP ${r.status}`;
          try {
            const ej = await r.json();
            if (ej?.error) msg += ` - ${ej.error}`;
          } catch {}
          throw new Error(msg);
        }
        const j = await r.json();
        const bars = normalizePricesResponse(j);
        if (!bars || !Array.isArray(bars)) {
          throw new Error(`Respuesta inesperada de /api/prices. keys=${Object.keys(j || {}).join(",")}`);
        }
        return bars as OHLC[];
      })
      .then((bars) => {
        // sanity check de formato
        const valid = Array.isArray(bars) && bars.every(b =>
          typeof b?.time === "number" &&
          typeof b?.open === "number" &&
          typeof b?.high === "number" &&
          typeof b?.low === "number" &&
          typeof b?.close === "number"
        );
        if (!valid) throw new Error("El payload no tiene formato OHLC válido.");
        setData(bars);
      })
      .catch((e: any) => {
        console.error(e);
        setErr(`Error al cargar datos: ${e?.message || e}. Usando datos mock para validar el gráfico.`);
        // fallback mock para validar el dibujo
        const now = Math.floor(Date.now() / 1000);
        const mock: OHLC[] = [];
        let price = 100;
        for (let i = 60; i >= 0; i--) {
          const t = now - i * 24 * 3600;
          const vol = 1000000 + Math.floor(Math.random() * 100000);
          const drift = (Math.random() - 0.5) * 2;
          const open = price;
          const high = open + Math.max(0.1, Math.random() * 2 + drift);
          const low = open - Math.max(0.1, Math.random() * 2 - drift);
          const close = open + (Math.random() - 0.5) * 1.5;
          price = close;
          mock.push({ time: t, open, high, low, close, volume: vol });
        }
        setData(mock);
      })
      .finally(() => setLoading(false));
  }, [symbol, tf, range]);

  const stop =
    stopMode === "atr"
      ? ({ mode: "atr", atrPeriod, atrMult } as const)
      : stopMode === "percent"
      ? ({ mode: "percent", percent: pct } as const)
      : ({ mode: "swing", lookback: swingLb } as const);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Validación: CandleChart Avanzado</h1>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Símbolo</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL, MSFT, TSLA..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Timeframe</label>
          <select className="border rounded px-2 py-1 w-full" value={tf} onChange={(e) => setTf(e.target.value as Tf)}>
            <option value="1d">1d</option>
            <option value="1w">1w</option>
            <option value="1mo">1mo</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Rango</label>
          <select className="border rounded px-2 py-1 w-full" value={range} onChange={(e) => setRange(e.target.value as Range)}>
            <option value="1M">1M</option>
            <option value="3M">3M</option>
            <option value="6M">6M</option>
            <option value="1A">1A</option>
            <option value="MAX">MAX</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Plan de Stop</label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={stopMode}
            onChange={(e) => setStopMode(e.target.value as any)}
          >
            <option value="atr">ATR</option>
            <option value="percent">% fijo</option>
            <option value="swing">Swing Low</option>
          </select>
        </div>
      </div>

      {stopMode === "atr" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">ATR Period</label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-full"
              value={atrPeriod}
              onChange={(e) => setAtrPeriod(parseInt(e.target.value || "14", 10))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">ATR Mult</label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-full"
              value={atrMult}
              onChange={(e) => setAtrMult(parseFloat(e.target.value || "2"))}
            />
          </div>
        </div>
      )}

      {stopMode === "percent" && (
        <div className="space-y-1">
          <label className="text-sm font-medium">% Stop</label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-full"
            value={pct}
            onChange={(e) => setPct(parseFloat(e.target.value || "5"))}
          />
        </div>
      )}

      {stopMode === "swing" && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Lookback Swing Low</label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-full"
            value={swingLb}
            onChange={(e) => setSwingLb(parseInt(e.target.value || "20", 10))}
          />
        </div>
      )}

      {err && <div className="text-sm text-amber-600">{err}</div>}
      {loading && <div className="text-sm opacity-70">Cargando datos…</div>}

      <div className="border rounded-md" style={{ height: 520 }}>
        <CandleChart
          data={data}
          sma={{ p20: true, p50: true, p200: true }}
          stop={stop}
          rMultiples={[1, 2, 3]}
          supports={{ lookback: 150, strength: 3, maxLevels: 4 }}
          height={520}
        />
      </div>
    </div>
  );
}
