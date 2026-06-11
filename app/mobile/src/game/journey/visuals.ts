import { getWorld } from './worlds';
import { journeyPhaseFromXp } from './index';

/**
 * Visual da Jornada — o que muda no MASCOTE conforme o mundo avança.
 *
 * Derivado PURO do XP (mesmo princípio do resto da jornada): o renderer
 * (Mascot2D) recebe este objeto pronto via prop opcional e não conhece a
 * mecânica de fases. Sem prop → zero mudança visual (compat total com
 * callers/testes existentes).
 *
 * Linguagem visual por mundo (sutil, nunca poluído):
 *  - anel de identidade na cor do mundo, intensidade cresce DENTRO do mundo
 *    (fase 47 é visivelmente mais "carregada" que a 43);
 *  - adorno temático discreto orbitando o mascote, quantidade cresce com a
 *    fase dentro do mundo (1→3 elementos).
 */

export type WorldAdornment =
  | 'none'          // M1 Nascimento — pureza, sem adorno
  | 'droplets'      // M2 Rotina — gotinhas d'água
  | 'petals'        // M3 Descoberta — pétalas coloridas
  | 'embers'        // M4 Constância — brasas na base
  | 'sparks'        // M5 Evolução — faíscas de transformação
  | 'hearts'        // M6 Amizade — coraçõezinhos
  | 'compass'       // M7 Jornada — estrelas-guia cardeais
  | 'laurels'       // M8 Maestria — louros dourados
  | 'runes'         // M9 Forma Lendária — runas orbitais
  | 'constellation'; // M10 Supremo — constelação coroada

const WORLD_ADORNMENTS: Record<number, WorldAdornment> = {
  1: 'none',
  2: 'droplets',
  3: 'petals',
  4: 'embers',
  5: 'sparks',
  6: 'hearts',
  7: 'compass',
  8: 'laurels',
  9: 'runes',
  10: 'constellation',
};

export interface JourneyVisuals {
  worldId: number;
  /** Posição dentro do mundo: 1..10. */
  phaseInWorld: number;
  /** Cor de identidade do mundo (hex). */
  hue: string;
  /**
   * 0..1 — intensidade do anel/adorno. Cresce com o mundo (base) e com a
   * fase dentro do mundo (refinamento). M1 começa em ~0.08; M10 fase 100 = 1.
   */
  intensity: number;
  adornment: WorldAdornment;
  /** Quantos elementos do adorno renderizar (1..3). */
  adornmentCount: number;
}

export function journeyVisuals(xp: number): JourneyVisuals {
  const phase = journeyPhaseFromXp(xp);
  const world = getWorld(phase.worldId);
  const phaseInWorld = phase.n - world.firstPhase + 1;
  // Base por mundo (0.08..0.62) + refinamento intra-mundo (0..0.38 ao longo
  // das 10 fases). Clampado em [0,1] por segurança.
  const base = 0.02 + world.id * 0.06;
  const fine = ((phaseInWorld - 1) / 9) * 0.38;
  const intensity = Math.max(0, Math.min(1, base + fine));
  return {
    worldId: world.id,
    phaseInWorld,
    hue: world.hue,
    intensity,
    adornment: WORLD_ADORNMENTS[world.id] ?? 'none',
    adornmentCount: Math.min(3, 1 + Math.floor((phaseInWorld - 1) / 4)),
  };
}
