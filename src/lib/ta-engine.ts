/**
 * Technical Analysis Engine — Pure TypeScript, no external libs.
 * Ported from Python hyper-sentinel/core/ta_engine.py (258 lines).
 */

import type { TAIndicators } from "./algos/types";

// ── Simple Moving Average ────────────────────────────────────

export function computeSMA(closes: number[], period: number): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  result[period - 1] = sum / period;

  for (let i = period; i < closes.length; i++) {
    sum += closes[i] - closes[i - period];
    result[i] = sum / period;
  }
  return result;
}

// ── Exponential Moving Average ───────────────────────────────

export function computeEMA(closes: number[], period: number): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period) return result;

  const k = 2 / (period + 1);

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  result[period - 1] = sum / period;

  for (let i = period; i < closes.length; i++) {
    result[i] = closes[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

// ── Relative Strength Index (Wilder's smoothing) ─────────────

export function computeRSI(closes: number[], period: number = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  // Calculate price changes
  const deltas: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    deltas.push(closes[i] - closes[i - 1]);
  }

  // Separate gains and losses
  const gains = deltas.map(d => (d > 0 ? d : 0));
  const losses = deltas.map(d => (d < 0 ? -d : 0));

  // First average: simple mean of first `period` values
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  // Wilder's smoothing for subsequent values
  for (let i = period; i < deltas.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    result[i + 1] = rsi;
  }

  return result;
}

// ── MACD ─────────────────────────────────────────────────────

export function computeMACD(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const emaFast = computeEMA(closes, fast);
  const emaSlow = computeEMA(closes, slow);

  // MACD line = EMA(fast) - EMA(slow)
  const macdLine: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(emaFast[i]) && !isNaN(emaSlow[i])) {
      macdLine[i] = emaFast[i] - emaSlow[i];
    }
  }

  // Signal line = EMA of MACD line
  // Find the first valid MACD value to seed the signal EMA
  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalLine: number[] = new Array(closes.length).fill(NaN);

  if (validMacd.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let validIdx = 0;
    let sum = 0;

    // Find start index in macdLine
    let startIdx = macdLine.findIndex(v => !isNaN(v));
    for (let i = startIdx; i < closes.length; i++) {
      if (isNaN(macdLine[i])) continue;
      validIdx++;
      if (validIdx <= signalPeriod) {
        sum += macdLine[i];
        if (validIdx === signalPeriod) {
          signalLine[i] = sum / signalPeriod;
        }
      } else {
        signalLine[i] = macdLine[i] * k + signalLine[i - 1] * (1 - k);
        // Handle gap where previous signal was NaN
        if (isNaN(signalLine[i - 1])) {
          // Find last valid signal
          for (let j = i - 1; j >= 0; j--) {
            if (!isNaN(signalLine[j])) {
              signalLine[i] = macdLine[i] * k + signalLine[j] * (1 - k);
              break;
            }
          }
        }
      }
    }
  }

  // Histogram = MACD - Signal
  const histogram: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(macdLine[i]) && !isNaN(signalLine[i])) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

// ── Bollinger Bands ──────────────────────────────────────────

export function computeBB(
  closes: number[],
  period: number = 20,
  stdDev: number = 2.0
): { upper: number[]; mid: number[]; lower: number[] } {
  const mid = computeSMA(closes, period);
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);

  for (let i = period - 1; i < closes.length; i++) {
    // Standard deviation of last `period` closes
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = mid[i];
    let variance = 0;
    for (const v of slice) {
      variance += (v - mean) * (v - mean);
    }
    const sd = Math.sqrt(variance / period);
    upper[i] = mean + stdDev * sd;
    lower[i] = mean - stdDev * sd;
  }

  return { upper, mid, lower };
}

// ── Crossover Detection ──────────────────────────────────────

export function detectCrossover(
  fast: number[],
  slow: number[]
): "bullish" | "bearish" | null {
  const len = Math.min(fast.length, slow.length);
  if (len < 2) return null;

  const curr = fast[len - 1] - slow[len - 1];
  const prev = fast[len - 2] - slow[len - 2];

  if (isNaN(curr) || isNaN(prev)) return null;

  if (curr > 0 && prev <= 0) return "bullish";
  if (curr < 0 && prev >= 0) return "bearish";
  return null;
}

// ── Compute All Indicators ───────────────────────────────────

export function computeAllIndicators(closes: number[]): TAIndicators {
  return {
    sma9: computeSMA(closes, 9),
    sma21: computeSMA(closes, 21),
    ema12: computeEMA(closes, 12),
    ema26: computeEMA(closes, 26),
    rsi14: computeRSI(closes, 14),
    macd: computeMACD(closes, 12, 26, 9),
    bb: computeBB(closes, 20, 2.0),
    closes,
  };
}

// ── Helpers ──────────────────────────────────────────────────

/** Get the last non-NaN value from an array */
export function lastValid(arr: number[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!isNaN(arr[i])) return arr[i];
  }
  return null;
}
