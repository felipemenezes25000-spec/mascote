export interface AchievementMeta {
  id: string;
  emoji: string;
  title: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  level: number;
  totalXp: number;
  totalCheckins: number;
  currentStreak: number;
  longestStreak: number;
  daysSinceCreated: number;
  messagesSent: number;
  missionsCompleted: number;
  habitVariety: number; // quantos hábitos distintos já fez
}

export const achievementCatalog: AchievementMeta[] = [
  { id: 'primeiro-passo', emoji: '🌱', title: 'Primeiro passo', description: 'Primeiro check-in.', check: c => c.totalCheckins >= 1 },
  { id: 'rotina-leve', emoji: '🌿', title: 'Rotina leve', description: '10 check-ins.', check: c => c.totalCheckins >= 10 },
  { id: 'rotina-firme', emoji: '🌳', title: 'Rotina firme', description: '50 check-ins.', check: c => c.totalCheckins >= 50 },
  { id: 'rotina-tronco', emoji: '🌲', title: 'Tronco firme', description: '200 check-ins.', check: c => c.totalCheckins >= 200 },
  { id: 'streak-7', emoji: '🔥', title: 'Semana inteira', description: 'Streak de 7 dias.', check: c => c.longestStreak >= 7 },
  { id: 'streak-14', emoji: '⚡', title: 'Duas semanas', description: 'Streak de 14 dias.', check: c => c.longestStreak >= 14 },
  { id: 'streak-30', emoji: '🏆', title: 'Mês inteiro', description: 'Streak de 30 dias.', check: c => c.longestStreak >= 30 },
  { id: 'streak-100', emoji: '💎', title: 'Cem dias', description: 'Streak de 100 dias.', check: c => c.longestStreak >= 100 },
  { id: 'nivel-5', emoji: '⭐', title: 'Nível 5', description: 'Você foi longe.', check: c => c.level >= 5 },
  { id: 'nivel-10', emoji: '🌟', title: 'Nível 10', description: 'Tá ficando sério.', check: c => c.level >= 10 },
  { id: 'nivel-20', emoji: '✨', title: 'Nível 20', description: 'Veterano.', check: c => c.level >= 20 },
  { id: 'variedade', emoji: '🎨', title: 'Tudo um pouco', description: '5 hábitos diferentes.', check: c => c.habitVariety >= 5 },
  { id: 'variedade-total', emoji: '🦋', title: 'Vida inteira', description: 'Todos os 9 hábitos.', check: c => c.habitVariety >= 9 },
  { id: 'conversador', emoji: '💬', title: 'Conversador', description: '20 mensagens trocadas.', check: c => c.messagesSent >= 20 },
  { id: 'missionario', emoji: '🎯', title: 'Missionário', description: '10 missões concluídas.', check: c => c.missionsCompleted >= 10 },
  { id: 'mes-de-vida', emoji: '🎂', title: 'Um mês juntos', description: '1 mês desde o primeiro dia.', check: c => c.daysSinceCreated >= 30 },
  { id: 'ano-de-vida', emoji: '🎉', title: 'Aniversário', description: '1 ano desde o primeiro dia.', check: c => c.daysSinceCreated >= 365 },
];

export function getAchievement(id: string): AchievementMeta | undefined {
  return achievementCatalog.find(a => a.id === id);
}
