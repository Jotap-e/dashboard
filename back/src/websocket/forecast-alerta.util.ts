import { Forecast } from './forecasts-state.service';

function getHojeLocal(ref: Date): string {
  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, '0');
  const d = String(ref.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isHoraProxima(forecast: Forecast, ref: Date): boolean {
  const horario = forecast.horario?.trim();
  const data = forecast.data?.trim();
  if (!horario || !data) return false;

  const [h, m] = horario.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return false;

  const hoje = getHojeLocal(ref);
  if (data !== hoje) return false;

  const scheduled = new Date(ref);
  scheduled.setHours(h, m, 0, 0);
  const diffMinutes = (scheduled.getTime() - ref.getTime()) / 60000;

  return diffMinutes > 0 && diffMinutes <= 15;
}

function getTempoRestante(forecast: Forecast, ref: Date): { minutos: number; segundos: number } | null {
  const horario = forecast.horario?.trim();
  const data = forecast.data?.trim();
  if (!horario || !data) return null;

  const [h, m] = horario.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  const hoje = getHojeLocal(ref);
  if (data !== hoje) return null;

  const scheduled = new Date(ref);
  scheduled.setHours(h, m, 0, 0);
  const diffMs = scheduled.getTime() - ref.getTime();

  if (diffMs <= 0) return null;

  const totalSegundos = Math.floor(diffMs / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;

  return { minutos, segundos };
}

export interface AlertaItem {
  vendedorId: string;
  forecast: Forecast;
  countdown: { minutos: number; segundos: number };
}

/**
 * Para cada vendedor, retorna o forecast mais urgente (se houver) que está na janela de 15 min.
 */
export function calcularAlertasPorVendedor(
  forecastsPorVendedor: Array<[string, Forecast[]]>,
  now: Date,
): AlertaItem[] {
  const alertas: AlertaItem[] = [];

  for (const [vendedorId, forecasts] of forecastsPorVendedor) {
    const proximos = forecasts.filter((f) => isHoraProxima(f, now));
    if (proximos.length === 0) continue;

    const comTempo = proximos
      .map((f) => ({ forecast: f, tempo: getTempoRestante(f, now) }))
      .filter((x): x is { forecast: Forecast; tempo: { minutos: number; segundos: number } } => x.tempo !== null);

    if (comTempo.length === 0) continue;

    comTempo.sort((a, b) => {
      const totalA = a.tempo.minutos * 60 + a.tempo.segundos;
      const totalB = b.tempo.minutos * 60 + b.tempo.segundos;
      return totalA - totalB;
    });

    const { forecast, tempo } = comTempo[0];
    alertas.push({ vendedorId, forecast, countdown: tempo });
  }

  return alertas;
}
