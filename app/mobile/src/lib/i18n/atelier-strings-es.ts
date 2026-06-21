/**
 * Atelier strings (ES-419) — mirrors STRINGS_PT.atelier.*
 */

import type { StringsBundle } from './atelier-strings';

export const STRINGS_ES: StringsBundle = {
  atelier: {
    header: {
      title: 'Atelier',
      subtitle: 'esculpe tu mascota',
      save_action: 'Guardar',
      close_action: 'Cerrar',
    },
    sections: {
      presets: { title: 'Presets', subtitle: 'toca para aplicar un estilo' },
      blend: { title: 'Mezclar presets', subtitle: 'mezcla 2 estilos en proporción variable' },
      forma: { title: 'Forma', subtitle: 'proporciones de cuerpo y ojos' },
      aura_pattern: { title: 'Aura y patrón', subtitle: 'brillo y textura de la piel' },
      appendages: {
        title: 'Apéndices',
        subtitle: 'oculta partes que el ADN muestra (no inventa lo que no existe)',
      },
      actions: { title: 'Acciones' },
      mutations_active: {
        title: 'Mutaciones activas',
        subtitle_count: (n: number) =>
          `${n} mutación${n === 1 ? '' : 'es'} desbloqueada${n === 1 ? '' : 's'} — afecta la vista previa`,
        subtitle_empty: 'hitos biológicos aún por venir',
      },
      personalities: {
        title: 'Otras personalidades',
        subtitle: 'el mismo ADN con estilos distintos (solo lectura)',
      },
      looks: { title: 'Looks guardados', subtitle: 'personalizaciones con nombre para cambio rápido' },
    },
    sliders: {
      eye_size: { label: 'Tamaño de ojos', hint: 'más grandes se ven más tiernos; más pequeños, más maduros' },
      eye_spread: { label: 'Separación de ojos', hint: 'separa o junta los ojos' },
      body_height: { label: 'Altura del cuerpo', hint: 'estira o aplana verticalmente' },
      body_width: { label: 'Ancho del cuerpo', hint: 'ensancha o estrecha horizontalmente' },
      aura_intensity: { label: 'Intensidad del aura', hint: 'partículas y brillo alrededor' },
      pattern_density: { label: 'Densidad del patrón', hint: 'más o menos marcas en el cuerpo' },
      posture: { label: 'Inclinación', hint: 'postura del cuerpo (negativo = atrás, positivo = adelante)' },
    },
    toggles: {
      hide_tail: { label: 'Ocultar cola', description: 'solo si el ADN tiene cola' },
      hide_antennae: { label: 'Ocultar antenas', description: 'solo si el ADN tiene antenas' },
      hide_spikes: { label: 'Ocultar púas', description: 'solo si el ADN tiene púas' },
      a11y_hint: (action: string, description: string) =>
        `Toca para ${action}. ${description}`.trim(),
      action_show: 'mostrar',
      action_hide: 'ocultar',
    },
    actions: {
      undo: 'Deshacer',
      redo: 'Rehacer',
      random: 'Aleatorio',
      reset: 'ADN puro',
      compare: 'Comparar antes/después',
      attribution: 'Composición visual',
      cancel: 'Cancelar',
    },
    blend: {
      pick_prompt: 'Elige un preset:',
      slider_label: 'Mezcla A B',
      slider_hint: (labelA: string, labelB: string) =>
        `0 = solo ${labelA}, 1 = solo ${labelB}`,
      apply: 'Aplicar mezcla',
      a11y_pick_slot: (slot: string, label: string) =>
        `Preset ${slot}: ${label}. Toca para cambiar.`,
      a11y_apply: 'Aplicar mezcla al borrador',
    },
    blend_multi: {
      title: 'Componer 3 presets',
      subtitle: 'los pesos se normalizan automáticamente',
      add_slot: 'Agregar preset',
      remove_slot: 'Quitar',
      apply: 'Aplicar composición',
      slot_label: (slot: number) => `Ranura ${slot}`,
      weight_label: 'Peso',
    },
    looks_history: {
      title: 'Historial de looks',
      subtitle: 'capturas automáticas de tu viaje',
      empty: 'aún no hay capturas. Vuelve en unos días.',
      load: 'Cargar',
      delete_action: 'Eliminar captura',
      delete_confirm_title: '¿Eliminar captura?',
      delete_confirm_body: 'Las capturas automáticas se regeneran pronto.',
    },
    celebration: {
      title_new_mutation: '¡Nueva mutación activa!',
      subtitle: 'un hito para tu mascota',
      dismiss: 'Continuar',
    },
    preview: {
      live: 'vista previa en vivo',
      restored: 'borrador restaurado - vista previa en vivo',
      loading: 'Cargando...',
    },
    alerts: {
      discard_changes: {
        title: '¿Salir sin guardar?',
        body: 'Tus cambios en el Atelier se descartarán.',
        cancel: 'Seguir editando',
        confirm: 'Descartar',
      },
      reset_dna: {
        title: '¿Volver al ADN puro?',
        body_default: 'Esto reinicia todos los controles y patrones. Podrás guardar después.',
        body_with_locks: (n: number) =>
          `Esto reinicia todos los controles y patrones — excepto ${n} campo${n === 1 ? '' : 's'} bloqueado${n === 1 ? '' : 's'}. Podrás guardar después.`,
        cancel: 'Cancelar',
        confirm: 'Reiniciar',
      },
      save_error: { title: 'Error al guardar' },
    },
    footer: {
      closet_hint: 'Los accesorios y escenarios están en el Clóset.',
      dna_safety: 'La personalización nunca altera el ADN — solo esculpe el aspecto.',
      preferences_link: 'Preferencias del Atelier',
    },
  },
};
