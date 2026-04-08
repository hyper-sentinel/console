/**
 * DCA Engine — Dollar-cost averaging into positions on dips.
 * Ported from Python hyper-sentinel/core/dca_engine.py (124 lines).
 */

import type { DCAOrder, DCAStatus } from "./algos/types";

export class DCAEngine {
  spreadPct: number;      // DCA when price moves this % against position
  maxCount: number;        // Max DCA orders
  sizeMultiplier: number;  // DCA size relative to initial

  dcaCount: number = 0;
  lastOrderPrice: number | null = null;
  totalQuantity: number = 0;
  totalCost: number = 0;
  orders: DCAOrder[] = [];

  constructor(spreadPct: number = 2.0, maxCount: number = 3, sizeMultiplier: number = 1.0) {
    this.spreadPct = spreadPct;
    this.maxCount = maxCount;
    this.sizeMultiplier = sizeMultiplier;
  }

  get avgEntry(): number {
    return this.totalQuantity > 0 ? this.totalCost / this.totalQuantity : 0;
  }

  reset(): void {
    this.dcaCount = 0;
    this.lastOrderPrice = null;
    this.totalQuantity = 0;
    this.totalCost = 0;
    this.orders = [];
  }

  setInitialEntry(price: number, quantity: number): void {
    this.reset();
    this.lastOrderPrice = price;
    this.totalQuantity = quantity;
    this.totalCost = price * quantity;
    this.orders.push({ price, quantity, type: "initial" });
  }

  shouldDCA(currentPrice: number, side: "buy" | "sell"): boolean {
    if (this.dcaCount >= this.maxCount) return false;
    if (this.lastOrderPrice === null) return false;

    const pctChange = ((currentPrice - this.lastOrderPrice) / this.lastOrderPrice) * 100;

    // For longs: DCA when price drops by spreadPct%
    if (side === "buy" && pctChange <= -this.spreadPct) return true;
    // For shorts: DCA when price rises by spreadPct%
    if (side === "sell" && pctChange >= this.spreadPct) return true;

    return false;
  }

  getDCASize(baseQuantity: number): number {
    return baseQuantity * this.sizeMultiplier;
  }

  recordDCA(price: number, quantity: number): void {
    this.dcaCount++;
    this.lastOrderPrice = price;
    this.totalQuantity += quantity;
    this.totalCost += price * quantity;
    this.orders.push({ price, quantity, type: `dca_${this.dcaCount}` });
  }

  status(): DCAStatus {
    return {
      dcaCount: this.dcaCount,
      maxCount: this.maxCount,
      avgEntry: this.avgEntry,
      totalQuantity: this.totalQuantity,
      totalCost: this.totalCost,
      spreadPct: this.spreadPct,
      orders: [...this.orders],
    };
  }
}
