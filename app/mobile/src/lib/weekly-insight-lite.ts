/**
 * Insight semanal em uma frase — gerado localmente, sem IA.
 * Usado na aba Relatório para dar valor ao tier free.
 */
export function buildWeeklyInsightLite(
  weekCheckins: number,
  habitVariety: number,
  streakDays: number,
  mascotName?: string,
): string {
  // QA flagrou: "Pip" estava hardcoded — quebrava imersão quando o mascote tinha
  // outro nome (Bipo, Zip, QApet etc). Param opcional + fallback genérico mantém
  // backward compat com testes/callers antigos.
  const who = mascotName?.trim() || 'ele';
  if (weekCheckins === 0) {
    return 'Ainda sem check-ins esta semana. Quando você aparecer, eu registro aqui — no seu ritmo.';
  }
  if (weekCheckins >= 5) {
    return `Você apareceu ${weekCheckins} vezes esta semana. Isso é presença de verdade.`;
  }
  if (habitVariety >= 4) {
    return `${habitVariety} tipos de cuidado esta semana — variedade faz bem pro ${who}.`;
  }
  if (streakDays >= 3) {
    return `${weekCheckins} check-in${weekCheckins > 1 ? 's' : ''} e ${streakDays} dias de fogo. Seguimos juntos.`;
  }
  return `${weekCheckins} check-in${weekCheckins > 1 ? 's' : ''} esta semana. Sem pressa — cada um conta.`;
}
