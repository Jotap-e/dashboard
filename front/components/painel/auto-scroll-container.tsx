'use client';

import { useRef, useEffect, useState, ReactNode, useCallback } from 'react';

interface AutoScrollContainerProps {
  children: ReactNode;
  speed?: number; // pixels por segundo
  pauseOnInteraction?: boolean;
}

export function AutoScrollContainer({ 
  children, 
  speed = 30, // pixels por segundo (mais lento e fluido)
  pauseOnInteraction = true 
}: AutoScrollContainerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const isMouseDownRef = useRef(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout>();
  const isScrollingRef = useRef(false);

  // Scroll automático otimizado
  useEffect(() => {
    if (isPaused || isUserInteracting) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      return;
    }

    const scroll = (currentTime: number) => {
      if (!scrollContainerRef.current || isPaused || isUserInteracting) return;

      const container = scrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      if (maxScroll <= 0) {
        animationFrameRef.current = requestAnimationFrame(scroll);
        return;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Converter para segundos
      lastTimeRef.current = currentTime;

      // Scroll suave baseado em pixels por segundo
      const scrollAmount = speed * deltaTime;
      
      container.scrollLeft += scrollAmount;

      // Reset quando chegar ao fim (com pequena margem para evitar flicker)
      if (container.scrollLeft >= maxScroll - 0.5) {
        container.scrollLeft = 0;
      }

      animationFrameRef.current = requestAnimationFrame(scroll);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [isPaused, isUserInteracting, speed]);

  // Detectar scroll manual do usuário (otimizado)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let lastScrollLeft = container.scrollLeft;
    let lastScrollTime = performance.now();
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (!container || isMouseDownRef.current) return;

      const currentScrollLeft = container.scrollLeft;
      const currentTime = performance.now();
      const timeDelta = (currentTime - lastScrollTime) / 1000; // segundos
      const scrollDelta = Math.abs(currentScrollLeft - lastScrollLeft);

      // Se o usuário scrollou manualmente (velocidade maior que o automático)
      const expectedAutoScroll = speed * timeDelta;
      if (timeDelta > 0 && scrollDelta > expectedAutoScroll * 1.3) {
        setIsUserInteracting(true);
        setIsPaused(true);

        // Retomar após um tempo sem scroll manual
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          setIsUserInteracting(false);
          setIsPaused(false);
          lastScrollLeft = container.scrollLeft;
          lastScrollTime = performance.now();
        }, 2000);
      }

      lastScrollLeft = currentScrollLeft;
      lastScrollTime = currentTime;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [speed]);

  // Detectar mouse down (clicar e segurar)
  const handleMouseDown = useCallback(() => {
    if (pauseOnInteraction) {
      isMouseDownRef.current = true;
      setIsPaused(true);
      setIsUserInteracting(true);
    }
  }, [pauseOnInteraction]);

  const handleMouseUp = useCallback(() => {
    if (pauseOnInteraction) {
      isMouseDownRef.current = false;
      // Pequeno delay antes de retomar para evitar scroll imediato
      setTimeout(() => {
        setIsPaused(false);
        setIsUserInteracting(false);
      }, 800);
    }
  }, [pauseOnInteraction]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnInteraction) {
      isMouseDownRef.current = false;
      setIsPaused(false);
      setIsUserInteracting(false);
    }
  }, [pauseOnInteraction]);

  return (
    <div
      ref={scrollContainerRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className="overflow-x-auto overflow-y-hidden scrollbar-hide"
      style={{
        scrollBehavior: 'auto',
        WebkitOverflowScrolling: 'touch',
        cursor: 'grab',
        willChange: 'scroll-position',
      }}
      onMouseMove={(e) => {
        if (isMouseDownRef.current && pauseOnInteraction) {
          // Manter pausado enquanto arrasta
          setIsPaused(true);
          setIsUserInteracting(true);
        }
      }}
      onScroll={(e) => {
        // Prevenir scroll vertical acidental
        const target = e.currentTarget;
        if (target.scrollTop !== 0) {
          target.scrollTop = 0;
        }
      }}
    >
      <div className="flex gap-4" style={{ width: 'max-content', paddingRight: '2rem' }}>
        {children}
      </div>
    </div>
  );
}
