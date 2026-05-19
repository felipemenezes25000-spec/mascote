export interface SeasonalEvent {
  id: string;
  name: string;
  emoji: string;
  message: string;
  // window: incluso. month e day no fuso local
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

export const seasonalEvents: SeasonalEvent[] = [
  {
    id: 'ano-novo',
    name: 'Ano novo',
    emoji: '✨',
    message: 'Novo ano. Mesma você, agora com 1 dia a mais de constância.',
    startMonth: 12, startDay: 30, endMonth: 1, endDay: 2,
  },
  {
    id: 'carnaval',
    name: 'Carnaval',
    emoji: '🎭',
    // endDay 29 cobre anos bissextos; em anos comuns 29/2 não existe e o
    // isInWindow naturalmente clipa no último dia do mês.
    message: 'Carnaval é também descanso. Cuida do som, do sono e da água.',
    startMonth: 2, startDay: 1, endMonth: 2, endDay: 29,
  },
  {
    id: 'outono-leve',
    name: 'Outono',
    emoji: '🍂',
    message: 'Dias mais curtos. Sono cedo é vitória pequena.',
    startMonth: 4, startDay: 1, endMonth: 5, endDay: 15,
  },
  {
    id: 'festa-junina',
    name: 'Festa junina',
    emoji: '🌽',
    message: 'Mês de quentão e quadrilha. Movimento social conta.',
    startMonth: 6, startDay: 1, endMonth: 6, endDay: 30,
  },
  {
    id: 'inverno-mole',
    name: 'Inverno',
    emoji: '❄️',
    message: 'Frio. Chá, cobertor, e um copo de água do mesmo jeito.',
    startMonth: 7, startDay: 1, endMonth: 8, endDay: 15,
  },
  {
    id: 'primavera',
    name: 'Primavera',
    emoji: '🌸',
    message: 'Florada. Sai um pouco se conseguir.',
    startMonth: 9, startDay: 23, endMonth: 10, endDay: 15,
  },
  {
    id: 'halloween',
    name: 'Halloween',
    emoji: '🎃',
    message: 'Boo! Mesmo na escuridão, cuida.',
    startMonth: 10, startDay: 28, endMonth: 11, endDay: 1,
  },
  {
    id: 'natal',
    name: 'Natal',
    emoji: '🎄',
    message: 'Festa pode ser cansativo. Reserva 5 minutos só pra você.',
    startMonth: 12, startDay: 18, endMonth: 12, endDay: 26,
  },
];

export function activeSeasonalEvent(now: Date = new Date()): SeasonalEvent | null {
  const m = now.getMonth() + 1;
  const d = now.getDate();
  for (const ev of seasonalEvents) {
    if (isInWindow(m, d, ev)) return ev;
  }
  return null;
}

function isInWindow(month: number, day: number, ev: SeasonalEvent): boolean {
  // simple: trate como linear yearly se start <= end
  if (ev.startMonth < ev.endMonth || (ev.startMonth === ev.endMonth && ev.startDay <= ev.endDay)) {
    if (month < ev.startMonth || month > ev.endMonth) return false;
    if (month === ev.startMonth && day < ev.startDay) return false;
    if (month === ev.endMonth && day > ev.endDay) return false;
    return true;
  }
  // crossover do ano (ex. 30/12 -> 02/01)
  if (month > ev.startMonth || (month === ev.startMonth && day >= ev.startDay)) return true;
  if (month < ev.endMonth || (month === ev.endMonth && day <= ev.endDay)) return true;
  return false;
}

export function isLateNight(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h >= 1 && h < 5; // 01:00 até 04:59
}
