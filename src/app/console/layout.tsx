"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { api, type BillingStatus } from "@/lib/api";
import PaymentAlert from "@/components/PaymentAlert";
import {
  LayoutGrid, Key, Zap, Wrench, BarChart3,
  CreditCard, Settings, Search, Play,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "EXPLORE",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutGrid, href: "/console" },
      { id: "api-keys", label: "API Keys", icon: Key, href: "/console/api-keys" },
    ],
  },
  {
    label: "BUILD",
    items: [
      { id: "playground", label: "Playground", icon: Zap, href: "/console/playground" },
      { id: "tools", label: "Tools", icon: Wrench, href: "/console/tools" },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { id: "usage", label: "Usage", icon: BarChart3, href: "/console/usage" },
      { id: "billing", label: "Billing", icon: CreditCard, href: "/console/billing" },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { id: "settings", label: "Settings", icon: Settings, href: "/console/settings" },
    ],
  },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [health, setHealth] = useState<boolean | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    api.health().then(() => setHealth(true)).catch(() => setHealth(false));
    const interval = setInterval(() => {
      api.health().then(() => setHealth(true)).catch(() => setHealth(false));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.getBillingStatus()
      .then((d) => setBillingStatus(d))
      .catch(() => {});
  }, []);

  const isActive = (href: string) => {
    if (href === "/console") return pathname === "/console";
    return pathname?.startsWith(href);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0B" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#8B5CF6", borderTopColor: "transparent" }} />
          <span className="text-xs font-mono" style={{ color: "#3F3F46" }}>Loading Console...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile Gate ── */}
      <div
        className="md:hidden min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#0A0A0B", color: "#E4E4E7" }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(139, 92, 246, 0.12)", border: "1px solid rgba(139, 92, 246, 0.25)" }}>
          <LayoutGrid size={28} style={{ color: "#A78BFA" }} />
        </div>
        <h2 className="text-xl font-bold mb-2">Desktop Required</h2>
        <p className="text-sm mb-6 max-w-xs" style={{ color: "#A1A1AA" }}>
          The Sentinel Console is built for desktop trading — multi-panel layouts, advanced charts, and keyboard shortcuts need a larger screen.
        </p>
        <Link
          href="/"
          className="btn-primary !text-sm !py-2.5 !px-6 mb-3"
        >
          Back to Home
        </Link>
        <p className="text-xs" style={{ color: "#52525B" }}>
          Open this page on your laptop or desktop
        </p>
      </div>

      {/* ── Desktop Console ── */}
      <div className="hidden md:flex h-screen overflow-hidden" style={{ background: "#0A0A0B", color: "#E4E4E7" }}>
      {/* ── Sidebar ── */}
      <aside
        className="shrink-0 border-r flex flex-col h-screen transition-all duration-200"
        style={{
          width: sidebarCollapsed ? 60 : 240,
          background: "#111113",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b flex items-center gap-3 shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <a href="https://hyper-sentinel.com" className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity" title="Back to hyper-sentinel.com">
            <Image src="/brand/sentinel-logo.jpg" alt="Sentinel" width={28} height={28} className="rounded-lg shrink-0" />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">Sentinel Console</p>
              </div>
            )}
          </a>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto text-xs opacity-50 hover:opacity-100 transition shrink-0"
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        {/* Trading terminal — web app NOT live yet. Non-navigating "coming soon" state
            (the /dashboard terminal isn't shipped as a web app); nudge users to the CLI. */}
        <div className="px-3 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <a
            href="https://pypi.org/project/hyper-sentinel/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all hover:border-purple-500/30"
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.2)",
              color: "#A78BFA",
            }}
            title="Install the Sentinel CLI: pip install hyper-sentinel"
          >
            {!sidebarCollapsed ? (
              <>
                <Play size={14} />
                <span className="font-mono text-xs">pip install hyper-sentinel</span>
              </>
            ) : (
              <Play size={14} />
            )}
          </a>
        </div>

        {/* Nav Sections */}
        <nav className="flex-1 overflow-auto py-2 min-h-0">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-3">
              {!sidebarCollapsed && (
                <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#52525B" }}>
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: active ? "rgba(139, 92, 246, 0.12)" : "transparent",
                      color: active ? "#A78BFA" : "#A1A1AA",
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon size={16} strokeWidth={1.75} className="shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: "#52525B" }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: health ? "#00FF88" : health === false ? "#FF4444" : "#666" }} />
            {!sidebarCollapsed && (
              <span>{health ? "API Online" : health === false ? "API Offline" : "Checking..."}</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <>
              <div className="flex gap-3 text-[10px]" style={{ color: "#52525B" }}>
                <a href="https://api.hyper-sentinel.com/docs" target="_blank" className="hover:text-white transition">Docs ↗</a>
                <a href="https://github.com/hyper-sentinel" target="_blank" className="hover:text-white transition">GitHub ↗</a>
                <a href="https://pypi.org/project/hyper-sentinel" target="_blank" className="hover:text-white transition">PyPI ↗</a>
              </div>
              <p className="text-[9px] font-mono" style={{ color: "#3F3F46" }}>
                Sentinel Labs LLC · 2026
              </p>
            </>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 shrink-0 border-b flex items-center justify-between px-6" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0D0D0F" }}>
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition hover:border-purple-500/30"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#71717A" }}
            >
              <Search size={14} className="shrink-0" /> Search... <span className="ml-4 text-[10px] opacity-50">⌘K</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: health ? "#00FF88" : "#FF4444" }} />
              <span className="text-[11px] font-mono" style={{ color: health ? "#00FF88" : "#FF4444" }}>
                {health ? "Online" : "Offline"}
              </span>
            </div>
            {(() => {
              // Trust the gateway's `gated` field — it already accounts for active
              // payment status (gated == paymentStatus != "active"). Do NOT re-derive
              // from prompt counts, which wrongly brands a paying user "FREE (Limited)"
              // when their stale prompt count exceeds the free limit.
              const isGated = billingStatus?.gated === true;
              if (isGated) {
                return (
                  <Link href="/console/billing" className="text-[11px] px-2 py-0.5 rounded-full font-semibold transition-opacity hover:opacity-80" style={{
                    background: "rgba(245,158,11,0.12)",
                    color: "#F59E0B",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}>
                    FREE (Limited)
                  </Link>
                );
              }
              return (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{
                  background: "rgba(139, 92, 246, 0.12)",
                  color: "#A78BFA",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                }}>
                  PAY-AS-YOU-GO
                </span>
              );
            })()}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(139, 92, 246, 0.2)", color: "#A78BFA" }}>
                {(user?.name?.[0] || user?.email?.[0] || "S").toUpperCase()}
              </div>
              <button onClick={logout} className="text-xs hover:text-white transition" style={{ color: "#71717A" }}>
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <PaymentAlert />
          {children}
        </div>
      </main>
    </div>
    </>
  );
}
