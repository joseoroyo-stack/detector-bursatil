import type { OHLC } from "./indicators";
import {
  sma, macd, rollingMax, rollingMin,
  crossedAbove, crossedBelow, calcSupportResistance
} from "./indicators";

export type TechSignal = {
  kind:
    | "breakout_alcista"
    | "breakdown_bajista"
    | "golden_cross"
    | "death_cross"
    | "pullback_sano"
    | "volumen_pico"
    | "macd_bull_cross"
    | "macd_bear_cross"
    | "toque_soporte"
    | "toque_resistencia"
    | "ruptura_resistencia"
    | "ruptura_soporte"
    | "engulfing_alcista"
    | "engulfing_bajista";
  strength: "fuerte" | "moderado" | "ligero";
  note: string;
  bias: "bull" | "bear";
};

function isBullEngulfing(prev: OHLC, curr: OHLC) {
  const prevBear = prev.close < prev.open;
  const currBull = curr.close > curr.open;
  const bodyCovers = curr.open <= prev.close && curr.close >= prev.open;
  return prevBear && currBull && bodyCovers;
}

function isBearEngulfing(prev: OHLC, curr: OHLC) {
  const prevBull = prev.close > prev.open;
  const currBear = curr.close < curr.open;
  const bodyCovers = curr.open >= prev.close && curr.close <= prev.open;
  return prevBull && currBear && bodyCovers;
}

/** Sistema minimalista (estilo Eurekers): Tendencia + Momentum + Volumen + Estructura/Patrón */
export function detectSignalsMinimal(data: OHLC[]) {
  const closes = data.map(d => d.close);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const macdAll = macd(closes, 12, 26, 9);
  const sr = calcSupportResistance(data, 20);

  const idx = closes.length - 1;
  const hi20 = rollingMax(data.map(d => d.high), 20);
  const lo20 = rollingMin(data.map(d => d.low), 20);

  const signals: TechSignal[] = [];

  // Familias ponderadas
  let fTrend = 0;     // 45%
  let fMomentum = 0;  // 30%
  let fVolume = 0;    // 15%
  let fStruct = 0;    // 10%

  // Donchian 20 (breakout/breakdown) → Tendencia
  if (hi20[idx] != null && closes[idx] > (hi20[idx] as number) - 1e-9) {
    signals.push({ kind: "breakout_alcista", strength: "fuerte", note: "Nuevos máximos 20d", bias: "bull" });
    fTrend += 2;
  } else if (lo20[idx] != null && closes[idx] < (lo20[idx] as number) + 1e-9) {
    signals.push({ kind: "breakdown_bajista", strength: "fuerte", note: "Nuevos mínimos 20d", bias: "bear" });
    fTrend -= 2;
  }

  // Cruces 50/200 (Tendencia)
  if (crossedAbove(sma50, sma200, idx)) {
    signals.push({ kind: "golden_cross", strength: "moderado", note: "SMA50 cruza por encima de SMA200", bias: "bull" });
    fTrend += 2;
  } else if (crossedBelow(sma50, sma200, idx)) {
    signals.push({ kind: "death_cross", strength: "moderado", note: "SMA50 cruza por debajo de SMA200", bias: "bear" });
    fTrend -= 2;
  }

  // Pullback sano a SMA20/50 (en tendencia alcista) → Estructura
  if (sma200[idx] && sma50[idx] && closes[idx] > (sma200[idx] as number) && (sma50[idx] as number) > (sma200[idx] as number)) {
    const near20 = sma20[idx] && Math.abs(closes[idx] - (sma20[idx] as number)) / (sma20[idx] as number) <= 0.01;
    const near50 = sma50[idx] && Math.abs(closes[idx] - (sma50[idx] as number)) / (sma50[idx] as number) <= 0.01;
    if (near20 || near50) {
      signals.push({ kind: "pullback_sano", strength: "ligero", note: "Pullback a SMA20/50 en tendencia", bias: "bull" });
      fStruct += 1;
    }
  }

  // MACD cruces → Momentum
  if (crossedAbove(macdAll.macdLine, macdAll.signalLine, idx)) {
    signals.push({ kind: "macd_bull_cross", strength: "moderado", note: "MACD cruza al alza la señal", bias: "bull" });
    fMomentum += 1;
  } else if (crossedBelow(macdAll.macdLine, macdAll.signalLine, idx)) {
    signals.push({ kind: "macd_bear_cross", strength: "moderado", note: "MACD cruza a la baja la señal", bias: "bear" });
    fMomentum -= 1;
  }

  // Volumen pico (actual > 1.5x media 20) → Volumen
  const volumes = data.map(d => d.volume ?? 0);
  const vAvg20 = sma(volumes, 20);
  if (data[idx].volume != null && vAvg20[idx] != null && data[idx].volume! > 1.5 * (vAvg20[idx] as number)) {
    signals.push({
      kind: "volumen_pico",
      strength: "moderado",
      note: "Volumen >1.5× media 20d",
      bias: closes[idx] >= closes[idx - 1] ? "bull" : "bear"
    });
    fVolume += closes[idx] >= closes[idx - 1] ? 1 : -1;
  }

  // S/R (tolerancia 0.5%) → Estructura
  const tol = 0.005;
  const c = closes[idx];
  if (Math.abs(c - sr.support) / sr.support <= tol) {
    signals.push({ kind: "toque_soporte", strength: "ligero", note: `Cerca soporte ~${sr.support.toFixed(2)}`, bias: "bull" });
    fStruct += 1;
  }
  if (Math.abs(c - sr.resistance) / sr.resistance <= tol) {
    signals.push({ kind: "toque_resistencia", strength: "ligero", note: `Cerca resistencia ~${sr.resistance.toFixed(2)}`, bias: "bear" });
    fStruct -= 1;
  }
  if (c > sr.resistance * (1 + tol)) {
    signals.push({ kind: "ruptura_resistencia", strength: "fuerte", note: `Ruptura > resistencia ~${sr.resistance.toFixed(2)}`, bias: "bull" });
    fTrend += 2; fStruct += 1;
  }
  if (c < sr.support * (1 - tol)) {
    signals.push({ kind: "ruptura_soporte", strength: "fuerte", note: `Ruptura < soporte ~${sr.support.toFixed(2)}`, bias: "bear" });
    fTrend -= 2; fStruct -= 1;
  }

  // Envolventes (Engulfing) → Disparador (Estructura)
  if (data.length >= 2) {
    const prev = data[idx - 1], curr = data[idx];
    if (isBullEngulfing(prev, curr)) {
      signals.push({ kind: "engulfing_alcista", strength: "moderado", note: "Envolvente alcista", bias: "bull" });
      fStruct += 1;
    } else if (isBearEngulfing(prev, curr)) {
      signals.push({ kind: "engulfing_bajista", strength: "moderado", note: "Envolvente bajista", bias: "bear" });
      fStruct -= 1;
    }
  }

  // Score ponderado: Trend 45% + Momentum 30% + Volumen 15% + Estructura 10%
  const score = 0.45 * fTrend + 0.30 * fMomentum + 0.15 * fVolume + 0.10 * fStruct;

  return {
    closes, sma20, sma50, sma200, macdAll, sr,
    signals, score, volumeAvg20: vAvg20
  };
}
