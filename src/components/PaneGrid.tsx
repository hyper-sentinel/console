"use client";
import { useCallback, useRef, useState, useEffect } from "react";
import ReactGridLayout from "react-grid-layout";
import { useTerminalStore } from "@/lib/store";
import { PANE_REGISTRY } from "@/lib/pane-registry";
import PaneShell from "./PaneShell";
import "react-grid-layout/css/styles.css";

const COLS = 12;
const ROW_HEIGHT = 60;

export default function PaneGrid() {
  const layout = useTerminalStore((s) => s.layout);
  const activePanes = useTerminalStore((s) => s.activePanes);
  const updateLayout = useTerminalStore((s) => s.updateLayout);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth);
    return () => observer.disconnect();
  }, []);

  const onLayoutChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newLayout: any) => {
      updateLayout(newLayout);
    },
    [updateLayout]
  );

  /* react-grid-layout types are inconsistent between @types and runtime.
     Using double-cast to bridge safely. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GridLayout = ReactGridLayout as unknown as React.ComponentType<any>;

  return (
    <div ref={containerRef} className="h-full">
      <GridLayout
        className="pane-grid"
        layout={layout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={width}
        onLayoutChange={onLayoutChange}
        draggableHandle=".drag-handle"
        compactType="vertical"
        isResizable={true}
        isDraggable={true}
        margin={[6, 6]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
      >
        {activePanes.map((paneId) => {
          const config = PANE_REGISTRY[paneId];
          if (!config) return null;

          return (
            <div key={paneId} data-pane-id={paneId}>
              <PaneShell paneId={paneId} />
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
