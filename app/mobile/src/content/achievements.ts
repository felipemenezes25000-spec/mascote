export interface AchievementMeta {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Recompensa desbloqueada ao conquistar. */
  reward?: {
    type:
      | 'xp'
      | 'coins'
      | 'accessory'
      | 'scene'
      | 'aura'
      | 'animation'
      | 'trait'
      | 'memory_card'
      | 'mutation_hint';
    value: number | string;
    label: string;
  };
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
  { id: 'primeiro-passo', emoji: '🌱', title: 'Primeiro passo', description: 'Primeiro check-in.', reward: { type: 'xp', value: 25, label: '+25 XP' }, check: c => c.totalCheckins >= 1 },
  { id: 'rotina-leve', emoji: '🌿', title: 'Rotina leve', description: '10 check-ins.', reward: { type: 'coins', value: 50, label: '+50 moedas' }, check: c => c.totalCheckins >= 10 },
  { id: 'rotina-firme', emoji: '🌳', title: 'Rotina firme', description: '50 check-ins.', reward: { type: 'xp', value: 100, label: '+100 XP' }, check: c => c.totalCheckins >= 50 },
  { id: 'rotina-tronco', emoji: '🌲', title: 'Tronco firme', description: '200 check-ins.', reward: { type: 'accessory', value: 'hat-star', label: 'Chapéu estrela' }, check: c => c.totalCheckins >= 200 },
  { id: 'streak-7', emoji: '🔥', title: 'Semana inteira', description: 'Streak de 7 dias.', reward: { type: 'coins', value: 30, label: '+30 moedas' }, check: c => c.longestStreak >= 7 },
  { id: 'streak-14', emoji: '⚡', title: 'Duas semanas', description: 'Streak de 14 dias.', reward: { type: 'xp', value: 75, label: '+75 XP' }, check: c => c.longestStreak >= 14 },
  { id: 'streak-30', emoji: '🏆', title: 'Mês inteiro', description: 'Streak de 30 dias.', reward: { type: 'scene', value: 'moon', label: 'Cenário Lua' }, check: c => c.longestStreak >= 30 },
  { id: 'streak-100', emoji: '💎', title: 'Cem dias', description: 'Streak de 100 dias.', reward: { type: 'mutation_hint', value: 'legendary', label: 'Pista de mutação lendária' }, check: c => c.longestStreak >= 100 },
  { id: 'nivel-5', emoji: '⭐', title: 'Nível 5', description: 'Você foi longe.', reward: { type: 'coins', value: 40, label: '+40 moedas' }, check: c => c.level >= 5 },
  { id: 'nivel-10', emoji: '🌟', title: 'Nível 10', description: 'Tá ficando sério.', reward: { type: 'xp', value: 150, label: '+150 XP' }, check: c => c.level >= 10 },
  { id: 'nivel-20', emoji: '✨', title: 'Nível 20', description: 'Veterano.', reward: { type: 'accessory', value: 'glasses-round', label: 'Óculos redondo' }, check: c => c.level >= 20 },
  { id: 'variedade', emoji: '🎨', title: 'Tudo um pouco', description: '5 hábitos diferentes.', reward: { type: 'coins', value: 25, label: '+25 moedas' }, check: c => c.habitVariety >= 5 },
  { id: 'variedade-total', emoji: '🦋', title: 'Vida inteira', description: 'Todos os 9 hábitos.', reward: { type: 'xp', value: 200, label: '+200 XP' }, check: c => c.habitVariety >= 9 },
  { id: 'conversador', emoji: '💬', title: 'Conversador', description: '20 mensagens trocadas.', reward: { type: 'coins', value: 20, label: '+20 moedas' }, check: c => c.messagesSent >= 20 },
  { id: 'missionario', emoji: '🎯', title: 'Missionário', description: '10 missões concluídas.', reward: { type: 'xp', value: 80, label: '+80 XP' }, check: c => c.missionsCompleted >= 10 },
  { id: 'mes-de-vida', emoji: '🎂', title: 'Um mês juntos', description: '1 mês desde o primeiro dia.', reward: { type: 'scene', value: 'cafe', label: 'Cenário Café' }, check: c => c.daysSinceCreated >= 30 },
  { id: 'ano-de-vida', emoji: '🎉', title: 'Aniversário', description: '1 ano desde o primeiro dia.', reward: { type: 'mutation_hint', value: 'epic', label: 'Pista de mutação épica' }, check: c => c.daysSinceCreated >= 365 },
  // novos achievements com recompensas
  { id: 'evolucao-primeira', emoji: '🥚', title: 'Primeira eclosão', description: 'Saiu do ovo.', reward: { type: 'xp', value: 50, label: '+50 XP' }, check: c => c.level >= 2 },
  { id: 'agua-mestre', emoji: '💧', title: 'Mestre da água', description: '30 check-ins de água.', reward: { type: 'coins', value: 35, label: '+35 moedas' }, check: c => c.totalCheckins >= 30 },
  { id: 'zen-total', emoji: '🧘', title: 'Zen total', description: 'Nível 15.', reward: { type: 'accessory', value: 'neck-beads', label: 'Colar de contas' }, check: c => c.level >= 15 },
  { id: 'aura-primeira', emoji: '✨', title: 'Primeira aura', description: 'Nível 8.', reward: { type: 'aura', value: 'soft-glow', label: 'Aura suave' }, check: c => c.level >= 8 },
  { id: 'danca-vitoria', emoji: '💃', title: 'Dança da vitória', description: '5 missões numa semana.', reward: { type: 'animation', value: 'celebrate', label: 'Animação comemorar' }, check: c => c.missionsCompleted >= 5 },
  { id: 'traco-curioso', emoji: '🔮', title: 'Traço curioso', description: '15 mensagens.', reward: { type: 'trait', value: 'curious-eyes', label: 'Olhar curioso' }, check: c => c.messagesSent >= 15 },
  { id: 'cartao-memoria', emoji: '📇', title: 'Cartão de memória', description: '30 dias juntos.', reward: { type: 'memory_card', value: 'month-together', label: 'Memória do primeiro mês' }, check: c => c.daysSinceCreated >= 30 },
];

export function getAchievement(id: string): AchievementMeta | undefined {
  return achievementCatalog.find(a => a.id === id);
}
