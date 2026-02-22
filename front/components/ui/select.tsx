'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
}

export function Select({ className, icon, children, style, ...props }: SelectProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute top-1/2 -translate-y-1/2 text-[#CCCCCC] z-10" style={{ left: 'clamp(0.75rem, 1.2vw, 1rem)' }}>
          {icon}
        </div>
      )}
      <select
        className={cn(
          'appearance-none bg-[#2A2A2A] border border-[#2A2A2A] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#fed094]/50 focus:border-[#fed094]/50',
          className
        )}
        style={{
          padding: 'clamp(0.5rem, 1vw, 0.75rem)',
          paddingLeft: icon ? 'clamp(2.5rem, 3.5vw, 3rem)' : 'clamp(0.75rem, 1.2vw, 1rem)',
          paddingRight: 'clamp(2rem, 3vw, 2.5rem)',
          fontSize: 'clamp(0.75rem, 1.2vw, 1rem)',
          ...style
        }}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute top-1/2 -translate-y-1/2 text-[#CCCCCC] pointer-events-none z-10" style={{ right: 'clamp(0.75rem, 1.2vw, 1rem)', width: 'clamp(0.875rem, 1.2vw, 1.25rem)', height: 'clamp(0.875rem, 1.2vw, 1.25rem)' }} />
    </div>
  );
}
