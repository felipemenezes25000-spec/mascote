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

// Valida YYYY-MM-DD antes de aritmética: corrupção de AsyncStorage pode
// devolver "undefined-NaN-NaN" — sem guard, downstream propaga NaN silenciosamente
// (streak quebra, daily reward calcula nextDay errado, missões agendam em data
// inválida). Em caso de input ruim, callers tratam o fallback com base no retorno.
function parseDateParts(s: string): { y: number; m: number; d: number } | null {
  if (typeof s !== 'string') return null;
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  // Sem regex strict, "2e3-01-01" (Number("2e3")=2000) ou "1-1-1" passavam.
  // Storage/import corrupto gerava "739000 dias entre datas" silencioso em
  // vez de detectar o lixo. Exige YYYY-MM-DD literal.
  if (!/^\d{4}$/.test(parts[0]) || !/^\d{2}$/.test(parts[1]) || !/^\d{2}$/.test(parts[2])) {
    return null;
  }
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (y < 1970 || y > 9999) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function daysBetween(a: string, b: string): number {
  const pa = parseDateParts(a);
  const pb = parseDateParts(b);
  if (!pa || !pb) return 0;
  const da = Date.UTC(pa.y, pa.m - 1, pa.d);
  const db = Date.UTC(pb.y, pb.m - 1, pb.d);
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

export function addDays(date: string, n: number): string {
  const p = parseDateParts(date);
  if (!p || !Number.isFinite(n)) return todayLocal();
  const t = Date.UTC(p.y, p.m - 1, p.d + n);
  const dt = new Date(t);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
