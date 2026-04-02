"use client";

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  change?: string;
  changeColor?: string;
  positive?: boolean;
  subtitle?: string;
}

export default function StatCard({ icon, label, value, change, changeColor, positive, subtitle }: StatCardProps) {
  const computedColor = changeColor || (positive === true ? "var(--accent-green)" : positive === false ? "var(--accent-red)" : "var(--text-dim)");
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg">{icon}</span>
        {change && (
          <span className="text-xs font-mono font-bold" style={{ color: computedColor }}>
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs" style={{ color: "var(--text-dim)" }}>{label}</p>
      {subtitle && (
        <p className="text-[10px] mt-1 font-mono" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      )}
    </div>
  );
}
