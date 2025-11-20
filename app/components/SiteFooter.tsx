'use client';

import { usePathname } from 'next/navigation';
import { FooterDemo } from './Footer';

const hiddenRoutes = ['/ai-guide'];

export function SiteFooter() {
  const pathname = usePathname();

  if (hiddenRoutes.includes(pathname)) {
    return null;
  }

  return <FooterDemo />;
}

