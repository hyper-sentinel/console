import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0a",
        color: "#e5e5e5",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px", padding: "2rem" }}>
        <p
          style={{
            fontSize: "5rem",
            fontWeight: 800,
            lineHeight: 1,
            background: "linear-gradient(135deg, #00ff88, #00e5ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.5rem",
          }}
        >
          404
        </p>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Sector Not Found
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "2rem" }}>
          This route doesn&apos;t exist in the Sentinel network. Check your coordinates.
        </p>
        <Link
          href="/"
          style={{
            background: "#00ff88",
            color: "#000",
            border: "none",
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            fontWeight: 700,
            fontSize: "0.875rem",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          ← Return to Base
        </Link>
      </div>
    </div>
  );
}
