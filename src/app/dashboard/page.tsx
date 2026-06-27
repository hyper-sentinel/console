"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTerminalStore } from "@/lib/store";
import { PANE_REGISTRY, CATEGORIES, DEFAULT_LAYOUTS, LayoutPreset } from "@/lib/pane-registry";
import PaneGrid from "@/components/PaneGrid";
import CommandPalette from "@/components/CommandPalette";
import AuthGuard from "@/components/AuthGuard";
import KeyRevealModal from "@/components/KeyRevealModal";
import { useAuth, PROVIDER_INFO } from "@/lib/auth";
import { useApiHealth } from "@/lib/hooks";
import { CreditCard, PanelLeftClose, PanelLeft, Save } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function DashboardPage() {
  const { user, logout, pendingKeys, dismissKeys } = useAuth();
  const { data: health, isError: healthError } = useApiHealth();
  const {
    activePanes,
    activePreset,
    addPane,
    removePane,
    loadPreset,
    saveLayout,
    savedLayouts,
    loadSavedLayout,
    deleteSavedLayout,
  } = useTerminalStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [time, setTime] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const saveInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+P / Cmd+P hotkey
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (saveDialogOpen) saveInputRef.current?.focus();
  }, [saveDialogOpen]);

  const handleSave = () => {
    if (layoutName.trim()) {
      saveLayout(layoutName.trim());
      setLayoutName("");
      setSaveDialogOpen(false);
    }
  };

  const providerName = user?.provider ? PROVIDER_INFO[user.provider]?.name : null;

  return (
    <AuthGuard>
    <div className="h-screen flex" style={{ background: "var(--bg-primary)" }}>
      {/* ── Pane Selector Sidebar ── */}
      {sidebarOpen && (
        <aside className="w-60 shrink-0 border-r flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          {/* Logo */}
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
            <Image src="/brand/sentinel-logo.jpg" alt="Sentinel" width={28} height={28} className="rounded" />
            <div>
              <span className="text-sm font-bold">Sentinel</span>
              <span className={`tier-badge ${user?.tier === "pro" || user?.tier === "enterprise" ? "paid" : "free"} ml-2`}>{(user?.tier || "free").toUpperCase()}</span>
            </div>
          </div>

          {/* Layout Presets */}
          <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-dim)" }}>Layout</p>
            <div className="flex gap-1">
              {(Object.keys(DEFAULT_LAYOUTS) as LayoutPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => loadPreset(preset)}
                  className="text-[11px] px-2.5 py-1.5 rounded capitalize font-medium"
                  style={{
                    background: activePreset === preset ? "rgba(0,255,136,0.1)" : "var(--bg-primary)",
                    color: activePreset === preset ? "var(--accent-green)" : "var(--text-dim)",
                    border: activePreset === preset ? "1px solid rgba(0,255,136,0.3)" : "1px solid var(--border)",
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Save/Load */}
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={() => setSaveDialogOpen(true)}
                className="text-[10px] px-2.5 py-1 rounded flex items-center gap-1"
                style={{ background: "var(--bg-primary)", color: "var(--text-dim)", border: "1px solid var(--border)" }}
              >
                <Save size={10} /> Save
              </button>
              {Object.keys(savedLayouts).length > 0 && (
                <div className="flex gap-0.5 overflow-x-auto">
                  {Object.keys(savedLayouts).map((name) => (
                    <button
                      key={name}
                      onClick={() => loadSavedLayout(name)}
                      className="text-[10px] px-2.5 py-1 rounded shrink-0 group relative"
                      style={{ background: "var(--bg-primary)", color: "var(--accent-cyan)", border: "1px solid var(--border)" }}
                    >
                      {name}
                      <span
                        onClick={(e) => { e.stopPropagation(); deleteSavedLayout(name); }}
                        className="ml-1 text-[8px] opacity-50 hover:opacity-100 cursor-pointer"
                        style={{ color: "var(--accent-red)" }}
                      >✕</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save dialog */}
            {saveDialogOpen && (
              <div className="flex gap-1 mt-1.5">
                <input
                  ref={saveInputRef}
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="Layout name..."
                  className="input-field !text-[10px] !py-1 flex-1"
                />
                <button onClick={handleSave} className="text-[10px] px-2 rounded" style={{ background: "var(--accent-green)", color: "#000", fontWeight: 700 }}>✓</button>
                <button onClick={() => setSaveDialogOpen(false)} className="text-[10px] px-1" style={{ color: "var(--text-dim)" }}>✕</button>
              </div>
            )}
          </div>

          {/* Pane Categories */}
          <div className="flex-1 overflow-auto py-2">
            {CATEGORIES.map((cat) => {
              const catPanes = Object.values(PANE_REGISTRY).filter((p) => p.category === cat.id);
              return (
                <div key={cat.id} className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5" style={{ color: "var(--text-dim)" }}>
                    <cat.icon size={12} /> {cat.label}
                  </p>
                  {catPanes.map((pane) => {
                    const isActive = activePanes.includes(pane.id);
                    return (
                      <button
                        key={pane.id}
                        onClick={() => isActive ? removePane(pane.id) : addPane(pane.id)}
                        className="w-full text-left px-3 py-2 flex items-center justify-between group transition-colors"
                        style={{ color: isActive ? "var(--accent-green)" : "var(--text-secondary)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <pane.icon size={14} />
                          <span className="text-[12px] font-medium truncate">{pane.title}</span>
                        </div>
                        <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: isActive ? "var(--accent-red)" : "var(--accent-green)" }}>
                          {isActive ? "−" : "+"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
            <Link href="/billing" className="flex items-center gap-2 text-[10px] py-1.5 px-2 rounded mb-1 transition-colors hover:opacity-80"
              style={{ background: "rgba(0,255,136,0.06)", color: "var(--accent-green)", border: "1px solid rgba(0,255,136,0.15)" }}>
              <CreditCard size={12} /> Billing & Plans
            </Link>
            <p className="text-[10px] font-mono text-center" style={{ color: "var(--text-dim)" }}>
              {activePanes.length} pane{activePanes.length !== 1 ? "s" : ""} active · <span style={{ color: "var(--accent-green)" }}>⌘P</span> palette
            </p>
          </div>
        </aside>
      )}

      {/* ── Main Terminal Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-10 shrink-0 border-b flex items-center justify-between px-3" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sm hover:opacity-80 transition-opacity"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
            </button>
            <span className="text-xs font-bold">Sentinel Terminal</span>
            <Link href="/console" className="text-[10px] px-2 py-1 rounded transition-colors" style={{ color: "var(--accent-purple, #A78BFA)", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>Console</Link>
            <span className="text-[11px] font-mono" style={{ color: "var(--text-dim)" }} suppressHydrationWarning>{time} UTC</span>
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono transition"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
              title="Command Palette (Ctrl+P)"
            >
              <span>⌘P</span>
              <span>Search...</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Health indicator */}
            <div className="flex items-center gap-1.5" title={health ? "API Gateway connected" : healthError ? "Gateway unreachable" : "Checking..."}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: health ? "var(--accent-green)" : healthError ? "var(--accent-red)" : "#666" }} />
              <span className="text-[10px] font-mono" style={{ color: health ? "var(--accent-green)" : healthError ? "var(--accent-red)" : "var(--text-dim)" }}>
                {health ? "Online" : healthError ? "Offline" : "..."}
              </span>
            </div>
            {providerName && (
              <div className="flex items-center gap-1.5">
                <span className="status-dot online"></span>
                <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{providerName}</span>
              </div>
            )}
            {user?.email && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>{user.email}</span>
              </div>
            )}
            <span className={`tier-badge ${user?.tier === "pro" || user?.tier === "enterprise" ? "paid" : "free"}`}>{(user?.tier || "free").toUpperCase()}</span>
            <button
              onClick={logout}
              className="text-[10px] px-2 py-1 rounded transition-colors hover:opacity-80"
              style={{ color: "var(--accent-red)", border: "1px solid rgba(255,68,68,0.2)" }}
              title="Sign out"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Grid */}
        <main className="flex-1 overflow-auto p-1">
          <PaneGrid />
        </main>
      </div>

      {/* Key Reveal Modal (Web4 handshake moment) */}
      {pendingKeys && (
        <KeyRevealModal
          apiKey={pendingKeys.apiKey}
          secretKey={pendingKeys.secretKey}
          isNewUser={pendingKeys.isNewUser}
          onDismiss={dismissKeys}
        />
      )}

      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
    </AuthGuard>
  );
}
