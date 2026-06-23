"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /terminal — DexScreener-style trading terminal. NOT live yet.
 * Redirect to /console until ready to ship.
 */
export default function TerminalPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/console"); }, [router]);
  return null;
}
