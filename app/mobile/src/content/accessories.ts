import type { AccessorySlot, UnlockKind } from '@/types';

export interface AccessoryMeta {
  id: 'cap' | 'bow' | 'glasses' | 'scarf' | 'crown' | 'flower' | 'headphones' | 'mask' | 'star' | 'monocle' | 'cape' | 'cookie' | 'leaf' | 'horn';
  name: string;
  slot: AccessorySlot;
  emoji: string;
  description: string;
  unlock: { kind: UnlockKind; value: number; label: string };
  premium?: boolean;
}

export const accessoryCatalog: AccessoryMeta[] = [
  // Cabeça
  { id: 'cap', name: 'Boné azul', slot: 'hat', emoji: '🧢', description: 'Acessório clássico. Pro sol e pro estilo.', unlock: { kind: 'level', value: 2, label: 'Alcance o nível 2' } },
  { id: 'glasses', name: 'Óculos redondinhos', slot: 'glasses', emoji: '👓', description: 'Pra ler em paz. Estilo nerd-fofo.', unlock: { kind: 'level', value: 3, label: 'Alcance o nível 3' } },
  { id: 'bow', name: 'Lacinho', slot: 'hat', emoji: '🎀', description: 'Pra dias delicados.', unlock: { kind: 'level', value: 4, label: 'Alcance o nível 4' } },
  { id: 'scarf', name: 'Cachecol verde', slot: 'neck', emoji: '🧣', description: 'Aquece os dias difíceis. 7 dias de streak.', unlock: { kind: 'streak', value: 7, label: 'Streak de 7 dias' } },
  { id: 'flower', name: 'Flor laranja', slot: 'hat', emoji: '🌼', description: 'Cresceu junto com você. Streak 14.', unlock: { kind: 'streak', value: 14, label: 'Streak de 14 dias' } },
  { id: 'headphones', name: 'Fones musicais', slot: 'ear', emoji: '🎧', description: 'Trilha sonora dos hábitos. Streak 30.', unlock: { kind: 'streak', value: 30, label: 'Streak de 30 dias' } },
  { id: 'crown', name: 'Coroa dourada', slot: 'hat', emoji: '👑', description: 'Pra quem chegou longe. Nível 10.', unlock: { kind: 'level', value: 10, label: 'Alcance o nível 10' } },
  // Novos
  { id: 'star', name: 'Estrela na testa', slot: 'hat', emoji: '⭐', description: 'Brilho próprio. Streak 21.', unlock: { kind: 'streak', value: 21, label: 'Streak de 21 dias' } },
  { id: 'monocle', name: 'Monóculo', slot: 'glasses', emoji: '🧐', description: 'Pensador sofisticado. Nível 7.', unlock: { kind: 'level', value: 7, label: 'Alcance o nível 7' } },
  { id: 'mask', name: 'Máscara mágica', slot: 'glasses', emoji: '🎭', description: 'Mistério e charme. Nível 8.', unlock: { kind: 'level', value: 8, label: 'Alcance o nível 8' } },
  { id: 'cape', name: 'Capa heroica', slot: 'back', emoji: '🦸', description: 'Pra quem salva o próprio dia. Nível 12.', unlock: { kind: 'level', value: 12, label: 'Alcance o nível 12' } },
  { id: 'leaf', name: 'Folha de outono', slot: 'hat', emoji: '🍂', description: 'Sazonal — toques de outono.', unlock: { kind: 'seasonal', value: 4, label: 'Evento de outono' } },
  { id: 'cookie', name: 'Biscoito da fortuna', slot: 'neck', emoji: '🥠', description: 'Sorte e doçura. 100 check-ins.', unlock: { kind: 'mission_count', value: 100, label: '100 check-ins' } },
  { id: 'horn', name: 'Chifre lendário', slot: 'hat', emoji: '🦄', description: 'Forma rara. Nível 15.', unlock: { kind: 'level', value: 15, label: 'Alcance o nível 15' }, premium: true },
];

export function getAccessory(id: string): AccessoryMeta | undefined {
  return accessoryCatalog.find(a => a.id === id);
}

export function checkUnlock(
  accessory: AccessoryMeta,
  ctx: {
    level: number;
    currentStreak: number;
    longestStreak: number;
    totalCheckins?: number;
    activeSeasonalMonth?: number; // 1..12 ou undefined se nenhum evento ativo
  }
): boolean {
  switch (accessory.unlock.kind) {
    case 'level':
      return ctx.level >= accessory.unlock.value;
    case 'streak':
      return (
        ctx.longestStreak >= accessory.unlock.value ||
        ctx.currentStreak >= accessory.unlock.value
      );
    case 'mission_count':
      return (ctx.totalCheckins ?? 0) >= accessory.unlock.value;
    case 'seasonal':
      // unlock.value = mês (1..12) em que o evento sazonal acontece
      return ctx.activeSeasonalMonth === accessory.unlock.value;
    case 'phase':
      // não usado pra acessórios hoje, mas mantém o switch exaustivo
      return false;
    default:
      return false;
  }
}
