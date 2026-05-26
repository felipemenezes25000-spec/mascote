/**
 * Atelier strings — primeira extração i18n do app Mascote.
 *
 * Por que começar pelo Atelier: feature mais recente, maior densidade de
 * strings PT-BR (sliders, presets, alerts, modals). Resto do app pode ser
 * migrado em slices futuros sem refator amplo.
 *
 * Estratégia: namespace por feature; chaves em snake_case; valores PT-BR
 * como source of truth. Outras línguas adicionadas no mesmo shape.
 *
 * Uso planejado:
 *   import { t } from '@/lib/i18n';
 *   t('atelier.header.title')  // → "Ateliê"
 *
 * Esse arquivo só EXPÕE as strings PT-BR. O helper `t()` virá em slice
 * futuro junto com detecção de locale e fallback. Por agora componentes
 * podem importar `STRINGS_PT.atelier.header.title` direto.
 */

export const STRINGS_PT = {
  atelier: {
    header: {
      title: 'Ateliê',
      subtitle: 'esculpe o seu mascote',
      save_action: 'Salvar',
      close_action: 'Fechar',
    },
    sections: {
      presets: { title: 'Presets', subtitle: 'toque pra aplicar uma vibe' },
      blend: { title: 'Misturar presets', subtitle: 'combine 2 vibes em proporção variável' },
      forma: { title: 'Forma', subtitle: 'proporções do corpo e dos olhos' },
      aura_pattern: { title: 'Aura & Padrão', subtitle: 'brilho e textura da pele' },
      appendages: {
        title: 'Apêndices',
        subtitle: 'esconde partes que o DNA mostra (não inventa o que não tem)',
      },
      actions: { title: 'Ações' },
      mutations_active: {
        title: 'Mutações ativas',
        subtitle_count: (n: number) =>
          `${n} desbloqueada${n === 1 ? '' : 's'} — afetando o preview`,
        subtitle_empty: 'marcos biológicos que ainda virão',
      },
      personalities: {
        title: 'Outras personalidades',
        subtitle: 'o mesmo DNA com vibes diferentes (read-only)',
      },
      looks: { title: 'Looks salvos', subtitle: 'customizações nomeadas pra trocar rapidamente' },
    },
    sliders: {
      eye_size: { label: 'Tamanho dos olhos', hint: 'grandes parecem mais fofos; pequenos mais maduros' },
      eye_spread: { label: 'Separação dos olhos', hint: 'afasta ou aproxima os olhos' },
      body_height: { label: 'Altura do corpo', hint: 'alonga ou achata vertical' },
      body_width: { label: 'Largura do corpo', hint: 'alarga ou afina horizontal' },
      aura_intensity: { label: 'Intensidade da aura', hint: 'partículas e brilho ao redor' },
      pattern_density: { label: 'Densidade do padrão', hint: 'mais ou menos marcas no corpo' },
      posture: { label: 'Inclinação', hint: 'postura do corpo (negativo = pra trás, positivo = pra frente)' },
    },
    toggles: {
      hide_tail: { label: 'Esconder cauda', description: 'apenas se o DNA tiver cauda' },
      hide_antennae: { label: 'Esconder antenas', description: 'apenas se o DNA tiver antenas' },
      hide_spikes: { label: 'Esconder espinhos', description: 'apenas se o DNA tiver espinhos' },
    },
    actions: {
      undo: 'Desfazer',
      redo: 'Refazer',
      random: 'Aleatório',
      reset: 'DNA puro',
      compare: 'Comparar antes/depois',
      attribution: 'Composição visual',
    },
    preview: {
      live: 'preview ao vivo',
      restored: '↻ rascunho restaurado · preview ao vivo',
    },
    alerts: {
      discard_changes: {
        title: 'Sair sem salvar?',
        body: 'Suas mudanças no Ateliê serão descartadas.',
        cancel: 'Continuar editando',
        confirm: 'Descartar',
      },
      reset_dna: {
        title: 'Voltar ao DNA puro?',
        body_default: 'Vai resetar todos os sliders e padrões. Você poderá salvar depois.',
        body_with_locks: (n: number) =>
          `Vai resetar todos os sliders e padrões — exceto ${n} field${n === 1 ? '' : 's'} travado${n === 1 ? '' : 's'}. Você poderá salvar depois.`,
        cancel: 'Cancelar',
        confirm: 'Resetar',
      },
      save_error: { title: 'Erro ao salvar' },
    },
    footer: {
      closet_hint: '🔒 Acessórios e cenas ficam no Closet.',
      dna_safety: 'Customização nunca altera o DNA — só esculpe a aparência.',
      preferences_link: '⚙ Preferências do Ateliê',
    },
  },
} as const;

export type StringsPT = typeof STRINGS_PT;
