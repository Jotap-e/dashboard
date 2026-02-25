'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const sidebarWidth = isCollapsed ? 70 : 282;
  
  return (
    <>
      <Sidebar />
      <main
        className="transition-all min-w-0 h-screen overflow-y-auto overflow-x-hidden"
        style={{
          marginLeft: sidebarWidth,
          width: `calc(100vw - ${sidebarWidth}px)`,
          maxWidth: '100%',
          transitionDuration: '30ms',
        }}
      >
        <div className="w-full min-w-0 max-w-full min-h-full">
          {children}
        </div>
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
