import type { MascotMood, UnlockKind } from '@/types';

export interface SceneMeta {
  id: string;
  name: string;
  emoji: string;
  description: string;
  premium: boolean;
  unlock: { kind: UnlockKind; value: number; label: string };
  isDefault?: boolean;
  /** Tint base do cenário (hex) — usado pelo rendering reativo. */
  ambientHue?: string;
}

export interface SceneAmbientTint {
  /** Overlay rgba para hora do dia. */
  timeOverlay: string;
  /** Shift de humor (multiplicador de saturação visual). */
  moodShift: number;
}

export const scenesCatalog: SceneMeta[] = [
  { id: 'room', name: 'Quartinho', emoji: '🛏️', description: 'Onde tudo começa.', premium: false, unlock: { kind: 'level', value: 0, label: 'Padrão' }, isDefault: true, ambientHue: '#F5E6D3' },
  { id: 'forest', name: 'Floresta', emoji: '🌳', description: 'Vida lá fora.', premium: false, unlock: { kind: 'streak', value: 7, label: 'Streak de 7 dias' }, ambientHue: '#A6CC8C' },
  { id: 'beach', name: 'Praia', emoji: '🏖️', description: 'Verão preguiçoso.', premium: false, unlock: { kind: 'streak', value: 14, label: 'Streak de 14 dias' }, ambientHue: '#FFB57E' },
  { id: 'library', name: 'Biblioteca', emoji: '📚', description: 'Silêncio aconchegante. Plus.', premium: true, unlock: { kind: 'level', value: 10, label: 'Alcance o nível 10 · Plus' }, ambientHue: '#5B4530' },
  { id: 'lunar', name: 'Estação Lua', emoji: '🌙', description: 'Noite silenciosa entre estrelas. Plus.', premium: true, unlock: { kind: 'streak', value: 30, label: 'Streak de 30 dias · Plus' }, ambientHue: '#2A3A6A' },
  { id: 'cafe', name: 'Cafezinho', emoji: '☕', description: 'Aroma e janela. Plus.', premium: true, unlock: { kind: 'level', value: 5, label: 'Alcance o nível 5 · Plus' }, ambientHue: '#D9B383' },
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

/** Overlay de hora do dia + shift de humor para habitat reativo. */
export function sceneAmbientTint(
  hour: number,
  mood: MascotMood,
  celebration?: boolean,
): SceneAmbientTint {
  let timeOverlay = 'rgba(255,255,255,0)';
  if (hour >= 6 && hour < 10) timeOverlay = 'rgba(255,220,160,0.12)';
  else if (hour >= 18 && hour < 22) timeOverlay = 'rgba(255,180,120,0.10)';
  else if (hour >= 22 || hour < 6) timeOverlay = 'rgba(40,50,90,0.18)';

  let moodShift = 1;
  switch (mood) {
    case 'feliz':
    case 'empolgado':
      moodShift = 1.08;
      break;
    case 'triste':
    case 'exausto':
      moodShift = 0.88;
      break;
    default:
      moodShift = 1;
  }
  if (celebration) timeOverlay = 'rgba(255,215,100,0.15)';
  return { timeOverlay, moodShift };
}
