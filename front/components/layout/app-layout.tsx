'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context';
import { usePathname } from 'next/navigation';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  
  return (
    <>
      <Sidebar />
      <main
        className="transition-all"
        style={{
          marginLeft: isCollapsed ? '70px' : '282px',
          transitionDuration: '30ms'
        }}
      >
        {children}
      </main>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutContent>
        {children}
      </AppLayoutContent>
    </SidebarProvider>
  );
}
