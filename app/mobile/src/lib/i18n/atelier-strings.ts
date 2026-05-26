/**
 * Atelier strings — PT-BR source of truth.
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
      a11y_hint: (action: string, description: string) =>
        `Toque pra ${action}. ${description}`.trim(),
      action_show: 'mostrar',
      action_hide: 'esconder',
    },
    actions: {
      undo: 'Desfazer',
      redo: 'Refazer',
      random: 'Aleatório',
      reset: 'DNA puro',
      compare: 'Comparar antes/depois',
      attribution: 'Composição visual',
      cancel: 'Cancelar',
    },
    blend: {
      pick_prompt: 'Escolha um preset:',
      slider_label: 'Mix A B',
      slider_hint: (labelA: string, labelB: string) =>
        `0 = só ${labelA}, 1 = só ${labelB}`,
      apply: 'Aplicar blend',
      a11y_pick_slot: (slot: string, label: string) =>
        `Preset ${slot}: ${label}. Toque para trocar.`,
      a11y_apply: 'Aplicar blend ao draft',
    },
    blend_multi: {
      title: 'Compor 3 presets',
      subtitle: 'normaliza pesos automaticamente',
      add_slot: 'Adicionar preset',
      remove_slot: 'Remover',
      apply: 'Aplicar composição',
      slot_label: (slot: number) => `Slot ${slot}`,
      weight_label: 'Peso',
    },
    looks_history: {
      title: 'Histórico de looks',
      subtitle: 'snapshots automáticos da sua jornada',
      empty: 'ainda não há snapshots. Volte daqui a uns dias.',
      load: 'Carregar',
      delete_action: 'Apagar snapshot',
      delete_confirm_title: 'Apagar snapshot?',
      delete_confirm_body: 'Snapshots automáticos podem ser regenerados em breve.',
    },
    celebration: {
      title_new_mutation: 'Nova mutação ativa!',
      subtitle: 'um marco do seu mascote',
      dismiss: 'Continuar',
    },
    preview: {
      live: 'preview ao vivo',
      restored: 'rascunho restaurado · preview ao vivo',
      loading: 'Carregando...',
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
      closet_hint: 'Acessórios e cenas ficam no Closet.',
      dna_safety: 'Customização nunca altera o DNA — só esculpe a aparência.',
      preferences_link: 'Preferências do Ateliê',
    },
  },
};

export type StringsPT = typeof STRINGS_PT;
export type StringsBundle = StringsPT;
