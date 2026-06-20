"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  LineChart,
  Shield,
  CreditCard,
  Settings,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: LineChart, label: "Terminal", href: "/terminal" },
  { icon: Shield, label: "Monitors", href: "/monitors" },
  { icon: CreditCard, label: "Billing", href: "/billing" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const tierClass = user?.tier === "enterprise" ? "enterprise" : user?.tier === "pro" ? "paid" : "free";
  const tierLabel = (user?.tier || "free").toUpperCase();

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-3" style={{ textDecoration: "none", color: "inherit" }}>
          <Image
            src="/brand/sentinel-logo.jpg"
            alt="Sentinel"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div>
            <span className="font-bold text-base tracking-tight">SENTINEL</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="status-dot online"></span>
              <span className="text-[10px] font-mono" style={{ color: "var(--accent-green)" }}>LIVE</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <p className="text-[10px] font-mono uppercase tracking-widest px-6 mb-3" style={{ color: "var(--text-dim)" }}>
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${pathname === item.href ? "active" : ""}`}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 px-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
          >
            <User size={14} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || user?.email || "Operator"}</p>
            <span className={`tier-badge ${tierClass}`}>{tierLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
