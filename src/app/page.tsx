"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * Console root — smart redirect.
 * Authed  → /console (dashboard)
 * Unauthed → /login
 *
 * The marketing landing page lives on hyper-sentinel.com (waitlist site),
 * not on the console subdomain.
 */
export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      router.replace(user ? "/console" : "/login");
    }
  }, [user, isLoading, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0A0A0B" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#8B5CF6", borderTopColor: "transparent" }}
        />
        <span className="text-xs font-mono" style={{ color: "#3F3F46" }}>
          Loading...
        </span>
      </div>
    </div>
  );
}
