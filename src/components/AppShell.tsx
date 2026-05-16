'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';

  return (
    <>
      {!isAuthPage && <Navigation />}
      <div className={isAuthPage ? '' : 'pt-16'}>{children}</div>
    </>
  );
}
