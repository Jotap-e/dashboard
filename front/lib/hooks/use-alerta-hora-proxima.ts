'use client';

import { useEffect, useState } from 'react';
import { Forecast } from '@/lib/types/forecast';
import { getAlertaEstado, AlertaEstado } from '@/lib/utils/forecast';

/**
 * Hook que retorna o estado do alerta de hora próxima.
 * Usa tick alinhado ao segundo para que controle e painel surjam e sumam ao mesmo tempo.
 */
export function useAlertaHoraProxima(forecasts: Forecast[]): AlertaEstado {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Atualiza imediatamente e a cada 1s para reavaliar o alerta
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return getAlertaEstado(forecasts, tick);
}
