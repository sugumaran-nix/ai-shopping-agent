"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * This file is redundant in the Next.js App Router architecture.
 * The actual entry point is app/page.tsx.
 * We redirect to the correct home page to ensure consistency.
 */
export default function RootPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
