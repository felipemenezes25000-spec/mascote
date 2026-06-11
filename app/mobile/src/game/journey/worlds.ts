import type { JourneyPhase, JourneyReward, WorldMeta } from './types';

/**
 * Conteúdo canônico da Jornada: 10 mundos × 10 fases = 100 fases.
 *
 * Curva de XP calibrada no cap diário de 150 XP (src/lib/xp.ts):
 *  - Mundo 1 completo em ~2-3 dias de uso ativo (gancho de retenção D1-D3);
 *  - Fase 100 em ~8-12 meses de constância (progressão de longo prazo);
 *  - Marcos visuais existentes alinham: bebê (100 XP) ≈ fase 6,
 *    adolescente (2.000) ≈ fase 31, adulto (8.000) ≈ fase 58,
 *    evoluído (25.000) ≈ fase 90 — o Mundo 10 é a era da forma máxima.
 *
 * Recompensas seguem o princípio "só o que funciona de verdade":
 * coins/gems/baús/títulos/minigames são 100% funcionais hoje. Acessórios e
 * cenários NÃO são duplicados aqui — eles continuam com unlock por
 * level/streak (closet) e o mapa da jornada apenas os EXIBE como marcos
 * na fase correspondente (ver `catalogMilestoneNear`).
 */

interface WorldSpec {
  id: number;
  name: string;
  emoji: string;
  theme: string;
  intro: string;
  hue: string;
  premium: boolean;
  /** XP por fase dentro do mundo (constante, exceto Mundo 1). */
  step: number;
  /** Títulos das 10 fases. O 10º é também o título honorífico ganho. */
  phaseTitles: [string, string, string, string, string, string, string, string, string, string];
}

const WORLD_SPECS: WorldSpec[] = [
  {
    id: 1, name: 'Nascimento', emoji: '🥚', hue: '#F5C26B', premium: false, step: 0,
    theme: 'Primeiros cuidados, energia e vínculo inicial.',
    intro: 'Tudo começa pequeno. Cada cuidado seu agora vira raiz.',
    phaseTitles: ['Primeiro sopro', 'Olhos abertos', 'Primeira brincadeira', 'Pequeno apetite', 'Coração quentinho', 'Primeiros passos', 'Voz descoberta', 'Jogo favorito', 'Sono tranquilo', 'Laço formado'],
  },
  {
    id: 2, name: 'Rotina', emoji: '💧', hue: '#7EC8E3', premium: false, step: 60,
    theme: 'Água, sono e movimento viram chão firme.',
    intro: 'O corpo aprende o ritmo. O Mascote sente cada gole, cada pausa.',
    phaseTitles: ['Gole de vida', 'Manhã ritmada', 'Passo firme', 'Pausa que cura', 'Energia que volta', 'Hábito que assenta', 'Dia bem dormido', 'Corpo desperto', 'Rotina viva', 'Guardião da Rotina'],
  },
  {
    id: 3, name: 'Descoberta', emoji: '🎨', hue: '#F49FB6', premium: false, step: 100,
    theme: 'Primeiras roupas, acessórios, emoções e minigames.',
    intro: 'O mundo abre. Estilo, cores e jogos novos esperando.',
    phaseTitles: ['Primeiro espelho', 'Estilo nascente', 'Cor favorita', 'Acessório querido', 'Mundo lá fora', 'Curiosidade acesa', 'Pequeno colecionador', 'Charme próprio', 'Descoberta rara', 'Explorador Curioso'],
  },
  {
    id: 4, name: 'Constância', emoji: '🔥', hue: '#F58B5C', premium: false, step: 150,
    theme: 'Streaks, cenários e missões semanais.',
    intro: 'Agora é sobre voltar amanhã. A chama cresce com você.',
    phaseTitles: ['Chama acesa', 'Semana inteira', 'Vento contra', 'Firmeza gentil', 'Maré constante', 'Raiz profunda', 'Ritmo de ferro', 'Sequência viva', 'Brasa que dura', 'Chama Constante'],
  },
  {
    id: 5, name: 'Evolução', emoji: '✨', hue: '#B89BE6', premium: false, step: 220,
    theme: 'Novas formas, traços visíveis, ambiente vivo.',
    intro: 'Os traços mudam. Quem te vê todo dia percebe primeiro.',
    phaseTitles: ['Pele nova', 'Traço inédito', 'Brilho diferente', 'Forma que muda', 'Energia visível', 'Metamorfose suave', 'Cores vivas', 'Postura nova', 'Quase irreconhecível', 'Forma Viva'],
  },
  {
    id: 6, name: 'Amizade', emoji: '💛', hue: '#F2D34E', premium: false, step: 300,
    theme: 'Memória, vínculo e falas que conhecem você.',
    intro: 'Ele lembra. Das pequenas vitórias, dos dias difíceis, de você.',
    phaseTitles: ['Confidente', 'Memória de nós', 'Riso cúmplice', 'Apoio mútuo', 'História em comum', 'Silêncio bom', 'Lealdade', 'Detalhes seus', 'Vínculo profundo', 'Amigo de Verdade'],
  },
  {
    id: 7, name: 'Jornada', emoji: '🗺️', hue: '#7FBF8E', premium: false, step: 400,
    theme: 'Mapa aberto, eventos e conquistas raras.',
    intro: 'O caminho ficou longo — e bonito. Olha quanto vocês já andaram.',
    phaseTitles: ['Mapa aberto', 'Trilha nova', 'Horizonte largo', 'Tempestade vencida', 'Atalho secreto', 'Mirante alto', 'Pegadas firmes', 'Travessia', 'Quase no topo', 'Andarilho dos Mundos'],
  },
  {
    id: 8, name: 'Maestria', emoji: '🏆', hue: '#D9A441', premium: false, step: 550,
    theme: 'Desafios avançados e skins raras.',
    intro: 'Poucos chegam aqui. O cuidado virou arte.',
    phaseTitles: ['Gesto preciso', 'Calma de mestre', 'Desafio aceito', 'Técnica rara', 'Equilíbrio fino', 'Prova superada', 'Toque de ouro', 'Sabedoria leve', 'Excelência diária', 'Mestre do Cuidado'],
  },
  {
    id: 9, name: 'Forma Lendária', emoji: '🌌', hue: '#5B6ABF', premium: true, step: 700,
    theme: 'Evolução premium, efeitos especiais, personalização profunda.',
    intro: 'Existe um brilho que só a constância desperta. Você está perto.',
    phaseTitles: ['Aura desperta', 'Eco antigo', 'Luz própria', 'Símbolo vivo', 'Presença rara', 'Lenda sussurrada', 'Poder gentil', 'Marca eterna', 'Véu rompido', 'Lenda Desperta'],
  },
  {
    id: 10, name: 'Mascote Supremo', emoji: '👑', hue: '#C9A227', premium: true, step: 900,
    theme: 'Forma máxima, itens lendários, status raro.',
    intro: 'A última era. Tudo que vocês construíram, visível de longe.',
    phaseTitles: ['Coroa invisível', 'Domínio sereno', 'Constelação própria', 'Tempo dominado', 'Essência plena', 'Guardião supremo', 'Brilho absoluto', 'Última forma', 'Véspera da glória', 'Mascote Supremo'],
  },
];

