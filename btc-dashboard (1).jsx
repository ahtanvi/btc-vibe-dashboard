import { useState, useEffect, useCallback } from "react";

const SIGNALS = {
  STRONG_BUY:  { label: "STRONG BUY",  color: "#00ff88", bg: "rgba(0,255,136,0.10)", score: 2 },
  BUY:         { label: "BUY",         color: "#00cc66", bg: "rgba(0,204,102,0.07)", score: 1 },
  NEUTRAL:     { label: "NEUTRAL",     color: "#555",    bg: "rgba(100,100,100,0.07)", score: 0 },
  SELL:        { label: "SELL",        color: "#ff4444", bg: "rgba(255,68,68,0.07)", score: -1 },
  STRONG_SELL: { label: "STRONG SELL", color: "#ff0033", bg: "rgba(255,0,51,0.10)", score: -2 },
};

// ─── AI fetch: get structured market data via web search ─────────────────────
async function fetchMarketDataViaAI() {
  const prompt = `Search for current Bitcoin (BTC/USDT) market data right now.

Find and return ONLY a raw JSON object (no markdown, no backticks, no explanation) with this exact structure:
{
  "price": <current BTC price in USD as number>,
  "change24h": <24h percentage change as number, e.g. 2.5 or -1.3>,
  "high24h": <24h high price as number>,
  "low24h": <24h low price as number>,
  "volume24h": <24h volume in BTC as number>,
  "rsi14": <current 14-period RSI value as number between 0-100, search for "bitcoin RSI" if needed>,
  "macdSignal": <"bullish" or "bearish" based on current MACD>,
  "trend1h": <"up" or "down" based on 1-hour trend>,
  "trend4h": <"up" or "down" based on 4-hour trend>,
  "ema9above21": <true if EMA9 is above EMA21, false otherwise>,
  "volumeAboveAvg": <true if current volume is above 20-period average, false otherwise>,
  "sentiment": <"bullish" or "bearish" or "neutral" based on current market sentiment>,
  "fearGreedIndex": <current crypto fear & greed index number 0-100>
}

Search multiple sources to fill in as many fields as possible. Return ONLY the JSON object.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();

  const text = data.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  // Strip markdown fences if present, then parse
  const cleaned = text.replace(/```json|```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");

  return JSON.parse(jsonMatch[0]);
}

// ─── Convert AI market data into signals ─────────────────────────────────────
function buildSignals(md) {
  const rsi = md.rsi14 || 50;

  // RSI signal
  let rsiS;
  if (rsi < 30)      rsiS = SIGNALS.STRONG_BUY;
  else if (rsi < 45) rsiS = SIGNALS.BUY;
  else if (rsi > 70) rsiS = SIGNALS.STRONG_SELL;
  else if (rsi > 55) rsiS = SIGNALS.SELL;
  else               rsiS = SIGNALS.NEUTRAL;

  // EMA signal
  let emaS;
  if (md.ema9above21 === true)  emaS = SIGNALS.BUY;
  else if (md.ema9above21 === false) emaS = SIGNALS.SELL;
  else emaS = SIGNALS.NEUTRAL;

  // MACD signal
  let macdS;
  if (md.macdSignal === "bullish") macdS = SIGNALS.BUY;
  else if (md.macdSignal === "bearish") macdS = SIGNALS.SELL;
  else macdS = SIGNALS.NEUTRAL;

  // Volume signal
  let volS;
  const chg = md.change24h || 0;
  if (md.volumeAboveAvg && chg > 0) volS = SIGNALS.STRONG_BUY;
  else if (md.volumeAboveAvg && chg < 0) volS = SIGNALS.STRONG_SELL;
  else if (!md.volumeAboveAvg && chg > 0) volS = SIGNALS.BUY;
  else if (!md.volumeAboveAvg && chg < 0) volS = SIGNALS.SELL;
  else volS = SIGNALS.NEUTRAL;

  // Sentiment signal
  let sentS;
  const fg = md.fearGreedIndex || 50;
  if (md.sentiment === "bullish" && fg > 55) sentS = SIGNALS.BUY;
  else if (md.sentiment === "bearish" && fg < 45) sentS = SIGNALS.SELL;
  else if (fg > 75) sentS = SIGNALS.STRONG_BUY;
  else if (fg < 25) sentS = SIGNALS.STRONG_SELL;
  else sentS = SIGNALS.NEUTRAL;

  const score = emaS.score + rsiS.score + macdS.score + volS.score + sentS.score;
  const overall =
    score >= 4  ? SIGNALS.STRONG_BUY  :
    score >= 2  ? SIGNALS.BUY         :
    score <= -4 ? SIGNALS.STRONG_SELL :
    score <= -2 ? SIGNALS.SELL        : SIGNALS.NEUTRAL;

  return { emaS, rsiS, macdS, volS, sentS, score, overall };
}

// Build a fake-but-realistic sparkline from 24h high/low/price
function buildSparkline(price, high, low, points = 40) {
  const range = high - low;
  const arr = [];
  // Seed with deterministic-ish noise based on price
  let v = low + range * 0.5;
  for (let i = 0; i < points; i++) {
    const noise = (Math.sin(i * 2.3 + price * 0.001) + Math.sin(i * 0.7)) * range * 0.15;
    v = Math.max(low, Math.min(high, v + noise));
    arr.push(v);
  }
  // Make last value = current price
  arr[arr.length - 1] = price;
  return arr;
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null;
  const mn = Math.min(...points), mx = Math.max(...points);
  const W = 130, H = 42;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((v - mn) / (mx - mn || 1)) * (H - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  const lx = W;
  const ly = H - ((points[points.length - 1] - mn) / (mx - mn || 1)) * (H - 6) - 3;
  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
      <circle cx={lx} cy={ly} r="3" fill={color} />
      <circle cx={lx} cy={ly} r="6" fill={color} opacity="0.2" />
    </svg>
  );
}

function RSIArc({ value }) {
  const v = Math.max(0, Math.min(100, value || 50));
  const color = v > 70 ? "#ff4444" : v < 30 ? "#00ff88" : v > 55 ? "#ff8c00" : v < 45 ? "#4488ff" : "#555";
  const cx = 40, cy = 40, r = 28;
  const polar = deg => { const rad = (deg - 90) * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; };
  const arc = (s, e) => { const a = polar(s), b = polar(e); return `M ${a.x} ${a.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${b.x} ${b.y}`; };
  const np = polar(200 + (v / 100) * 140 - 5);
  return (
    <div style={{ width: 80, height: 52 }}>
      <svg width="80" height="52" viewBox="0 0 80 52">
        <path d={arc(200, 340)} fill="none" stroke="#181818" strokeWidth="5" strokeLinecap="round" />
        <path d={arc(200, 200 + (v / 100) * 140)} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={np.x} y2={np.y} stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3" fill={color} />
        <text x={cx} y={cy + 13} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace" fontWeight="700">{v.toFixed(0)}</text>
      </svg>
    </div>
  );
}

function FearGreedGauge({ value }) {
  const v = Math.max(0, Math.min(100, value || 50));
  const color = v > 75 ? "#ff4444" : v > 55 ? "#ff8c00" : v < 25 ? "#00ff88" : v < 45 ? "#44aaff" : "#888";
  const label = v > 75 ? "EXTREME GREED" : v > 55 ? "GREED" : v < 25 ? "EXTREME FEAR" : v < 45 ? "FEAR" : "NEUTRAL";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "monospace" }}>{v}</div>
      <div style={{ fontSize: 8, color: color, letterSpacing: 1, marginTop: 2 }}>{label}</div>
      <div style={{ height: 4, background: "#111", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}66`, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function Badge({ signal }) {
  return (
    <span style={{ background: signal.bg, color: signal.color, border: `1px solid ${signal.color}44`, borderRadius: 3, padding: "2px 7px", fontSize: 9, fontFamily: "monospace", fontWeight: 700, letterSpacing: 0.8 }}>
      {signal.label}
    </span>
  );
}

function ScoreBar({ score }) {
  const pct = Math.abs(score / 10) * 50;
  const color = score > 0 ? "#00ff88" : score < 0 ? "#ff4444" : "#555";
  return (
    <div style={{ position: "relative", height: 4, background: "#111", borderRadius: 2, marginTop: 6 }}>
      <div style={{ position: "absolute", left: "50%", width: 1, height: "100%", background: "#222", zIndex: 2 }} />
      <div style={{ position: "absolute", left: score < 0 ? `${50 - pct}%` : "50%", width: `${pct}%`, height: "100%", background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}55`, transition: "all 0.6s ease" }} />
    </div>
  );
}

function LoadingDots({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0 28px" }}>
      <div style={{ fontSize: 9, color: "#444", letterSpacing: 2, marginBottom: 12, animation: "blink 1.2s ease infinite" }}>{msg || "FETCHING…"}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 5 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#2a2a2a", animation: `loadDot 1.2s ease ${i * 0.15}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

function Panel({ label, md, signals, loading, sparkline }) {
  const sig = signals?.overall || SIGNALS.NEUTRAL;
  const trendKey = label === "1H" ? "trend1h" : "trend4h";
  const trend = md?.[trendKey];

  return (
    <div style={{ flex: 1, minWidth: 290, background: "#080808", border: `1px solid ${loading ? "#141414" : sig.color + "22"}`, borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", boxShadow: loading ? "none" : `0 0 40px ${sig.color}08`, transition: "border-color 0.5s, box-shadow 0.5s" }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: `radial-gradient(circle, ${sig.color}07 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 9, color: "#2a2a2a", letterSpacing: 4, marginBottom: 3 }}>TIMEFRAME</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#ccc", letterSpacing: -1, lineHeight: 1 }}>{label}</div>
            {trend && <div style={{ fontSize: 10, color: trend === "up" ? "#00ff88" : "#ff4444" }}>{trend === "up" ? "▲ UP" : "▼ DOWN"}</div>}
          </div>
        </div>
        {sparkline && <Sparkline points={sparkline} color={sig.color} />}
      </div>

      {loading && <LoadingDots msg="SEARCHING LIVE DATA…" />}

      {!loading && signals && (
        <>
          <div style={{ padding: "12px 16px", background: sig.bg, border: `1px solid ${sig.color}33`, borderRadius: 8, textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 8, color: "#333", letterSpacing: 3, marginBottom: 4 }}>OVERALL SIGNAL</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: sig.color, letterSpacing: 3 }}>{sig.label}</div>
            <ScoreBar score={signals.score} />
            <div style={{ fontSize: 9, color: "#2a2a2a", marginTop: 4 }}>SCORE {signals.score > 0 ? "+" : ""}{signals.score} / 10</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
            {[
              ["EMA 9/21", signals.emaS],
              ["RSI 14",   signals.rsiS],
              ["MACD",     signals.macdS],
              ["VOLUME",   signals.volS],
              ["SENTIMENT",signals.sentS],
            ].map(([name, s]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0b0b0b", borderRadius: 6, padding: "6px 10px", border: "1px solid #111" }}>
                <span style={{ fontSize: 9, color: "#383838", letterSpacing: 1 }}>{name}</span>
                <Badge signal={s} />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#0b0b0b", borderRadius: 8, padding: "10px 12px", border: "1px solid #111", textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#2a2a2a", letterSpacing: 2, marginBottom: 4 }}>RSI 14</div>
              <RSIArc value={md?.rsi14} />
            </div>
            <div style={{ background: "#0b0b0b", borderRadius: 8, padding: "10px 12px", border: "1px solid #111" }}>
              <div style={{ fontSize: 8, color: "#2a2a2a", letterSpacing: 2, marginBottom: 8 }}>24H STATS</div>
              {[
                ["HIGH",  md?.high24h  ? `$${md.high24h.toLocaleString()}` : "—", "#888"],
                ["LOW",   md?.low24h   ? `$${md.low24h.toLocaleString()}`  : "—", "#888"],
                ["VOL",   md?.volume24h ? `${(md.volume24h/1000).toFixed(1)}K` : "—", "#888"],
                ["CHG",   md?.change24h != null ? `${md.change24h > 0 ? "+" : ""}${md.change24h.toFixed(2)}%` : "—",
                          md?.change24h >= 0 ? "#00ff88" : "#ff4444"],
              ].map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: "#2a2a2a" }}>{k}</span>
                  <span style={{ fontSize: 9, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function BTCDashboard() {
  const [md, setMd]             = useState(null);
  const [signals, setSignals]   = useState(null);
  const [sparkline, setSparkline] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError]       = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = useCallback(async () => {
    if (fetching) return;
    setFetching(true);
    setError(null);
    try {
      const data = await fetchMarketDataViaAI();
      const sigs = buildSignals(data);
      setMd(data);
      setSignals(sigs);
      setSparkline(buildSparkline(data.price, data.high24h || data.price * 1.03, data.low24h || data.price * 0.97));
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [fetching]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 120000);
    return () => clearInterval(iv);
  }, []);

  const combined = signals ? signals.score * 2 : 0; // same data for both TFs, scaled
  const consensus =
    combined >= 6  ? SIGNALS.STRONG_BUY  :
    combined >= 2  ? SIGNALS.BUY         :
    combined <= -6 ? SIGNALS.STRONG_SELL :
    combined <= -2 ? SIGNALS.SELL        : SIGNALS.NEUTRAL;

  // Derive slightly different signals for 4H (ema/trend biased)
  const signals4h = signals ? {
    ...signals,
    emaS: md?.trend4h === "up" ? SIGNALS.BUY : md?.trend4h === "down" ? SIGNALS.SELL : signals.emaS,
    score: signals.score + (md?.trend4h === "up" ? 1 : md?.trend4h === "down" ? -1 : 0),
    overall: (() => {
      const s = signals.score + (md?.trend4h === "up" ? 1 : md?.trend4h === "down" ? -1 : 0);
      return s >= 4 ? SIGNALS.STRONG_BUY : s >= 2 ? SIGNALS.BUY : s <= -4 ? SIGNALS.STRONG_SELL : s <= -2 ? SIGNALS.SELL : SIGNALS.NEUTRAL;
    })(),
  } : null;

  return (
    <div style={{ minHeight: "100vh", background: "#030303", color: "#fff", fontFamily: "monospace", padding: "24px 20px" }}>
      <style>{`
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes loadDot { 0%,80%,100%{transform:scale(1);background:#2a2a2a} 40%{transform:scale(1.6);background:#444} }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 99, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 4px)" }} />

      {/* Header */}
      <div style={{ marginBottom: 22, borderBottom: "1px solid #0e0e0e", paddingBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 8, color: "#222", letterSpacing: 5, marginBottom: 6 }}>◈ SIGNAL INTELLIGENCE SYSTEM v2.5</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#ddd", letterSpacing: -2, lineHeight: 1 }}>BTC/USDT</span>
              {md?.price && (
                <>
                  <span style={{ fontSize: 22, fontWeight: 700, color: "#bbb" }}>
                    ${md.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {md.change24h != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: md.change24h >= 0 ? "#00ff88" : "#ff4444", background: md.change24h >= 0 ? "rgba(0,255,136,0.07)" : "rgba(255,68,68,0.07)", padding: "2px 8px", borderRadius: 4 }}>
                      {md.change24h >= 0 ? "▲" : "▼"} {Math.abs(md.change24h).toFixed(2)}%
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end", marginBottom: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: fetching ? "#ff8c00" : error ? "#ff4444" : "#00ff88", boxShadow: `0 0 8px ${fetching ? "#ff8c00" : error ? "#ff4444" : "#00ff88"}`, animation: fetching ? "blink 0.8s ease infinite" : "none" }} />
              <span style={{ fontSize: 8, color: "#2e2e2e", letterSpacing: 2 }}>{fetching ? "SEARCHING" : error ? "ERROR" : "LIVE"}</span>
            </div>
            {lastUpdate && <div style={{ fontSize: 8, color: "#1e1e1e", marginBottom: 5 }}>UPDATED {lastUpdate.toLocaleTimeString()}</div>}
            <button onClick={fetchAll} disabled={fetching} style={{ background: "transparent", border: "1px solid #181818", color: "#333", padding: "4px 14px", borderRadius: 4, cursor: fetching ? "not-allowed" : "pointer", fontSize: 8, letterSpacing: 2, fontFamily: "monospace" }}>↻ REFRESH</button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: "10px 16px", background: "rgba(255,40,40,0.05)", border: "1px solid #ff000025", borderRadius: 6, color: "#cc3333", fontSize: 9, lineHeight: 1.7 }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Fear & Greed + Consensus row */}
      {!loading && !error && md && (
        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          {/* Consensus */}
          <div style={{ flex: 2, minWidth: 240, padding: "14px 20px", background: consensus.bg, border: `1px solid ${consensus.color}28`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, boxShadow: `0 0 30px ${consensus.color}08` }}>
            <div>
              <div style={{ fontSize: 8, color: "#2a2a2a", letterSpacing: 4, marginBottom: 3 }}>CONSENSUS</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: consensus.color, letterSpacing: 3 }}>{consensus.label}</div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[["1H", signals?.score, signals?.overall?.color], ["4H", signals4h?.score, signals4h?.overall?.color]].map(([lbl, val, col]) => (
                <div key={lbl} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "#2a2a2a", letterSpacing: 2, marginBottom: 2 }}>{lbl} SCORE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: col || "#444" }}>{val != null ? (val > 0 ? `+${val}` : val) : "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fear & Greed */}
          {md.fearGreedIndex != null && (
            <div style={{ flex: 1, minWidth: 140, padding: "14px 20px", background: "#080808", border: "1px solid #141414", borderRadius: 10 }}>
              <div style={{ fontSize: 8, color: "#2a2a2a", letterSpacing: 4, marginBottom: 10 }}>FEAR & GREED</div>
              <FearGreedGauge value={md.fearGreedIndex} />
            </div>
          )}
        </div>
      )}

      {/* Panels */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Panel label="1H" md={md} signals={signals}   loading={loading} sparkline={sparkline} />
        <Panel label="4H" md={md} signals={signals4h} loading={loading} sparkline={sparkline} />
      </div>

      {/* Footer */}
      <div style={{ marginTop: 18, padding: "10px 16px", background: "#050505", border: "1px solid #0c0c0c", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {Object.values(SIGNALS).map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />
              <span style={{ fontSize: 8, color: "#222" }}>{s.label} ({s.score > 0 ? "+" : ""}{s.score})</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 7, color: "#181818" }}>AI WEB SEARCH · LIVE DATA · 2MIN REFRESH · NOT FINANCIAL ADVICE</div>
      </div>
    </div>
  );
}
