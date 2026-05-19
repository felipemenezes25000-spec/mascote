import type { MascotPhase } from '@/types';

/**
 * Labels VISÍVEIS pra o usuário — vocabulário PROCEDURAL, não Tamagotchi.
 *
 * `phaseLabels` (legado): mantidas internamente apenas porque alguns helpers
 * (notifs, evolution-stories antigos) podem referenciar. EVITAR usar em UI
 * nova. Preferir `emergentPhaseLabels` abaixo, que descreve estado em
 * linguagem orgânica de "criatura viva" — o brief DLI exige que a UI deixe
 * de soar como pet virtual com fases pré-determinadas.
 *
 * Migration path: substituir `phaseLabels[phase]` → `emergentPhaseLabels[phase]`
 * em qualquer texto user-facing. Telas refatoradas (evolution tab) já usam
 * só emergent.
 */
export const phaseLabels: Record<MascotPhase, string> = {
  ovo: 'Ovo',
  bebe: 'Bebê',
  crianca: 'Criança',
  adolescente: 'Adolescente',
  adulto: 'Adulto',
  evoluido: 'Forma Rara',
};

/**
 * Labels PROCEDURAIS — descrevem o estado da criatura como ORGANISMO,
 * não como uma "fase" Tamagotchi. Cada label evoca biologia/transformação
 * em vez de etapa pré-definida.
 *
 * Princípio: o usuário vê "Traços despertando" no badge da Home, não
 * "Nv 2 · Bebê". A fase mecânica continua presente no código pra XP/level
 * logic, mas a EXPERIÊNCIA fala outra linguagem.
 */
export const emergentPhaseLabels: Record<MascotPhase, string> = {
  ovo:         'Forma inicial',
  bebe:        'Traços despertando',
  crianca:     'Corpo em expansão',
  adolescente: 'Identidade emergindo',
  adulto:      'Forma singular',
  evoluido:    'Marco raro',
};

/**
 * Descrição curta complementar pra contexto de UI rica (cards, tooltips).
 * Tom orgânico, biológico, nunca de progressão linear.
 */
export const emergentPhaseDescriptions: Record<MascotPhase, string> = {
  ovo:         'Genes assentando, corpo se definindo aos poucos.',
  bebe:        'Primeiras estruturas ganhando contorno.',
  crianca:     'Membros, antenas, padrões emergindo conforme o DNA.',
  adolescente: 'Traços marcantes pegando força — personalidade visível.',
  adulto:      'Forma completa, identidade clara, com história gravada.',
  evoluido:    'Combinação rara — algo que poucas criaturas conseguem.',
};
