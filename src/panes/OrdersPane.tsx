"use client";
import { useState } from "react";
import { useOpenOrders, useAsterOpenOrders, useCancelHLOrder, useCancelAsterOrder, useCancelAllAster } from "@/lib/hooks";

type Venue = "hl" | "aster";

export default function OrdersPane() {
  const [venue, setVenue] = useState<Venue>("hl");
  const { data: hlRaw, isLoading: hlLoading } = useOpenOrders();
  const { data: asterRaw, isLoading: asterLoading } = useAsterOpenOrders();
  const cancelHL = useCancelHLOrder();
  const cancelAster = useCancelAsterOrder();
  const cancelAllAster = useCancelAllAster();

  const hlOrders = Array.isArray(hlRaw) ? hlRaw : [];
  const asterOrders = Array.isArray(asterRaw) ? asterRaw : [];
  const isLoading = venue === "hl" ? hlLoading : asterLoading;
  const orders = venue === "hl" ? hlOrders : asterOrders;

  const handleCancel = (order: Record<string, unknown>) => {
    const symbol = String(order.coin || order.symbol || "");
    const orderId = String(order.oid || order.order_id || order.orderId || "");
    if (!symbol || !orderId) return;
    if (venue === "hl") {
      cancelHL.mutate({ coin: symbol, orderId });
    } else {
      cancelAster.mutate({ symbol, orderId });
    }
  };

  const handleCancelAll = () => {
    if (!confirm("Cancel ALL open orders on Aster?")) return;
    cancelAllAster.mutate(undefined);
  };

  return (
    <div className="flex flex-col h-full" style={{ fontSize: "11px" }}>
      {/* Venue tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setVenue("hl")}
          className="text-[10px] px-2 py-0.5 rounded font-semibold"
          style={{
            background: venue === "hl" ? "rgba(0,229,255,0.1)" : "transparent",
            color: venue === "hl" ? "var(--accent-cyan)" : "var(--text-dim)",
            border: venue === "hl" ? "1px solid rgba(0,229,255,0.3)" : "1px solid transparent",
          }}
        >
          Hyperliquid ({hlOrders.length})
        </button>
        <button
          onClick={() => setVenue("aster")}
          className="text-[10px] px-2 py-0.5 rounded font-semibold"
          style={{
            background: venue === "aster" ? "rgba(139,92,246,0.1)" : "transparent",
            color: venue === "aster" ? "#8b5cf6" : "var(--text-dim)",
            border: venue === "aster" ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
          }}
        >
          Aster ({asterOrders.length})
        </button>
        {venue === "aster" && asterOrders.length > 0 && (
          <button
            onClick={handleCancelAll}
            className="ml-auto text-[9px] px-2 py-0.5 rounded font-semibold transition hover:opacity-80"
            style={{ background: "rgba(255,68,68,0.1)", color: "var(--accent-red)", border: "1px solid rgba(255,68,68,0.25)" }}
            disabled={cancelAllAster.isPending}
          >
            {cancelAllAster.isPending ? "Cancelling..." : "Cancel All"}
          </button>
        )}
      </div>

      {/* Orders table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono animate-pulse" style={{ color: "var(--text-dim)" }}>Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span style={{ fontSize: "24px" }}>📋</span>
            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>No open orders</span>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[9px] uppercase" style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left py-1.5 px-2 font-semibold">Symbol</th>
                <th className="text-right py-1.5 px-2 font-semibold">Side</th>
                <th className="text-right py-1.5 px-2 font-semibold">Type</th>
                <th className="text-right py-1.5 px-2 font-semibold">Price</th>
                <th className="text-right py-1.5 px-2 font-semibold">Size</th>
                <th className="text-right py-1.5 px-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: Record<string, unknown>, i: number) => {
                const symbol = String(order.coin || order.symbol || "—");
                const side = String(order.side || order.direction || "—");
                const type = String(order.order_type || order.orderType || order.type || "limit");
                const price = Number(order.price || order.limitPx || 0);
                const size = Math.abs(Number(order.size || order.sz || order.quantity || order.origQty || 0));
                const isBuy = side.toLowerCase().includes("buy") || side.toLowerCase() === "b";

                return (
                  <tr key={i} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="py-1.5 px-2 font-mono font-bold">{symbol}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold"
                      style={{ color: isBuy ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {side.toUpperCase()}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono uppercase text-[9px]"
                      style={{ color: "var(--text-dim)" }}>
                      {type}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">${price.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{size}</td>
                    <td className="py-1.5 px-2 text-right">
                      <button
                        onClick={() => handleCancel(order)}
                        className="text-[9px] px-2 py-0.5 rounded font-semibold transition hover:opacity-80"
                        style={{ background: "rgba(255,68,68,0.1)", color: "var(--accent-red)", border: "1px solid rgba(255,68,68,0.25)" }}
                        disabled={cancelHL.isPending || cancelAster.isPending}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
