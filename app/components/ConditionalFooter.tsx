"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./SiteFooter";

export function ConditionalFooter() {
  const pathname = usePathname();
  const hideFooter = pathname?.includes('/safety/ai-medic');

  if (hideFooter) return null;
  return <SiteFooter />;
}

