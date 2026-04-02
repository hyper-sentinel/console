export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0a",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <div
            className="animate-pulse-glow"
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#00ff88",
            }}
          />
          <div
            className="animate-pulse-glow"
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#00ff88",
              animationDelay: "0.2s",
            }}
          />
          <div
            className="animate-pulse-glow"
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#00ff88",
              animationDelay: "0.4s",
            }}
          />
        </div>
        <p style={{ color: "#555", fontSize: "0.75rem", fontFamily: "'JetBrains Mono', monospace" }}>
          Loading Sentinel...
        </p>
      </div>
    </div>
  );
}
