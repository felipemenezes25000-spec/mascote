/**
 * Insight semanal em uma frase — gerado localmente, sem IA.
 * Usado na aba Relatório para dar valor ao tier free.
 */
export function buildWeeklyInsightLite(
  weekCheckins: number,
  habitVariety: number,
  streakDays: number,
): string {
  if (weekCheckins === 0) {
    return 'Ainda sem check-ins esta semana. Quando você aparecer, eu registro aqui — no seu ritmo.';
  }
  if (weekCheckins >= 5) {
    return `Você apareceu ${weekCheckins} vezes esta semana. Isso é presença de verdade.`;
  }
  if (habitVariety >= 4) {
    return `${habitVariety} tipos de cuidado esta semana — variedade faz bem pro Pip.`;
  }
  if (streakDays >= 3) {
    return `${weekCheckins} check-in${weekCheckins > 1 ? 's' : ''} e ${streakDays} dias de fogo. Seguimos juntos.`;
  }
  return `${weekCheckins} check-in${weekCheckins > 1 ? 's' : ''} esta semana. Sem pressa — cada um conta.`;
}
