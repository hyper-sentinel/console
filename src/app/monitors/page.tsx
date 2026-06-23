"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /monitors — autonomous surveillance UI. NOT live yet.
 * Redirect to /console until ready to ship.
 */
export default function MonitorsPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/console"); }, [router]);
  return null;
}
