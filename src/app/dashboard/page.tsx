"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /dashboard is the trading terminal — NOT live yet.
 * Redirect to /console until it's ready to ship.
 */
export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/console"); }, [router]);
  return null;
}
