/**
 * Registry de minigames do Mascote.
 *
 * Regras de design (não-negociáveis):
 *  - Minigames são sobre AUTOCUIDADO simbólico — nada de violência/tiro.
 *  - Recompensa diária com cap (anti-grind predatório): além do cap, o jogo
 *    continua jogável por diversão, com isso EXPLÍCITO na UI.
 *  - XP de minigame passa pelo applyXp normal → respeita o cap diário de
 *    150 XP do app inteiro. Minigame nunca vira atalho de progressão.
 *  - Só entra no registry jogo IMPLEMENTADO (rota real). Jogos futuros
 *    vivem em UPCOMING_MINIGAMES pra teaser honesto ("em breve"), nunca
 *    como botão clicável morto.
 */

export interface MinigameMeta {
  id: string;
  name: string;
  emoji: string;
  /** Uma linha de venda emocional. */
  tagline: string;
  /** Como jogar, uma linha. */
  howTo: string;
  /** Hábito/tema de autocuidado que o jogo celebra. */
  habitTheme: 'energia' | 'foco' | 'descanso';
  /** Rota expo-router da tela do jogo. */
  route: string;
  /** Fase da jornada que desbloqueia (ver MINIGAME_UNLOCK_PHASES). */
  unlockPhase: number;
  /** Duração alvo de uma partida, em segundos (jogos curtos = retenção). */
  roundSeconds: number;
}

export const MINIGAMES: readonly MinigameMeta[] = [
  {
    id: 'energy-run',
    name: 'Corrida de Energia',
    emoji: '⚡',
    tagline: 'Colete gotas e estrelas antes que o cansaço alcance.',
    howTo: 'Toque nas gotas 💧 e estrelas ⭐ que surgem. Evite as nuvens de desânimo 🌫️.',
    habitTheme: 'energia',
    route: '/minigames/energy-run',
    unlockPhase: 3,
    roundSeconds: 30,
  },
  {
    id: 'crystal-hunt',
    name: 'Caça aos Cristais',
    emoji: '💎',
    tagline: 'Cada par de cristais é uma pequena vitória do seu dia.',
    howTo: 'Vire as cartas e encontre os pares de cristais. Menos viradas, mais brilho.',
    habitTheme: 'foco',
    route: '/minigames/crystal-hunt',
    unlockPhase: 8,
    roundSeconds: 60,
  },
  {
    id: 'dream-flow',
    name: 'Mundo dos Sonhos',
    emoji: '🌙',
    tagline: 'Embale o sono do Mascote no ritmo certo.',
    howTo: 'Toque quando o anel de luz encostar na lua. Ritmo calmo, mente calma.',
    habitTheme: 'descanso',
    route: '/minigames/dream-flow',
    unlockPhase: 15,
    roundSeconds: 45,
  },
];

/** Teasers honestos pro mapa/hub — claramente "em breve", sem botão morto. */
export interface UpcomingMinigame {
  name: string;
  emoji: string;
  tagline: string;
  plannedWorld: number;
}

export const UPCOMING_MINIGAMES: readonly UpcomingMinigame[] = [
  { name: 'Jardim do Mascote', emoji: '🌱', tagline: 'Plante hábitos, colha um jardim vivo.', plannedWorld: 3 },
  { name: 'Defesa da Rotina', emoji: '🛡️', tagline: 'Bons hábitos afastam as nuvens de preguiça.', plannedWorld: 4 },
  { name: 'Puzzle de Humor', emoji: '🧩', tagline: 'Combine emoções e equilibre o dia.', plannedWorld: 5 },
  { name: 'Caminhada do Mascote', emoji: '👣', tagline: 'Seu streak real move o Mascote pelo mapa.', plannedWorld: 6 },
  { name: 'Evolução Relâmpago', emoji: '⚡', tagline: 'Reflexos rápidos, escolhas positivas.', plannedWorld: 7 },
  { name: 'Arena de Hábitos', emoji: '🎪', tagline: 'Arena simbólica: constância vence o caos.', plannedWorld: 8 },
  { name: 'Cofre de Recompensas', emoji: '🗝️', tagline: 'Abra cofres raros com chaves de constância.', plannedWorld: 9 },
];

export function getMinigame(id: string): MinigameMeta | undefined {
  return MINIGAMES.find(m => m.id === id);
}

/** Cap de partidas RECOMPENSADAS por jogo por dia, por tier. */
export const REWARDED_PLAYS_PER_DAY_FREE = 3;
export const REWARDED_PLAYS_PER_DAY_PLUS = 6;

/** Recompensa base por partida (escala suave com score 0..1). */
export const MINIGAME_COINS_MAX = 12;
export const MINIGAME_XP_MAX = 10;
