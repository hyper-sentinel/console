import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LAYOUTS, LayoutPreset } from "./pane-registry";

// Own layout type to avoid @types/react-grid-layout mismatches
export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

// ── Types ─────────────────────────────────────────────────────

interface TerminalState {
  // Active layout
  layout: LayoutItem[];
  activePanes: string[];

  // Saved layouts
  savedLayouts: Record<string, LayoutItem[]>;
  activePreset: LayoutPreset | "custom";

  // Pane actions
  addPane: (paneId: string) => void;
  removePane: (paneId: string) => void;
  updateLayout: (layout: LayoutItem[]) => void;

  // Layout management
  loadPreset: (preset: LayoutPreset) => void;
  saveLayout: (name: string) => void;
  loadSavedLayout: (name: string) => void;
  deleteSavedLayout: (name: string) => void;

  // UI state
  sidebarOpen: boolean;
  panePickerOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setPanePickerOpen: (open: boolean) => void;
}

// ── Store ─────────────────────────────────────────────────────

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      // Default: sentinel layout
      layout: DEFAULT_LAYOUTS.sentinel,
      activePanes: DEFAULT_LAYOUTS.sentinel.map((l) => l.i),
      savedLayouts: {},
      activePreset: "sentinel",

      // UI
      sidebarOpen: true,
      panePickerOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setPanePickerOpen: (open) => set({ panePickerOpen: open }),

      addPane: (paneId) => {
        const state = get();
        if (state.activePanes.includes(paneId)) return;

        // Find a slot — add to bottom of grid
        const maxY = state.layout.reduce(
          (max, l) => Math.max(max, l.y + l.h),
          0
        );

        const newItem: LayoutItem = {
          i: paneId,
          x: 0,
          y: maxY,
          w: 6,
          h: 3,
        };

        set({
          layout: [...state.layout, newItem],
          activePanes: [...state.activePanes, paneId],
          activePreset: "custom",
        });
      },

      removePane: (paneId) => {
        const state = get();
        set({
          layout: state.layout.filter((l) => l.i !== paneId),
          activePanes: state.activePanes.filter((id) => id !== paneId),
          activePreset: "custom",
        });
      },

      updateLayout: (layout) => {
        set({ layout, activePreset: "custom" });
      },

      loadPreset: (preset) => {
        const presetLayout = DEFAULT_LAYOUTS[preset];
        set({
          layout: presetLayout,
          activePanes: presetLayout.map((l) => l.i),
          activePreset: preset,
        });
      },

      saveLayout: (name) => {
        const state = get();
        set({
          savedLayouts: {
            ...state.savedLayouts,
            [name]: [...state.layout],
          },
        });
      },

      loadSavedLayout: (name) => {
        const state = get();
        const layout = state.savedLayouts[name];
        if (layout) {
          set({
            layout,
            activePanes: layout.map((l) => l.i),
            activePreset: "custom",
          });
        }
      },

      deleteSavedLayout: (name) => {
        const state = get();
        const { [name]: _, ...rest } = state.savedLayouts;
        set({ savedLayouts: rest });
      },
    }),
    {
      name: "sentinel-terminal-layout",
      partialize: (state) => ({
        layout: state.layout,
        activePanes: state.activePanes,
        savedLayouts: state.savedLayouts,
        activePreset: state.activePreset,
      }),
    }
  )
);
