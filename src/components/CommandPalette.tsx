"use client";
import { useState, useEffect, useRef, useMemo, createElement } from "react";
import { PANE_REGISTRY, CATEGORIES, DEFAULT_LAYOUTS, LayoutPreset } from "@/lib/pane-registry";
import { useTerminalStore } from "@/lib/store";
import type { LucideIcon } from "lucide-react";
import { Layout, Trash2, SettingsIcon, Monitor } from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon | string;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { addPane, removePane, activePanes, loadPreset } = useTerminalStore();

  // Build command list
  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // Pane commands
    Object.values(PANE_REGISTRY).forEach((pane) => {
      const isActive = activePanes.includes(pane.id);
      items.push({
        id: `pane-${pane.id}`,
        label: isActive ? `Close ${pane.title}` : `Open ${pane.title}`,
        description: pane.description,
        icon: pane.icon,
        category: "Panes",
        action: () => {
          if (isActive) {
            removePane(pane.id);
          } else {
            addPane(pane.id);
          }
          onClose();
        },
      });
    });

    // Layout presets
    (Object.keys(DEFAULT_LAYOUTS) as LayoutPreset[]).forEach((preset) => {
      items.push({
        id: `layout-${preset}`,
        label: `Layout: ${preset.charAt(0).toUpperCase() + preset.slice(1)}`,
        description: `Switch to ${preset} layout preset`,
        icon: Layout,
        category: "Layouts",
        action: () => {
          loadPreset(preset);
          onClose();
        },
      });
    });

    // Quick actions
    items.push(
      {
        id: "action-clear",
        label: "Close All Panes",
        description: "Remove all panes from the workspace",
        icon: Trash2,
        category: "Actions",
        action: () => {
          activePanes.forEach((id) => removePane(id));
          onClose();
        },
      },
      {
        id: "action-settings",
        label: "Open Settings",
        description: "Configure API keys and preferences",
        icon: SettingsIcon,
        category: "Actions",
        action: () => {
          window.location.href = "/settings";
        },
      },
      {
        id: "action-terminal",
        label: "Open DEX Terminal",
        description: "Switch to the full-screen Axiom-style terminal",
        icon: Monitor,
        category: "Actions",
        action: () => {
          window.location.href = "/terminal";
        },
      }
    );

    return items;
  }, [activePanes, addPane, removePane, loadPreset, onClose]);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keep selection in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!open) return null;

  // Group by category
  const grouped: Record<string, CommandItem[]> = {};
  filtered.forEach((cmd) => {
    if (!grouped[cmd.category]) grouped[cmd.category] = [];
    grouped[cmd.category].push(cmd);
  });

  let flatIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-[560px] max-h-[60vh] flex flex-col"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-active)",
          borderRadius: "12px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,255,136,0.05)",
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--accent-green)" }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search panes, layouts, actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)", caretColor: "var(--accent-green)" }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: "var(--bg-primary)", color: "var(--text-dim)", border: "1px solid var(--border)" }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-auto py-1" style={{ maxHeight: "calc(60vh - 52px)" }}>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p
                  className="text-[9px] font-semibold uppercase tracking-wider px-4 py-1.5"
                  style={{ color: "var(--text-dim)" }}
                >
                  {category}
                </p>
                {items.map((cmd) => {
                  flatIndex++;
                  const isSelected = flatIndex === selectedIndex;
                  const idx = flatIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                      style={{
                        background: isSelected ? "var(--bg-hover)" : "transparent",
                        borderLeft: isSelected ? "2px solid var(--accent-green)" : "2px solid transparent",
                      }}
                    >
                      <span className="text-base w-6 text-center shrink-0 flex items-center justify-center">
                        {typeof cmd.icon === "string" ? cmd.icon : createElement(cmd.icon, { size: 16 })}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {cmd.label}
                        </div>
                        <div className="text-[11px] truncate" style={{ color: "var(--text-dim)" }}>
                          {cmd.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-t text-[10px]"
          style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
        >
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </>
  );
}
