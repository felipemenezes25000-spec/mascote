/**
 * Sistema de eventos limitados (scarcity ético).
 * Eventos com janela curta de tempo geram urgência — sem mentir
 * sobre prazo (countdown real, evento volta no próximo ciclo).
 */

export interface LimitedEvent {
  id: string;
  emoji: string;
  title: string;
  description: string;
  multiplier: number; // 1.5 = 50% extra
  // A QUE recurso o multiplicador se aplica. Sem isto, o banner prometia "XP em
  // dobro"/"moedas 3×" mas a economia (checkin.ts) nunca sabia qual recurso
  // multiplicar — o boost ficava só na UI, uma promessa quebrada.
  appliesTo: 'xp' | 'coins';
  // start/end recebem `now` opcional pra suportar avaliação em datas custom
  // (testes, previews). Quando omitido, usam `new Date()`.
  start: (now?: Date) => Date;
  end: (now?: Date) => Date;
}

/**
 * Sábado mais próximo: se hoje é sábado retorna hoje; se hoje é domingo
 * retorna ONTEM (sábado), porque o weekend já está em andamento. Caso
 * contrário, o próximo sábado.
 */
function thisWeekendStart(now: Date = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay(); // 0=dom, 6=sáb
  let offset: number;
  if (day === 6) offset = 0;        // sábado: hoje
  else if (day === 0) offset = -1;  // domingo: ontem
  else offset = 6 - day;            // próximo sábado
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function thisWeekendEnd(now: Date = new Date()): Date {
  const e = thisWeekendStart(now);
  e.setDate(e.getDate() + 1); // sábado → domingo
  e.setHours(23, 59, 59, 999);
  return e;
}

function tonightStart(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(19, 0, 0, 0);
  return d;
}

function tonightEnd(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(23, 0, 0, 0);
  return d;
}

export const limitedEvents: LimitedEvent[] = [
  {
    id: 'weekend-double-xp',
    emoji: '✨',
    title: 'Fim de semana: XP em dobro',
    description: 'Todos os check-ins do sábado e domingo dão XP em dobro. Termina domingo à meia-noite.',
    multiplier: 2,
    appliesTo: 'xp',
    start: thisWeekendStart,
    end: thisWeekendEnd,
  },
  {
    id: 'tonight-coins-x3',
    emoji: '🌙',
    title: 'Noite de moedas tripla',
    description: 'Hoje das 19h às 23h: moedas triplicadas em qualquer ação.',
    multiplier: 3,
    appliesTo: 'coins',
    start: tonightStart,
    end: tonightEnd,
  },
];

export interface EventBoost {
  xpMult: number;
  coinMult: number;
}

/**
 * Multiplicadores do evento ativo, separados por recurso. Use no CALL SITE da
 * UI (que naturalmente tem acesso ao relógio) e passe pro pipeline de check-in
 * via `CheckinInput.boost`. Mantém `checkin.ts` PURO (sem ler wall-clock), o
 * que preserva o determinismo dos testes de economia.
 */
export function activeEventBoost(now: Date = new Date()): EventBoost {
  const ev = activeLimitedEvent(now);
  return {
    xpMult: ev?.appliesTo === 'xp' ? ev.multiplier : 1,
    coinMult: ev?.appliesTo === 'coins' ? ev.multiplier : 1,
  };
}

export function activeLimitedEvent(now: Date = new Date()): LimitedEvent | null {
  for (const ev of limitedEvents) {
    // Passa `now` adiante para start/end — sem isso, tonightStart/End usavam
    // `new Date()` interno e a função inteira era impossível de testar com
    // datas custom (e dava resultados inconsistentes em borda).
    if (now >= ev.start(now) && now <= ev.end(now)) return ev;
  }
  return null;
}

export function timeRemaining(end: Date, now: Date = new Date()): { hours: number; minutes: number; total_ms: number } {
  const total = Math.max(0, end.getTime() - now.getTime());
  const hours = Math.floor(total / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, total_ms: total };
}
