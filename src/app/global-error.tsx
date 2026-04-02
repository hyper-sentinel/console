"use client";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "'Inter', sans-serif",
          background: "#0a0a0a",
          color: "#e5e5e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "480px", padding: "2rem" }}>
          <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>—</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "1.5rem" }}>
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                background: "#00ff88",
                color: "#000",
                border: "none",
                padding: "0.625rem 1.5rem",
                borderRadius: "0.5rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#e5e5e5",
                border: "1px solid #333",
                padding: "0.625rem 1.5rem",
                borderRadius: "0.5rem",
                fontWeight: 500,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
