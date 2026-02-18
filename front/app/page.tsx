'use client';

import { BackgroundLogo } from '@/components/ui/background-logo';

export default function Home() {
  return (
    <>
      <BackgroundLogo />
      <div className="relative z-10 h-screen overflow-hidden p-4 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0">
          <h1 className="text-xl font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Dashboard de vendas 
          </h1>
        </div>
      </div>
    </>
  );
}