/** Incrementos de XP do Mundo 1 (fase 1→2, 2→3, ... 9→10). */
const WORLD1_STEPS = [10, 15, 20, 25, 30, 35, 40, 45, 50];

/**
 * Minigames desbloqueados por fase. Cedo de propósito: o primeiro jogo
 * chega no dia 1 ("quero ver o que vem depois").
 */
export const MINIGAME_UNLOCK_PHASES: Record<string, number> = {
  'energy-run': 3,
  'crystal-hunt': 8,
  'dream-flow': 15,
};

function rewardForPhase(n: number, worldId: number, isMinigame?: string): JourneyReward {
  if (isMinigame) {
    return {
      kind: 'minigame', coins: 15, gems: 0, minigameId: isMinigame,
      label: 'Novo minigame desbloqueado',
    };
  }
  if (n % 10 === 0) {
    // Final de mundo: baú grande + título honorífico.
    const spec = WORLD_SPECS[worldId - 1];
    return {
      kind: 'title', coins: 80 + worldId * 10, gems: 2,
      title: spec.phaseTitles[9],
      label: `Título "${spec.phaseTitles[9]}" + baú lendário`,
    };
  }
  if (n % 5 === 0) {
    return { kind: 'chest', coins: 40 + worldId * 5, gems: 1, label: 'Baú especial' };
  }
  const coins = 10 + worldId * 5;
  return { kind: 'coins', coins, gems: 0, label: `+${coins} moedas` };
}

function buildWorlds(): { worlds: WorldMeta[]; phases: JourneyPhase[] } {
  const worlds: WorldMeta[] = [];
  const phases: JourneyPhase[] = [];
  let xp = 0;
  let n = 1;
  const minigameByPhase = new Map<number, string>(
    Object.entries(MINIGAME_UNLOCK_PHASES).map(([id, phase]) => [phase, id]),
  );
  for (const spec of WORLD_SPECS) {
    const firstPhase = n;
    for (let i = 0; i < 10; i++) {
      if (n > firstPhase || spec.id > 1) {
        // Incremento da fase anterior pra esta (fase 1 global = 0 XP).
        const step = spec.id === 1 ? WORLD1_STEPS[i - 1] ?? 0 : spec.step;
        if (n > 1) xp += step;
      }
      phases.push({
        n,
        worldId: spec.id,
        xp,
        title: spec.phaseTitles[i],
        reward: rewardForPhase(n, spec.id, minigameByPhase.get(n)),
      });
      n++;
    }
    worlds.push({
      id: spec.id,
      name: spec.name,
      emoji: spec.emoji,
      theme: spec.theme,
      intro: spec.intro,
      hue: spec.hue,
      premium: spec.premium,
      firstPhase,
      lastPhase: n - 1,
    });
  }
  return { worlds, phases };
}

const built = buildWorlds();

/** Os 10 mundos, em ordem. */
export const JOURNEY_WORLDS: readonly WorldMeta[] = built.worlds;

/** As 100 fases, em ordem, com threshold de XP cumulativo crescente. */
export const JOURNEY_PHASES: readonly JourneyPhase[] = built.phases;

export function getWorld(id: number): WorldMeta {
  return JOURNEY_WORLDS.find(w => w.id === id) ?? JOURNEY_WORLDS[0];
}

export function getPhase(n: number): JourneyPhase {
  const clamped = Math.max(1, Math.min(JOURNEY_PHASES.length, Math.floor(n)));
  return JOURNEY_PHASES[clamped - 1];
}

export function phasesForWorld(worldId: number): JourneyPhase[] {
  return JOURNEY_PHASES.filter(p => p.worldId === worldId);
}
