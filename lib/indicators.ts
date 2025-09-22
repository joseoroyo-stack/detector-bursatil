// lib/indicators.ts
export type Bar = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

/** SMA clásica; devuelve array con null hasta tener "period" datos */
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  if (period <= 1) return values.map((v) => v ?? null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    sum += v;
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** True Range de Wilder */
function trueRange(bars: Bar[], i: number): number {
  if (i === 0) return bars[0].high - bars[0].low;
  const h = bars[i].high, l = bars[i].low, pc = bars[i - 1].close;
  return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
}

/** ATR simple (SMA de TR). Puedes cambiar a Wilder si prefieres smoothing exponencial */
export function atr(bars: Bar[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(bars.length).fill(null);
  if (bars.length === 0) return out;
  const trs = bars.map((_, i) => trueRange(bars, i));
  const atrSma = sma(trs, period);
  for (let i = 0; i < bars.length; i++) out[i] = atrSma[i];
  return out;
}

/** Último swing-low aproximado: el mínimo de los últimos N (lookback) */
export function lastSwingLow(bars: Bar[], lookback = 20): number | null {
  if (bars.length === 0) return null;
  const n = bars.length;
  const from = Math.max(0, n - lookback);
  let min = Number.POSITIVE_INFINITY;
  for (let i = from; i < n; i++) min = Math.min(min, bars[i].low);
  return Number.isFinite(min) ? min : null;
}

/** Detección de soportes por pivotes simples y merge de niveles cercanos */
export function supports(
  bars: Bar[],
  lookback = 120,
  strength = 2,
  maxLevels = 5,
  tolerancePct = 0.5 // niveles a <0.5% se fusionan
): number[] {
  if (bars.length === 0) return [];
  const n = bars.length;
  const from = Math.max(0, n - lookback);
  const pivots: number[] = [];
  for (let i = from + strength; i < n - strength; i++) {
    const li = bars[i].low;
    let isPivot = true;
    for (let k = 1; k <= strength; k++) {
      if (!(li < bars[i - k].low && li <= bars[i + k].low)) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) pivots.push(li);
  }
  if (pivots.length === 0) return [];

  // fusionar niveles cercanos
  pivots.sort((a, b) => a - b);
  const merged: number[] = [];
  let bucketStart = pivots[0];
  let bucketVals: number[] = [pivots[0]];
  for (let i = 1; i < pivots.length; i++) {
    const prev = bucketVals[bucketVals.length - 1];
    const curr = pivots[i];
    const tol = (prev * tolerancePct) / 100;
    if (Math.abs(curr - prev) <= tol) {
      bucketVals.push(curr);
    } else {
      // media del bucket
      merged.push(bucketVals.reduce((s, x) => s + x, 0) / bucketVals.length);
      bucketStart = curr;
      bucketVals = [curr];
    }
  }
  merged.push(bucketVals.reduce((s, x) => s + x, 0) / bucketVals.length);

  // priorizar por cercanía al último cierre
  const lastClose = bars[n - 1].close;
  merged.sort((a, b) => Math.abs(a - lastClose) - Math.abs(b - lastClose));
  return merged.slice(0, maxLevels);
}
