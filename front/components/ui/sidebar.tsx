'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { LayoutDashboard, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/layout/sidebar-context';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = React.useState(false);
  const [displayCollapsed, setDisplayCollapsed] = React.useState(isCollapsed);
  const prevCollapsedRef = React.useRef(isCollapsed);

  // Lógica da logo: instantânea ao colapsar, com delay ao expandir
  React.useEffect(() => {
    const wasCollapsed = prevCollapsedRef.current;
    const isNowCollapsed = isCollapsed;
    
    // Se está colapsando (expandida -> colapsada): mudança instantânea
    if (!wasCollapsed && isNowCollapsed) {
      setDisplayCollapsed(true);
    }
    // Se está expandindo (colapsada -> expandida): aguarda animação (30ms)
    else if (wasCollapsed && !isNowCollapsed) {
      const timer = setTimeout(() => {
        setDisplayCollapsed(false);
      }, 30);
      return () => clearTimeout(timer);
    }
    // Garante sincronização inicial e quando não há transição
    else {
      setDisplayCollapsed(isCollapsed);
    }
    
    prevCollapsedRef.current = isCollapsed;
  }, [isCollapsed]);

  const menuItems = [
    {
      title: 'Painel',
      icon: LayoutDashboard,
      path: '/painel',
    },
    {
      title: 'Controle',
      icon: Settings,
      path: '/controle',
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleLogoClick = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 h-screen bg-[#1A1A1A] border-r border-[#2A2A2A] transition-all flex flex-col',
        className
      )}
      style={{
        width: isCollapsed ? '70px' : '282px',
        transitionDuration: '30ms'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={cn(
        'relative flex items-center border-b border-[#2A2A2A] flex-shrink-0',
        isCollapsed ? 'justify-center' : 'justify-start'
      )}
      style={{
        padding: 'clamp(1rem, 1.1vw, 1.1rem)',
        height: '88px'
      }}>
        <div 
          className={cn(
            'flex items-center cursor-pointer hover:opacity-80',
            isCollapsed ? 'justify-center' : 'justify-start'
          )}
          onClick={handleLogoClick}
          style={{ transition: 'none' }}
        >
          <Image
            src={displayCollapsed ? "/advhub.svg" : "/logo_advhub.svg"}
            alt="AdvHub Logo"
            width={displayCollapsed ? 53 : 132}
            height={displayCollapsed ? 53 : 132}
            className="flex-shrink-0"
            style={{ transition: 'none' }}
          />
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute text-[#CCCCCC] hover:text-white hover:bg-[#2A2A2A]"
            style={{
              right: 'clamp(1rem, 1.1vw, 1.1rem)',
              height: '36px',
              width: '36px'
            }}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <ChevronLeft style={{ width: '18px', height: '18px' }} />
          </Button>
        )}
      </div>

      {/* Collapse button when collapsed - positioned at top, right of sidebar */}
      {isCollapsed && isHovered && (
        <div 
          className="absolute top-0 right-0 translate-x-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="text-[#CCCCCC] hover:text-white hover:bg-[#2A2A2A] bg-[#1A1A1A] border border-l-0 border-[#2A2A2A] rounded-r-md"
            style={{
              height: '36px',
              width: '36px'
            }}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <ChevronRight style={{ width: '18px', height: '18px' }} />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 flex flex-col" style={{ padding: 'clamp(1rem, 1.1vw, 1.1rem)' }}>
        <div className="flex flex-col" style={{ gap: 'clamp(0.5rem, 0.55vw, 0.55rem)' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = 
            pathname === item.path || 
            (item.path === '/painel' && pathname === '/') ||
            (item.path === '/controle' && pathname.startsWith('/controle'));

          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'w-full flex items-center rounded-md font-medium transition-colors',
                isActive
                  ? 'bg-[#fed094]/20 text-[#fed094] border border-[#fed094]/30'
                  : 'text-[#CCCCCC] hover:bg-[#2A2A2A] hover:text-white',
                isCollapsed && 'justify-center'
              )}
              style={{
                gap: 'clamp(0.75rem, 0.825vw, 0.825rem)',
                padding: 'clamp(0.625rem, 0.6875vw, 0.6875rem)',
                fontSize: 'clamp(0.875rem, 0.9625vw, 0.9625rem)'
              }}
            >
              <Icon className={cn('flex-shrink-0', isCollapsed && 'mx-auto')} style={{ width: '22px', height: '22px' }} />
              {!isCollapsed && <span>{item.title}</span>}
            </button>
          );
        })}
        </div>
      </nav>
    </aside>
  );
}
