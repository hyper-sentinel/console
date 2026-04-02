"use client";
import { Suspense, lazy, useMemo, ComponentType, createElement } from "react";
import { useTerminalStore } from "@/lib/store";
import { PANE_REGISTRY } from "@/lib/pane-registry";
import PaneErrorBoundary from "@/components/PaneErrorBoundary";

interface PaneShellProps {
  paneId: string;
  children?: React.ReactNode;
}

// Cache lazy components to avoid re-creating on each render
const lazyCache = new Map<string, React.LazyExoticComponent<ComponentType>>();

function getLazyComponent(paneId: string): React.LazyExoticComponent<ComponentType> | null {
  const config = PANE_REGISTRY[paneId];
  if (!config) return null;

  if (!lazyCache.has(paneId)) {
    lazyCache.set(paneId, lazy(config.component));
  }
  return lazyCache.get(paneId)!;
}

export default function PaneShell({ paneId, children }: PaneShellProps) {
  const removePane = useTerminalStore((s) => s.removePane);
  const config = PANE_REGISTRY[paneId];
  const LazyComponent = useMemo(() => getLazyComponent(paneId), [paneId]);

  if (!config || !LazyComponent) return null;

  return (
    <div className="pane-shell">
      {/* Header — this is the drag handle */}
      <div className="pane-header drag-handle">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">{createElement(config.icon, { size: 14 })}</span>
          <span className="text-xs font-semibold truncate">{config.title}</span>
          {config.tier !== "free" && (
            <span className="tier-badge paid text-[9px] !py-0">{config.tier.toUpperCase()}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="pane-btn"
            onClick={() => removePane(paneId)}
            title="Close pane"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pane-body">
        <PaneErrorBoundary paneId={paneId}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)" }}></div>
                <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)", animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)", animationDelay: "0.4s" }}></div>
              </div>
            </div>
          }
        >
          {children || <LazyComponent />}
        </Suspense>
        </PaneErrorBoundary>
      </div>
    </div>
  );
}
