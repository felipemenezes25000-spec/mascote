import type { Genome } from '@/lib/dna';
import { dominantArchetype, type ArchetypeId } from '@/game/evolution/archetypeAffinity';
import { getWorld, JOURNEY_WORLDS } from './worlds';
import { journeyPhaseFromXp } from './index';

/**
 * FORMAS do mascote — a evolução CORPORAL da Jornada.
 *
 * Cada mundo concede uma forma nomeada com um traço físico novo no corpo
 * (não adorno orbital — isso é WorldAdornments). Os traços ACUMULAM: o
 * mascote do Mundo 8 carrega a marca, as orelhinhas, a crista, as
 * proto-asas, o emblema... — a história inteira visível no corpo.
 *
 * Combinado com os 6 stages de fase (ovo→evoluído) e a variante de emblema
 * por arquétipo dominante do DNA (8 arquétipos), o mascote tem:
 *   6 stages × 10 formas cumulativas × 8 emblemas = identidade própria
 *   que muda visivelmente AO LONGO DE TODA a jornada, não só em 6 saltos.
 *
 * Tudo função pura do XP (+ DNA opcional pro emblema) — mesmo contrato do
 * resto da jornada: sem estado, sem regressão possível.
 */

export type FormFeature =
  | 'brow_mark'      // M2 — marquinha na testa (primeiro traço próprio)
  | 'ear_nubs'       // M3 — orelhinhas no topo da cabeça
  | 'antenna_crest'  // M4 — crista de chama na antena
  | 'proto_wings'    // M5 — brotos de asa no corpo
  | 'chest_emblem'   // M6 — emblema de arquétipo no peito
  | 'cheek_star'     // M7 — estrela de viajante na bochecha
  | 'golden_tips'    // M8 — extremidades douradas
  | 'lumen_eyes'     // M9 — anéis de luz nos olhos
  | 'ethereal_crown'; // M10 — coroa etérea flutuante

export interface MascotForm {
  /** 1..10 — mesma numeração dos mundos. */
  formId: number;
  /** Nome da forma ("Brotinho", "Lúmen"...). Exibido na UI. */
  name: string;
  /** Uma linha sobre o que mudou no corpo. */
  trait: string;
  /** Traços físicos ativos (CUMULATIVOS até este mundo). */
  features: FormFeature[];
}

interface FormSpec {
  name: string;
  trait: string;
  /** Traço NOVO que este mundo adiciona (null no mundo 1). */
  adds: FormFeature | null;
}

const FORM_SPECS: Record<number, FormSpec> = {
  1: { name: 'Semente', trait: 'Forma pura — tudo ainda por nascer.', adds: null },
  2: { name: 'Marcado', trait: 'A primeira marca própria desponta na testa.', adds: 'brow_mark' },
  3: { name: 'Atento', trait: 'Orelhinhas curiosas surgem no topo da cabeça.', adds: 'ear_nubs' },
  4: { name: 'Crista-Firme', trait: 'A antena ganha uma crista de chama.', adds: 'antenna_crest' },
  5: { name: 'Asa-Nova', trait: 'Brotos de asa despontam do corpo.', adds: 'proto_wings' },
  6: { name: 'Coração-Leal', trait: 'Um emblema do seu arquétipo brilha no peito.', adds: 'chest_emblem' },
  7: { name: 'Andarilho', trait: 'Uma estrela de viajante marca a bochecha.', adds: 'cheek_star' },
  8: { name: 'Dourado', trait: 'As extremidades ganham toque de ouro.', adds: 'golden_tips' },
  9: { name: 'Lúmen', trait: 'Os olhos passam a emitir anéis de luz.', adds: 'lumen_eyes' },
  10: { name: 'Supremo', trait: 'Uma coroa etérea flutua sobre a cabeça.', adds: 'ethereal_crown' },
};

/** Traços físicos ativos pra um mundo (cumulativos, M2..worldId). */
export function formFeaturesForWorld(worldId: number): FormFeature[] {
  const safe = Number.isFinite(worldId) ? Math.max(1, Math.min(10, Math.floor(worldId))) : 1;
  const features: FormFeature[] = [];
  for (let id = 2; id <= safe; id++) {
    const adds = FORM_SPECS[id]?.adds;
    if (adds) features.push(adds);
  }
  return features;
}

/** Forma de um mundo específico (pra teasers e celebrações). */
export function formForWorld(worldId: number): MascotForm {
  const safe = Number.isFinite(worldId) ? Math.max(1, Math.min(10, Math.floor(worldId))) : 1;
  const spec = FORM_SPECS[safe];
  return { formId: safe, name: spec.name, trait: spec.trait, features: formFeaturesForWorld(safe) };
}

/** Forma do mascote derivada pura do XP (traços cumulativos). */
export function mascotFormFromXp(xp: number): MascotForm {
  return formForWorld(journeyPhaseFromXp(xp).worldId);
}

/** Próxima forma (teaser de desejo) — null quando já é Supremo. */
export function nextFormTeaser(xp: number): { name: string; trait: string; atPhase: number } | null {
  const worldId = journeyPhaseFromXp(xp).worldId;
  if (worldId >= 10) return null;
  const next = FORM_SPECS[worldId + 1];
  const world = JOURNEY_WORLDS[worldId]; // índice worldId = próximo mundo (id worldId+1)
  return { name: next.name, trait: next.trait, atPhase: world.firstPhase };
}

/**
 * Emblema de peito por arquétipo dominante do DNA — 8 variantes.
 * Sem DNA → 'lumina' (neutro luminoso).
 */
export function emblemForGenome(genome: Genome | undefined | null): ArchetypeId {
  if (!genome) return 'lumina';
  try {
    return dominantArchetype(genome).id;
  } catch {
    return 'lumina';
  }
}

/** Nome completo de exibição: "Lúmen de Aqua" (forma + arquétipo). */
export function formDisplayName(xp: number, genome?: Genome | null): string {
  const form = mascotFormFromXp(xp);
  if (form.formId < 6 || !genome) return form.name;
  // A partir do emblema (M6), o arquétipo entra no nome — identidade dupla.
  const archetype = emblemForGenome(genome);
  const label = archetype.charAt(0).toUpperCase() + archetype.slice(1);
  return `${form.name} de ${label}`;
}

/** Hue do mundo da forma (pra UI colorir o nome). */
export function formHue(xp: number): string {
  return getWorld(journeyPhaseFromXp(xp).worldId).hue;
}
