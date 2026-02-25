'use client';

import { useEffect, useState } from 'react';
import { Clock as ClockIcon } from 'lucide-react';

export function Clock() {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Formatar hora e data usando o fuso horário de São Paulo
      const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      
      const timeParts = timeFormatter.formatToParts(now);
      const dateParts = dateFormatter.formatToParts(now);
      
      const hours = timeParts.find(p => p.type === 'hour')?.value || '00';
      const minutes = timeParts.find(p => p.type === 'minute')?.value || '00';
      const seconds = timeParts.find(p => p.type === 'second')?.value || '00';
      setTime(`${hours}:${minutes}:${seconds}`);
      
      const day = dateParts.find(p => p.type === 'day')?.value || '00';
      const month = dateParts.find(p => p.type === 'month')?.value || '00';
      const year = dateParts.find(p => p.type === 'year')?.value || '0000';
      setDate(`${day}/${month}/${year}`);
    };

    // Atualizar imediatamente
    updateTime();

    // Atualizar a cada segundo
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4 bg-transparent rounded-lg px-5 py-4">
      <ClockIcon className="text-[#fed094] flex-shrink-0" style={{ width: 'clamp(2.6496rem, 3.9744vw, 3.312rem)', height: 'clamp(2.6496rem, 3.9744vw, 3.312rem)' }} />
      <div className="flex flex-col">
        <div className="text-white font-bold" style={{ fontSize: 'clamp(2.3184rem, 5.2992vw, 2.9808rem)', lineHeight: 1.2 }}>
          {time}
        </div>
      </div>
    </div>
  );
}
