/**
 * Helpers de pluralização PT-BR.
 *
 * Português brasileiro tem regra simples (singular para |n|=1, plural caso contrário),
 * mas a aplicação espalha templates literais que erram em n=1 (ex.: "Faltam 1 dias").
 * Esse módulo centraliza a regra pra evitar regressões.
 */

export function plural(n: number, singular: string, pluralForm: string): string {
  return Math.abs(n) === 1 ? `${n} ${singular}` : `${n} ${pluralForm}`;
}

export function daysToNextMilestone(diff: number): string {
  if (diff <= 0) return 'Próximo marco já alcançável';
  return diff === 1 ? 'Falta 1 dia pro próximo marco' : `Faltam ${diff} dias pro próximo marco`;
}
