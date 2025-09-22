// components/CandleChart.tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  type Time,
  type ISeriesApi,
  type LineData,
  type CandlestickData,
} from "lightweight-charts";
import { atr, lastSwingLow, sma, supports, type Bar } from "@/lib/indicators";

export type OHLC = Bar;

type StopPlan =
  | { mode: "atr"; atrPeriod?: number; atrMult?: number }
  | { mode: "percent"; percent: number } // % de riesgo respecto a entry
  | { mode: "swing"; lookback?: number };

type Side = "auto" | "long" | "short";

type CandleChartProps = {
  data: OHLC[];
  className?: string;
  sma?: { p20?: boolean; p50?: boolean; p200?: boolean };
  /** Plan de stop (si no das stopAbs). */
  stop?: StopPlan;
  /** Stop absoluto (nivel de precio). Si lo das, tiene prioridad sobre `stop`. */
  stopAbs?: number | null;
  /** Lista de objetivos R a dibujar. */
  rMultiples?: number[];
  /** Soportes (si omites, usa defaults internos). */
  supports?: { lookback?: number; strength?: number; maxLevels?: number };
  /** Precio de entrada (si no lo das, se usa el último cierre). */
  entryPrice?: number;
  /** LONG/SHORT automático por defecto (según entry/stop). */
  side?: Side;
  /** Alto en px (si no, auto). */
  height?: number;
};

/* ===== helpers de color (Tailwind v4 puede dar lab()/oklab()) ===== */
function isParsableColor(c?: string | null): boolean {
  if (!c) return false;
  const s = new Option().style;
  try {
    s.color = "";
    s.color = c;
    return s.color !== "";
  } catch {
    return false;
  }
}
function safeColor(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback;
  const c = String(input).trim();
  if (!c || c.startsWith("lab(") || c.startsWith("oklab(") || c.startsWith("var(")) return fallback;
  return isParsableColor(c) ? c : fallback;
}
function getThemeColors(): { background: string; text: string; grid: string } {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const styles = getComputedStyle(root);
  const bgVar = styles.getPropertyValue("--background");
  const fgVar = styles.getPropertyValue("--foreground");
  const background = safeColor(bgVar, "transparent");
  const text = safeColor(fgVar, isDark ? "#cbd5e1" : "#475569");
  const grid = "rgba(120,120,120,0.12)";
  return { background, text, grid };
}

