import { Sparkline, RSIArc, Badge, ScoreBar, LoadingDots, StatRow } from "./ui";

export default function Panel({ label, md, signals, loading, sparkline }) {
  const sig = signals?.overall || { color: "#1a1a1a", bg: "transparent", label: "" };
  const trendKey = label === "1H" ? "trend1h" : "trend4h";
  const trend = md?.[trendKey];

  return (
    <div style={{
      flex: 1, minWidth: 290,
      background: "#080808",
      border: `1px solid ${loading ? "#141414" : sig.color + "22"}`,
      borderRadius: 14, padding: "20px 22px",
      position: "relative", overflow: "hidden",
      boxShadow: loading ? "none" : `0 0 50px ${sig.color}08`,
      transition: "border-color 0.6s, box-shadow 0.6s",
      animation: !loading ? "fadeIn 0.4s ease" : "none",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -50, right: -50, width: 180, height: 180,
        background: `radial-gradient(circle, ${sig.color}06 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 9, color: "#242424", letterSpacing: 4, marginBottom: 4 }}>TIMEFRAME</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#ccc", letterSpacing: -1, lineHeight: 1 }}>{label}</div>
            {trend && (
              <span style={{ fontSize: 9, color: trend === "up" ? "#00ff88" : "#ff4444", letterSpacing: 1, marginTop: 4 }}>
                {trend === "up" ? "▲ UP" : "▼ DOWN"}
              </span>
            )}
          </div>
        </div>
        {sparkline?.length > 0 && <Sparkline points={sparkline} color={sig.color} />}
      </div>

      {loading && <LoadingDots msg="SEARCHING LIVE DATA…" />}

      {!loading && signals && md && (
        <>
          {/* Overall signal box */}
          <div style={{
            padding: "12px 16px", background: sig.bg,
            border: `1px solid ${sig.color}33`, borderRadius: 8,
            textAlign: "center", marginBottom: 14,
          }}>
            <div style={{ fontSize: 8, color: "#333", letterSpacing: 3, marginBottom: 5 }}>OVERALL SIGNAL</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: sig.color, letterSpacing: 3 }}>{sig.label}</div>
            <ScoreBar score={signals.score} />
            <div style={{ fontSize: 9, color: "#2a2a2a", marginTop: 5 }}>
              SCORE {signals.score > 0 ? "+" : ""}{signals.score} / 10
            </div>
          </div>

          {/* Indicator rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
            {[
              ["EMA 9/21",  signals.emaS],
              ["RSI 14",    signals.rsiS],
              ["MACD",      signals.macdS],
              ["VOLUME",    signals.volS],
              ["SENTIMENT", signals.sentS],
            ].map(([name, s]) => (
              <div key={name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "#0b0b0b", borderRadius: 6, padding: "6px 10px", border: "1px solid #0f0f0f",
              }}>
                <span style={{ fontSize: 9, color: "#343434", letterSpacing: 1 }}>{name}</span>
                <Badge signal={s} />
              </div>
            ))}
          </div>

          {/* Bottom stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#0b0b0b", borderRadius: 8, padding: "10px 12px", border: "1px solid #0f0f0f", textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#242424", letterSpacing: 2, marginBottom: 6 }}>RSI 14</div>
              <RSIArc value={md.rsi14} />
            </div>
            <div style={{ background: "#0b0b0b", borderRadius: 8, padding: "10px 12px", border: "1px solid #0f0f0f" }}>
              <div style={{ fontSize: 8, color: "#242424", letterSpacing: 2, marginBottom: 8 }}>24H STATS</div>
              <StatRow label="HIGH"  value={md.high24h   ? `$${md.high24h.toLocaleString()}` : "—"} />
              <StatRow label="LOW"   value={md.low24h    ? `$${md.low24h.toLocaleString()}`  : "—"} />
              <StatRow label="VOL"   value={md.volume24h ? `${(md.volume24h / 1000).toFixed(1)}K BTC` : "—"} />
              <StatRow
                label="CHG"
                value={md.change24h != null ? `${md.change24h > 0 ? "+" : ""}${md.change24h.toFixed(2)}%` : "—"}
                color={md.change24h >= 0 ? "#00ff88" : "#ff4444"}
              />
            </div>
          </div>

          {/* Support / Resistance */}
          {(md.support || md.resistance) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <div style={{ background: "#0b0b0b", borderRadius: 8, padding: "10px 12px", border: "1px solid #0f0f0f", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: "#242424", letterSpacing: 2, marginBottom: 4 }}>SUPPORT</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#00cc66" }}>
                  {md.support ? `$${md.support.toLocaleString()}` : "—"}
                </div>
              </div>
              <div style={{ background: "#0b0b0b", borderRadius: 8, padding: "10px 12px", border: "1px solid #0f0f0f", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: "#242424", letterSpacing: 2, marginBottom: 4 }}>RESISTANCE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ff4444" }}>
                  {md.resistance ? `$${md.resistance.toLocaleString()}` : "—"}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !signals && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#2a2a2a", fontSize: 10, letterSpacing: 2 }}>NO DATA</div>
      )}
    </div>
  );
}
