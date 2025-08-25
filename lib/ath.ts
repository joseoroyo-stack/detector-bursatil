// lib/ath.ts
export type Bar = { time: number; open: number; high: number; low: number; close: number; volume?: number };

// SMA sencilla
export function sma(v: number[], p: number) {
  const out: (number|null)[] = Array(v.length).fill(null);
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    s += v[i];
    if (i >= p) s -= v[i - p];
    if (i >= p - 1) out[i] = s / p;
  }
  return out;
}

// Pivotes simples (swing highs/lows)
export function findPivots(data: Bar[], lookback = 3) {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    const isHigh = data.slice(i - lookback, i + lookback + 1).every((b, k, arr) => b.high <= arr[lookback].high);
    const isLow  = data.slice(i - lookback, i + lookback + 1).every((b, k, arr) => b.low  >= arr[lookback].low);
    if (isHigh) highs.push(i);
    if (isLow)  lows.push(i);
  }
  return { highs, lows };
}

// Máximos históricos (ATH) con tolerancia
export function isNearATH(data: Bar[], tolPct = 1, windowBars?: number) {
  const n = data.length; if (n < 50) return { near: false, maxClose: NaN, ddPct: NaN };
  const bars = windowBars ? data.slice(-windowBars) : data;
  const closes = bars.map(b => b.close);
  const maxClose = Math.max(...closes);
  const last = data[n - 1].close;
  const ddPct = 100 * (maxClose - last) / maxClose; // “drawdown” desde el máximo
  return { near: ddPct <= tolPct, maxClose, ddPct };
}

// “No ha roto soporte” (regla minimalista robusta):
// 1) Precio > SMA50 (tendencia salud).
// 2) Último swing-low (en los últimos N bares) está por encima de SMA200 (o por encima de un % del precio).
// 3) Desde ese swing-low no se ha hecho un mínimo inferior (higher-low intacto).
export function noSupportBreak(data: Bar[], lookbackBars = 60) {
  const n = data.length; if (n < 210) return { ok: false, lastSwingLow: NaN };
  const closes = data.map(d => d.close);
  const sma50  = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const last   = n - 1;

  if ((sma50[last] ?? 0) <= 0 || (sma200[last] ?? 0) <= 0) return { ok: false, lastSwingLow: NaN };
  if (closes[last] <= (sma50[last] as number)) return { ok: false, lastSwingLow: NaN };

  const from = Math.max(0, n - lookbackBars);
  const piv = findPivots(data.slice(from), 3);
  const lowsIdx = piv.lows.map(i => from + i);
  if (lowsIdx.length === 0) return { ok: false, lastSwingLow: NaN };

  const lastSwingIdx = lowsIdx[lowsIdx.length - 1];
  const lastSwingLow = data[lastSwingIdx].low;

  // Soporte “fuerte”: swing-low por encima de SMA200 en ese punto (o cerca)
  const sma200AtSwing = sma200[lastSwingIdx] ?? sma200[last];
  const swingVsSMA200OK = lastSwingLow >= (sma200AtSwing as number) * 0.98; // pequeña tolerancia 2%

  // Confirmar que no hay low más bajo después del swing
  const postSwingLows = data.slice(lastSwingIdx).map(b => b.low);
  const minAfter = Math.min(...postSwingLows);
  const higherLowIntacto = minAfter >= lastSwingLow * 0.995; // tolerancia 0.5%

  const ok = swingVsSMA200OK && higherLowIntacto;
  return { ok, lastSwingLow };
}
