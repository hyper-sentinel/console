"use client";
import React from "react";

interface Props {
  children: React.ReactNode;
  paneId?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class PaneErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[PaneError] ${this.props.paneId || "unknown"}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <p className="text-2xl mb-3" style={{ color: "var(--accent-red)", opacity: 0.5 }}>!</p>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--accent-red)" }}>
            Pane Error
          </p>
          <p className="text-[10px] font-mono mb-3" style={{ color: "var(--text-dim)" }}>
            {this.state.error?.message || "Something went wrong"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="text-[10px] px-3 py-1 rounded-lg transition hover:opacity-80"
            style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.3)" }}
          >
            ↻ Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
