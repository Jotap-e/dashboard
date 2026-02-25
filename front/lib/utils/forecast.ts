import { Forecast } from '@/lib/types/forecast';

/**
 * Retorna o "agora" alinhado ao início do segundo atual.
 * Usado para garantir que controle e painel avaliem o alerta no mesmo instante lógico.
 */
export function getNowAligned(): Date {
  const ms = Date.now();
  return new Date(Math.floor(ms / 1000) * 1000);
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD (fuso local).
 * Usado para consistência com forecasts que tipicamente usam data local do usuário.
 */
export function getHojeLocal(ref: Date = new Date()): string {
  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, '0');
  const d = String(ref.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Verifica se a hora da call do forecast está próxima (dentro de 15 min antes).
 * O alerta some apenas quando chegar o horário.
 * @param now - Se fornecido, usa este instante para avaliação (para sincronizar controle e painel).
 */
export function isHoraProxima(forecast: Forecast, now?: Date): boolean {
  const horario = forecast.horario?.trim();
  const data = forecast.data?.trim();
  if (!horario || !data) return false;

  const [h, m] = horario.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return false;

  const ref = now ?? new Date();
  const hoje = getHojeLocal(ref);
  if (data !== hoje) return false;

  const scheduled = new Date(ref);
  scheduled.setHours(h, m, 0, 0);
  const diffMinutes = (scheduled.getTime() - ref.getTime()) / 60000;

  // Alerta: 15 min antes até o horário (some quando chegar o horário)
  return diffMinutes > 0 && diffMinutes <= 15;
}

export interface TempoRestante {
  minutos: number;
  segundos: number;
  totalSegundos: number;
}

/**
 * Retorna o tempo restante até a call em minutos e segundos.
 * Retorna null se já passou do horário ou não é hoje.
 * @param now - Se fornecido, usa este instante para avaliação (para sincronizar controle e painel).
 */
export function getTempoRestante(forecast: Forecast, now?: Date): TempoRestante | null {
  const horario = forecast.horario?.trim();
  const data = forecast.data?.trim();
  if (!horario || !data) return null;

  const [h, m] = horario.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  const ref = now ?? new Date();
  const hoje = getHojeLocal(ref);
  if (data !== hoje) return null;

  const scheduled = new Date(ref);
  scheduled.setHours(h, m, 0, 0);
  const diffMs = scheduled.getTime() - ref.getTime();

  if (diffMs <= 0) return null;

  const totalSegundos = Math.floor(diffMs / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;

  return { minutos, segundos, totalSegundos };
}

/**
 * Retorna o forecast mais urgente (mais próximo do horário) entre os que têm hora próxima.
 * @param now - Se fornecido, usa este instante para avaliação (para sincronizar controle e painel).
 */
export function getForecastMaisUrgente(forecasts: Forecast[], now?: Date): Forecast | null {
  const ref = now ?? new Date();
  const proximos = forecasts.filter((f) => isHoraProxima(f, ref));
  if (proximos.length === 0) return null;

  const comTempo = proximos
    .map((f) => ({ forecast: f, tempo: getTempoRestante(f, ref) }))
    .filter((x): x is { forecast: Forecast; tempo: TempoRestante } => x.tempo !== null);

  if (comTempo.length === 0) return null;

  comTempo.sort((a, b) => a.tempo.totalSegundos - b.tempo.totalSegundos);
  return comTempo[0].forecast;
}

export interface AlertaEstado {
  mostrar: boolean;
  forecast: Forecast | null;
  countdown: TempoRestante | null;
}

/**
 * Estado unificado do alerta de hora próxima.
 * Usa o mesmo instante (now alinhado ao segundo) para todas as verificações,
 * garantindo que controle e painel surjam e sumam ao mesmo tempo.
 */
export function getAlertaEstado(forecasts: Forecast[], tick: number): AlertaEstado {
  const now = getNowAligned();
  const forecast = getForecastMaisUrgente(forecasts, now);
  if (!forecast) return { mostrar: false, forecast: null, countdown: null };
  const countdown = getTempoRestante(forecast, now);
  return {
    mostrar: countdown !== null,
    forecast: countdown ? forecast : null,
    countdown,
  };
}
