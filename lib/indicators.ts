export type OHLC = { date: string; open: number; high: number; low: number; close: number; volume?: number };

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    if (prev == null) {
      const seed = values.slice(i - (period - 1), i + 1).reduce((a, b) => a + b, 0) / period;
      out[i] = seed;
      prev = seed;
    } else {
      prev = values[i] * k + (prev as number) * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: (number | null)[] = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? (emaFast[i]! - emaSlow[i]!) : null
  );
  const macdVals: number[] = macdLine.map(v => (v == null ? NaN : v)).filter(v => !Number.isNaN(v));
  const sigSeries = ema(macdVals, signal);
  const signalLine: (number | null)[] = Array(macdLine.length).fill(null);
  let j = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      signalLine[i] = sigSeries[j] ?? null;
      j++;
    }
  }
  const hist: (number | null)[] = macdLine.map((v, i) =>
    v != null && signalLine[i] != null ? v - (signalLine[i] as number) : null
  );
  return { macdLine, signalLine, hist };
}

export function atr(data: OHLC[], period = 14): (number | null)[] {
  const out: (number | null)[] = Array(data.length).fill(null);
  let prevClose: number | null = null;
  let atrVal: number | null = null;
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const tr = prevClose == null ? d.high - d.low : Math.max(
      d.high - d.low,
      Math.abs(d.high - prevClose),
      Math.abs(d.low - prevClose)
    );
    if (i === period - 1) {
      const slice = data.slice(0, period);
      const sumTR = slice.reduce((acc, dd, idx) => {
        const pc = idx === 0 ? null : slice[idx - 1].close;
        const tr0 = pc == null ? dd.high - dd.low : Math.max(
          dd.high - dd.low,
          Math.abs(dd.high - pc),
          Math.abs(dd.low - pc)
        );
        return acc + tr0;
      }, 0);
      atrVal = sumTR / period;
      out[i] = atrVal;
    } else if (i >= period) {
      atrVal = (atrVal as number) * (period - 1) / period + tr / period;
      out[i] = atrVal;
    }
    prevClose = d.close;
  }
  return out;
}

export function rollingMax(arr: number[], lookback: number): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null);
  for (let i = 0; i < arr.length; i++) {
    if (i < lookback - 1) continue;
    out[i] = Math.max(...arr.slice(i - (lookback - 1), i + 1));
  }
  return out;
}

export function rollingMin(arr: number[], lookback: number): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null);
  for (let i = 0; i < arr.length; i++) {
    if (i < lookback - 1) continue;
    out[i] = Math.min(...arr.slice(i - (lookback - 1), i + 1));
  }
  return out;
}

export function crossedAbove(a: (number | null)[], b: (number | null)[], i: number) {
  if (i <= 0) return false;
  const prev = a[i - 1] != null && b[i - 1] != null ? (a[i - 1]! - b[i - 1]!) : null;
  const now = a[i] != null && b[i] != null ? (a[i]! - b[i]!) : null;
  return prev != null && now != null && prev <= 0 && now > 0;
}

export function crossedBelow(a: (number | null)[], b: (number | null)[], i: number) {
  if (i <= 0) return false;
  const prev = a[i - 1] != null && b[i - 1] != null ? (a[i - 1]! - b[i - 1]!) : null;
  const now = a[i] != null && b[i] != null ? (a[i]! - b[i]!) : null;
  return prev != null && now != null && prev >= 0 && now < 0;
}

export function calcSupportResistance(data: OHLC[], lookback = 20) {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const start = Math.max(0, highs.length - lookback);
  const resistance = Math.max(...highs.slice(start));
  const support = Math.min(...lows.slice(start));
  return { support, resistance };
}

export function formatNumber(n: number, decimals = 2) {
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}
