import type { UnlockKind } from '@/types';

export interface SceneMeta {
  id: string;
  name: string;
  emoji: string;
  description: string;
  premium: boolean;
  unlock: { kind: UnlockKind; value: number; label: string };
  isDefault?: boolean;
}

export const scenesCatalog: SceneMeta[] = [
  { id: 'room', name: 'Quartinho', emoji: '🛏️', description: 'Onde tudo começa.', premium: false, unlock: { kind: 'level', value: 0, label: 'Padrão' }, isDefault: true },
  { id: 'forest', name: 'Floresta', emoji: '🌳', description: 'Vida lá fora.', premium: false, unlock: { kind: 'streak', value: 7, label: 'Streak de 7 dias' } },
  { id: 'beach', name: 'Praia', emoji: '🏖️', description: 'Verão preguiçoso.', premium: false, unlock: { kind: 'streak', value: 14, label: 'Streak de 14 dias' } },
  { id: 'library', name: 'Biblioteca', emoji: '📚', description: 'Silêncio aconchegante. Plus.', premium: true, unlock: { kind: 'level', value: 10, label: 'Alcance o nível 10 · Plus' } },
  { id: 'lunar', name: 'Estação Lua', emoji: '🌙', description: 'Noite silenciosa entre estrelas. Plus.', premium: true, unlock: { kind: 'streak', value: 30, label: 'Streak de 30 dias · Plus' } },
  { id: 'cafe', name: 'Cafezinho', emoji: '☕', description: 'Aroma e janela. Plus.', premium: true, unlock: { kind: 'level', value: 5, label: 'Alcance o nível 5 · Plus' } },
  // Novos cenários (dobrando o catálogo)
  { id: 'mountain', name: 'Montanha calma', emoji: '🏔️', description: 'Topo do mundo, ar fino.', premium: false, unlock: { kind: 'level', value: 6, label: 'Alcance o nível 6' } },
  { id: 'garden', name: 'Jardim secreto', emoji: '🌸', description: 'Flores e silêncio.', premium: false, unlock: { kind: 'streak', value: 10, label: 'Streak de 10 dias' } },
  { id: 'aurora', name: 'Aurora Boreal', emoji: '🌌', description: 'Plus. Luzes do norte, espetáculo cósmico.', premium: true, unlock: { kind: 'level', value: 20, label: 'Alcance o nível 20 · Plus' } },
  { id: 'temple', name: 'Templo zen', emoji: '⛩️', description: 'Plus. Quietude sagrada.', premium: true, unlock: { kind: 'level', value: 15, label: 'Alcance o nível 15 · Plus' } },
];

export function getScene(id: string): SceneMeta {
  return scenesCatalog.find(s => s.id === id) ?? scenesCatalog[0];
}

export function checkSceneUnlock(
  scene: SceneMeta,
  ctx: { level: number; longestStreak: number; currentStreak: number }
): boolean {
  if (scene.isDefault) return true;
  if (scene.unlock.kind === 'level') return ctx.level >= scene.unlock.value;
  if (scene.unlock.kind === 'streak')
    return ctx.longestStreak >= scene.unlock.value || ctx.currentStreak >= scene.unlock.value;
  return false;
}
