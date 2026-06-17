"use client";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import KeyRevealModal from "@/components/KeyRevealModal";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredTier?: "pro" | "enterprise";
}

export default function AuthGuard({ children, requiredTier }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user, pendingKeys, dismissKeys } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div className="flex gap-1 justify-center mb-4">
            <div className="w-3 h-3 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)" }}></div>
            <div className="w-3 h-3 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)", animationDelay: "0.2s" }}></div>
            <div className="w-3 h-3 rounded-full animate-pulse-glow" style={{ background: "var(--accent-green)", animationDelay: "0.4s" }}></div>
          </div>
          <p className="text-sm font-mono" style={{ color: "var(--text-dim)" }}>Initializing Sentinel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Tier gating — show upgrade prompt for restricted features
  if (requiredTier && user) {
    const tierRank: Record<string, number> = { "pay-as-you-go": 0, free: 0, pro: 1, enterprise: 2 };
    const userTierRank = user.tier != null ? (tierRank[user.tier] ?? 0) : 0;
    if (userTierRank < (tierRank[requiredTier] ?? 0)) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center glass-panel p-8 max-w-md">
            <p className="text-4xl mb-4">🔒</p>
            <h2 className="text-xl font-bold mb-2">Pro Feature</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              This feature requires a {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} subscription.
            </p>
            <button className="btn-primary">Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} →</button>
          </div>
        </div>
      );
    }
  }

  return (
    <>
      {pendingKeys && (
        <KeyRevealModal
          apiKey={pendingKeys.apiKey}
          secretKey={pendingKeys.secretKey}
          isNewUser={pendingKeys.isNewUser}
          onDismiss={dismissKeys}
        />
      )}
      {children}
    </>
  );
}