export default function CandleChart({
  data,
  className,
  sma: smaCfg,
  stop,
  stopAbs,
  rMultiples,
  supports: srCfg,
  entryPrice,
  side = "auto",
  height,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // flags SMA
  const showSMA20 = smaCfg?.p20 ?? true;
  const showSMA50 = smaCfg?.p50 ?? true;
  const showSMA200 = smaCfg?.p200 ?? true;

  const rList = (rMultiples && rMultiples.length ? rMultiples : [1, 2, 3]).slice(0, 6);
  const srParams = {
    lookback: srCfg?.lookback ?? 120,
    strength: srCfg?.strength ?? 2,
    maxLevels: srCfg?.maxLevels ?? 4,
  };

  const closeArr = useMemo(() => data.map((d) => d.close), [data]);
  const sma20 = useMemo(() => (showSMA20 ? sma(closeArr, 20) : null), [closeArr, showSMA20]);
  const sma50 = useMemo(() => (showSMA50 ? sma(closeArr, 50) : null), [closeArr, showSMA50]);
  const sma200 = useMemo(() => (showSMA200 ? sma(closeArr, 200) : null), [closeArr, showSMA200]);

  const atrArr = useMemo(() => atr(data, (stop as any)?.atrPeriod ?? 14), [data, stop]);
  const levels = useMemo(
    () => supports(data, srParams.lookback, srParams.strength, srParams.maxLevels),
    [data, srParams]
  );

  // ===== Cálculo entry/stop/side/risk/targets =====
  const calc = useMemo(() => {
    const last = data.at(-1);
    const entry = (entryPrice ?? (last ? last.close : NaN)) as number;

    // Determinar stop (prioridad a stopAbs)
    let stopPrice: number | null = null;

    if (typeof stopAbs === "number" && Number.isFinite(stopAbs)) {
      stopPrice = stopAbs;
    } else if (stop?.mode === "percent") {
      // % siempre respecto a entry. Para LONG: stop por debajo; para SHORT: por encima.
      // Lo fijamos más abajo tras decidir el side final.
      stopPrice = null;
    } else if (stop?.mode === "swing") {
      const low = lastSwingLow(data, stop.lookback ?? 20);
      stopPrice = low ?? null;
    } else {
      // ATR por defecto si nada definido
      const lastAtr = atrArr?.at(-1) ?? null;
      stopPrice =
        lastAtr != null && Number.isFinite(lastAtr)
          ? entry - ((stop as any)?.atrMult ?? 2) * lastAtr
          : null;
    }

    // Determinar side final
    let finalSide: "long" | "short" = "long";
    if (side !== "auto") {
      finalSide = side;
    } else if (stopPrice != null && Number.isFinite(stopPrice)) {
      finalSide = stopPrice > entry ? "short" : "long";
    } else {
      // Si no hay stop aún (p.ej. percent), asumimos LONG temporalmente
      finalSide = "long";
    }

    // Si el stop era por % y no lo fijamos antes, ahora lo calculamos según side
    if (stop?.mode === "percent" && (stopPrice == null || !Number.isFinite(stopPrice))) {
      const delta = entry * (stop.percent / 100);
      stopPrice = finalSide === "long" ? entry - delta : entry + delta;
    }

    // Riesgo por acción
    let risk = NaN;
    if (stopPrice != null && Number.isFinite(stopPrice)) {
      risk = finalSide === "long" ? entry - stopPrice : stopPrice - entry;
    }

    // Objetivos
    const targets =
      Number.isFinite(risk) && risk > 0
        ? rList.map((R) => (finalSide === "long" ? entry + R * risk : entry - R * risk))
        : [];

    return { entry, stopPrice: stopPrice ?? NaN, side: finalSide, risk, targets };
  }, [data, entryPrice, stopAbs, stop, atrArr, rList, side]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !data?.length) return;

    const theme = getThemeColors();

    // ✅ Evita mezclar ?? y || en la misma expresión: usa resolvedHeight
    const resolvedHeight =
      (typeof height === "number" ? height : undefined) ??
      (el?.clientHeight ?? undefined) ??
      420;

    const chart = createChart(el, {
      height: resolvedHeight,
      autoSize: typeof height === "number" ? false : true,
      layout: {
        background: { color: theme.background },
        textColor: theme.text,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      rightPriceScale: { mode: PriceScaleMode.Normal, borderVisible: false },
      timeScale: { rightOffset: 6, barSpacing: 6, borderVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const main = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderVisible: false,
    });

    const candleData: CandlestickData[] = data.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    main.setData(candleData);

    // SMAs
    const lineSeries: ISeriesApi<"Line">[] = [];
    const addSMA = (serie: (number | null)[] | null, width: number, color: string) => {
      if (!serie) return;
      const ls = chart.addLineSeries({ lineWidth: width, color, priceLineVisible: false });
      const pts: LineData[] = [];
      for (let i = 0; i < data.length; i++) {
        const v = serie[i];
        if (v != null) pts.push({ time: data[i].time as Time, value: v });
      }
      ls.setData(pts);
      lineSeries.push(ls);
    };
    if (showSMA20) addSMA(sma20!, 2, "#9c27b0");
    if (showSMA50) addSMA(sma50!, 2, "#1976d2");
    if (showSMA200) addSMA(sma200!, 2, "#ff9800");

    // Líneas de precio: entrada, stop, R
    const priceLines: Array<ReturnType<typeof main.createPriceLine>> = [];
    if (Number.isFinite(calc.entry)) {
      priceLines.push(
        main.createPriceLine({
          price: calc.entry!,
          color: "#42a5f5",
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "Entrada",
        })
      );
    }
    if (Number.isFinite(calc.stopPrice)) {
      priceLines.push(
        main.createPriceLine({
          price: calc.stopPrice!,
          color: "#ef5350",
          lineWidth: 2,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: "Stop",
        })
      );
    }
    if (Number.isFinite(calc.risk) && calc.risk! > 0) {
      calc.targets.forEach((p, i) => {
        priceLines.push(
          main.createPriceLine({
            price: p,
            color: "#66bb6a",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `${i + 1}R`,
          })
        );
      });
    }

    // Soportes
    const srLines: Array<ReturnType<typeof main.createPriceLine>> = [];
    levels.forEach((lvl, i) => {
      srLines.push(
        main.createPriceLine({
          price: lvl,
          color: "rgba(160,160,160,0.9)",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `S${i + 1}`,
        })
      );
    });

    chart.timeScale().fitContent();

    let ro: ResizeObserver | null = null;
    if (!height) {
      ro = new ResizeObserver(() => {
        const rect = el.getBoundingClientRect();
        chart.applyOptions({ width: Math.floor(rect.width) });
      });
      ro.observe(el);
    }
    return () => {
      ro?.disconnect();
      chart.remove();
    };
  }, [
    data,
    height,
    showSMA20,
    showSMA50,
    showSMA200,
    levels.map((x) => x.toFixed(4)).join(","),
    // recalcular cuando cambian parámetros clave:
    calc.entry,
    calc.stopPrice,
    (calc.targets || []).map((t) => t.toFixed(6)).join(","),
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        height: height ? `${height}px` : "100%",
        minHeight: height ? undefined : 380,
      }}
    />
  );
}
