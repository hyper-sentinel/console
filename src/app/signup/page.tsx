"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Web4 has no separate signup — your AI key IS your identity.
// Redirect to login page.
export default function SignupPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/login"); }, [router]);
  return null;
}
