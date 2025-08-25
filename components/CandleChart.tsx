"use client";

import React, { useEffect, useRef } from "react";
import { createChart, ColorType, ISeriesApi } from "lightweight-charts";

type Bar = { time:number; open:number; high:number; low:number; close:number; volume:number };

type SRLevels = { support?: number | null; resistance?: number | null } | null | undefined;
type RiskPlan = { entry?: number | null; stop?: number | null } | null | undefined;

type CandleChartProps = {
  data: Bar[];
  sma20?: boolean;
  sma50?: boolean;
  sma200?: boolean;
  sr?: SRLevels;
  riskPlan?: RiskPlan;
};

const isFiniteNum = (x: any): x is number =>
  typeof x === "number" && Number.isFinite(x);

function calcSMA(bars: Bar[], length: number) {
  if (!bars || bars.length === 0) return [];
  const vals = bars.map(b => b.close);
  const out: { time:number; value:number }[] = [];
  for (let i=0; i<vals.length; i++){
    if (i < length-1) continue;
    const slice = vals.slice(i-length+1, i+1);
    const avg = slice.reduce((a,b)=>a+b,0)/length;
    out.push({ time: bars[i].time, value: avg });
  }
  return out;
}

export default function CandleChart({
  data,
  sma20,
  sma50,
  sma200,
  sr = null,
  riskPlan = null,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const sma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma200Ref = useRef<ISeriesApi<"Line"> | null>(null);

  const srLinesRef = useRef<any[]>([]);
  const orderLinesRef = useRef<any[]>([]);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  /* ---------- 1) Crear chart UNA VEZ (mount) ---------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || chartRef.current) return;

    chartRef.current = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#333",
      },
      grid: {
        vertLines: { visible: true, color: "#eee" },
        horzLines: { visible: true, color: "#eee" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      autoSize: true,
    });

    candleRef.current = chartRef.current.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // Resize estable
    const ro = new ResizeObserver(() => {
      if (!chartRef.current || !containerRef.current) return;
      chartRef.current.applyOptions({ autoSize: true });
    });
    ro.observe(el);
    resizeObsRef.current = ro;

    return () => {
      // Cleanup SOLO al desmontar
      try { resizeObsRef.current?.disconnect(); } catch {}
      resizeObsRef.current = null;

      try { chartRef.current?.remove(); } catch {}
      chartRef.current = null;
      candleRef.current = null;

      sma20Ref.current = null;
      sma50Ref.current = null;
      sma200Ref.current = null;

      srLinesRef.current = [];
      orderLinesRef.current = [];
    };
  }, []);

  /* ---------- 2) Actualizar datos y overlays (cada cambio) ---------- */
  useEffect(() => {
    // Si aún no existe el chart (primer render), no hacemos nada
    if (!chartRef.current || !candleRef.current) return;

    // 2.1) Datos de velas
    try {
      candleRef.current.setData(data ?? []);
    } catch {}

    // 2.2) Limpiar overlays previos de forma segura (sin eliminar chart)
    try { sma20Ref.current?.setData([]); } catch {}
    try { sma50Ref.current?.setData([]); } catch {}
    try { sma200Ref.current?.setData([]); } catch {}

    for (const l of srLinesRef.current) { try { l.remove(); } catch {} }
    srLinesRef.current = [];

    for (const l of orderLinesRef.current) { try { l.remove(); } catch {} }
    orderLinesRef.current = [];

    // 2.3) Añadir SMAs solicitadas
    try {
      if (sma20) {
        sma20Ref.current = chartRef.current.addLineSeries({ color:"#3b82f6", lineWidth:1 });
        sma20Ref.current.setData(calcSMA(data,20));
      } else {
        sma20Ref.current = null;
      }
      if (sma50) {
        sma50Ref.current = chartRef.current.addLineSeries({ color:"#f59e0b", lineWidth:1 });
        sma50Ref.current.setData(calcSMA(data,50));
      } else {
        sma50Ref.current = null;
      }
      if (sma200) {
        sma200Ref.current = chartRef.current.addLineSeries({ color:"#10b981", lineWidth:1 });
        sma200Ref.current.setData(calcSMA(data,200));
      } else {
        sma200Ref.current = null;
      }
    } catch {}

    // 2.4) Soporte / Resistencia
    const mkHoriz = (y: number, color: string, w=1, style=2) => {
      if (!chartRef.current) return null;
      try {
        const line = chartRef.current.addHorizontalLine(y, { color, lineWidth: w, lineStyle: style });
        srLinesRef.current.push(line);
        return line;
      } catch { return null; }
    };
    if (sr && isFiniteNum(sr.support)) mkHoriz(sr.support, "#60a5fa");   // azul
    if (sr && isFiniteNum(sr.resistance)) mkHoriz(sr.resistance, "#f59e0b"); // naranja

    // 2.5) Plan de riesgo (entrada/stop)
    const mkOrder = (y: number, color: string, w=2) => {
      if (!chartRef.current) return null;
      try {
        const line = chartRef.current.addHorizontalLine(y, { color, lineWidth: w });
        orderLinesRef.current.push(line);
        return line;
      } catch { return null; }
    };
    if (riskPlan && isFiniteNum(riskPlan.entry)) mkOrder(riskPlan.entry, "#22c55e"); // verde
    if (riskPlan && isFiniteNum(riskPlan.stop)) mkOrder(riskPlan.stop, "#ef4444");   // rojo
  }, [data, sma20, sma50, sma200, sr, riskPlan]);

  return <div ref={containerRef} className="w-full h-80" />;
}
