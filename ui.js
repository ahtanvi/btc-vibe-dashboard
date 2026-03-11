// ─── Sparkline ────────────────────────────────────────────────────────────────
export function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null;
  const mn = Math.min(...points), mx = Math.max(...points);
  const W = 130, H = 42;
  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - ((v - mn) / (mx - mn || 1)) * (H - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  const lx = W;
  const ly = H - ((points[points.length - 1] - mn) / (mx - mn || 1)) * (H - 6) - 3;
  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <polyline points={coords} fill="none" stroke={`url(#sg-${color.replace("#", "")})`} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill={color} />
      <circle cx={lx} cy={ly} r="6" fill={color} opacity="0.25" style={{ animation: "pulseGlow 2s ease infinite" }} />
    </svg>
  );
}

// ─── RSI Arc Gauge ────────────────────────────────────────────────────────────
export function RSIArc({ value }) {
  const v = Math.max(0, Math.min(100, value || 50));
  const color =
    v > 70 ? "#ff4444" : v < 30 ? "#00ff88" : v > 55 ? "#ff8c00" : v < 45 ? "#4488ff" : "#555";
  const cx = 40, cy = 40, r = 28;
  const polar = (deg) => {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arc = (s, e) => {
    const a = polar(s), b = polar(e);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
  };
  const np = polar(200 + (v / 100) * 140 - 4);
  const zones = [
    { s: 200, e: 214, c: "#00ff88" },
    { s: 214, e: 256, c: "#44aa66" },
    { s: 256, e: 284, c: "#555" },
    { s: 284, e: 326, c: "#aa4444" },
    { s: 326, e: 340, c: "#ff4444" },
  ];
  return (
    <div style={{ width: 80, height: 52 }}>
      <svg width="80" height="52" viewBox="0 0 80 52">
        {zones.map((z, i) => (
          <path key={i} d={arc(z.s, z.e)} fill="none" stroke={z.c} strokeWidth="5" strokeLinecap="butt" opacity="0.15" />
        ))}
        <path d={arc(200, 340)} fill="none" stroke="#0f0f0f" strokeWidth="3" strokeLinecap="round" />
        <path d={arc(200, 200 + (v / 100) * 140)} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={np.x} y2={np.y} stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3" fill={color} />
        <text x={cx} y={cy + 13} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace" fontWeight="700">
          {v.toFixed(0)}
        </text>
      </svg>
    </div>
  );
}

// ─── Fear & Greed Gauge ───────────────────────────────────────────────────────
export function FearGreedGauge({ value }) {
  const v = Math.max(0, Math.min(100, value || 50));
  const color =
    v > 75 ? "#ff4444" : v > 55 ? "#ff8c00" : v < 25 ? "#00ff88" : v < 45 ? "#44aaff" : "#888";
  const label =
    v > 75 ? "EXTREME GREED" : v > 55 ? "GREED" : v < 25 ? "EXTREME FEAR" : v < 45 ? "FEAR" : "NEUTRAL";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 900, color, fontFamily: "monospace", lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 8, color, letterSpacing: 1.5, marginTop: 4 }}>{label}</div>
      <div style={{ height: 3, background: "#111", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", background: color, borderRadius: 2, boxShadow: `0 0 8px ${color}88`, transition: "width 1.2s ease" }} />
      </div>
    </div>
  );
}

// ─── Signal Badge ─────────────────────────────────────────────────────────────
export function Badge({ signal }) {
  return (
    <span style={{
      background: signal.bg, color: signal.color,
      border: `1px solid ${signal.color}44`,
      borderRadius: 3, padding: "2px 7px",
      fontSize: 9, fontFamily: "monospace", fontWeight: 700, letterSpacing: 0.8,
      whiteSpace: "nowrap",
    }}>
      {signal.label}
    </span>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────
export function ScoreBar({ score }) {
  const pct = Math.abs(score / 10) * 50;
  const color = score > 0 ? "#00ff88" : score < 0 ? "#ff4444" : "#555";
  return (
    <div style={{ position: "relative", height: 4, background: "#111", borderRadius: 2, marginTop: 6 }}>
      <div style={{ position: "absolute", left: "50%", width: 1, height: "100%", background: "#1e1e1e", zIndex: 2 }} />
      <div style={{
        position: "absolute",
        left: score < 0 ? `${50 - pct}%` : "50%",
        width: `${pct}%`, height: "100%",
        background: color, borderRadius: 2,
        boxShadow: `0 0 8px ${color}66`,
        transition: "all 0.8s ease",
      }} />
    </div>
  );
}

// ─── Loading Dots ─────────────────────────────────────────────────────────────
export function LoadingDots({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0 28px" }}>
      <div style={{ fontSize: 9, color: "#444", letterSpacing: 2, marginBottom: 14, animation: "blink 1.2s ease infinite" }}>
        {msg || "FETCHING…"}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 5 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#2a2a2a", animation: `loadDot 1.2s ease ${i * 0.15}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────
export function StatRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ fontSize: 9, color: "#2a2a2a" }}>{label}</span>
      <span style={{ fontSize: 9, color: color || "#666" }}>{value}</span>
    </div>
  );
}
