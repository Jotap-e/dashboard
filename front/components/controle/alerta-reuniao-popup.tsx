'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Forecast } from '@/lib/types/forecast';
import { TempoRestante } from '@/lib/utils/forecast';
import { AlertTriangle } from 'lucide-react';

interface AlertaReuniaoPopupProps {
  forecast: Forecast | null;
  countdown: TempoRestante | null;
}

function formatCountdown(minutos: number, segundos: number): string {
  const m = String(minutos).padStart(2, '0');
  const s = String(segundos).padStart(2, '0');
  return `${m}:${s}`;
}

export function AlertaReuniaoPopup({ forecast, countdown }: AlertaReuniaoPopupProps) {
  const [pos, setPos] = useState({ x: 24, y: 100 });
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!forecast) return;
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: pos.x,
        posY: pos.y,
      };
    },
    [forecast, pos]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(0, dragRef.current.posX + dx),
        y: Math.max(0, dragRef.current.posY + dy),
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!forecast || !countdown) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="alerta-reuniao-popup fixed z-[9999] cursor-move select-none"
      style={{
        left: pos.x,
        top: pos.y,
        minWidth: 280,
        maxWidth: 360,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="rounded-lg border-2 border-[#fef08a] shadow-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          boxShadow: '0 0 24px rgba(220, 38, 38, 0.6), 0 0 48px rgba(239, 68, 68, 0.3)',
          animation: 'alert-hora-proxima 0.8s ease-in-out infinite',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#fef08a] flex items-center justify-center">
            <AlertTriangle className="text-[#dc2626]" style={{ width: 24, height: 24 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#fef08a] font-bold text-sm uppercase tracking-wide">
              Reunião se aproxima
            </p>
            <p className="text-white font-semibold truncate" style={{ fontSize: '1rem' }}>
              {forecast.clienteNome}
            </p>
            <p className="text-[#fef08a] font-mono text-2xl font-bold mt-1 tabular-nums">
              {formatCountdown(countdown.minutos, countdown.segundos)}
            </p>
            <p className="text-white/80 text-xs mt-0.5">
              Horário agendado: {forecast.horario}
            </p>
          </div>
        </div>
        <p className="text-[#fef08a]/90 text-xs mt-2 text-center">
          Arraste para mover • Fecha automaticamente no horário
        </p>
      </div>
    </div>
  );
}
