/**
 * Helpers de data — usados em todo o pipeline de check-in/streak/missões.
 * Tudo em LOCAL TIME (não UTC) pra cobrir o ciclo do usuário; aritmética usa
 * UTC pra ser DST-safe (uma soma de 1 dia é sempre 24h, sem skip de DST).
 */
export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  /* v8 ignore start */
  const da = Date.UTC(ay, (am ?? 1) - 1, ad ?? 1);
  const db = Date.UTC(by, (bm ?? 1) - 1, bd ?? 1);
  /* v8 ignore stop */
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  /* v8 ignore next */
  const t = Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + n);
  const dt = new Date(t);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
