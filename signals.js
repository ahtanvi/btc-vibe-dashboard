export const SIGNALS = {
  STRONG_BUY:  { label: "STRONG BUY",  color: "#00ff88", bg: "rgba(0,255,136,0.10)", score: 2 },
  BUY:         { label: "BUY",         color: "#00cc66", bg: "rgba(0,204,102,0.07)", score: 1 },
  NEUTRAL:     { label: "NEUTRAL",     color: "#555",    bg: "rgba(100,100,100,0.07)", score: 0 },
  SELL:        { label: "SELL",        color: "#ff4444", bg: "rgba(255,68,68,0.07)", score: -1 },
  STRONG_SELL: { label: "STRONG SELL", color: "#ff0033", bg: "rgba(255,0,51,0.10)", score: -2 },
};

export function buildSignals(md) {
  if (!md) return null;
  const rsi = md.rsi14 || 50;

  const rsiS =
    rsi < 30 ? SIGNALS.STRONG_BUY :
    rsi < 45 ? SIGNALS.BUY :
    rsi > 70 ? SIGNALS.STRONG_SELL :
    rsi > 55 ? SIGNALS.SELL : SIGNALS.NEUTRAL;

  const emaS =
    md.ema9above21 === true  ? SIGNALS.BUY :
    md.ema9above21 === false ? SIGNALS.SELL : SIGNALS.NEUTRAL;

  const macdS =
    md.macdSignal === "bullish" ? SIGNALS.BUY :
    md.macdSignal === "bearish" ? SIGNALS.SELL : SIGNALS.NEUTRAL;

  const chg = md.change24h || 0;
  const volS =
    md.volumeAboveAvg && chg > 0  ? SIGNALS.STRONG_BUY  :
    md.volumeAboveAvg && chg < 0  ? SIGNALS.STRONG_SELL :
    !md.volumeAboveAvg && chg > 0 ? SIGNALS.BUY :
    !md.volumeAboveAvg && chg < 0 ? SIGNALS.SELL : SIGNALS.NEUTRAL;

  const fg = md.fearGreedIndex || 50;
  const sentS =
    fg > 75 ? SIGNALS.STRONG_BUY  :
    fg > 55 ? SIGNALS.BUY         :
    fg < 25 ? SIGNALS.STRONG_SELL :
    fg < 45 ? SIGNALS.SELL        : SIGNALS.NEUTRAL;

  const score = emaS.score + rsiS.score + macdS.score + volS.score + sentS.score;
  const overall =
    score >= 4  ? SIGNALS.STRONG_BUY  :
    score >= 2  ? SIGNALS.BUY         :
    score <= -4 ? SIGNALS.STRONG_SELL :
    score <= -2 ? SIGNALS.SELL        : SIGNALS.NEUTRAL;

  return { emaS, rsiS, macdS, volS, sentS, score, overall };
}

export function buildSignals4h(md, base) {
  if (!md || !base) return null;
  const trendBoost = md.trend4h === "up" ? 1 : md.trend4h === "down" ? -1 : 0;
  const emaS =
    md.trend4h === "up"   ? SIGNALS.BUY  :
    md.trend4h === "down" ? SIGNALS.SELL : base.emaS;
  const score = base.score + trendBoost;
  const overall =
    score >= 4  ? SIGNALS.STRONG_BUY  :
    score >= 2  ? SIGNALS.BUY         :
    score <= -4 ? SIGNALS.STRONG_SELL :
    score <= -2 ? SIGNALS.SELL        : SIGNALS.NEUTRAL;
  return { ...base, emaS, score, overall };
}

export function buildSparkline(price, high, low, points = 40) {
  if (!price) return [];
  const h = high || price * 1.03;
  const l = low  || price * 0.97;
  const range = h - l;
  const arr = [];
  let v = l + range * 0.5;
  for (let i = 0; i < points; i++) {
    const noise = (Math.sin(i * 2.3 + price * 0.001) + Math.sin(i * 0.7)) * range * 0.15;
    v = Math.max(l, Math.min(h, v + noise));
    arr.push(v);
  }
  arr[arr.length - 1] = price;
  return arr;
}
