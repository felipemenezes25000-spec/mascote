/**
 * Atelier strings (EN-US) — mirrors STRINGS_PT.atelier.*
 */

import type { StringsBundle } from './atelier-strings';

export const STRINGS_EN: StringsBundle = {
  atelier: {
    header: {
      title: 'Atelier',
      subtitle: 'sculpt your mascot',
      save_action: 'Save',
      close_action: 'Close',
    },
    sections: {
      presets: { title: 'Presets', subtitle: 'tap to apply a vibe' },
      blend: { title: 'Blend presets', subtitle: 'mix 2 vibes at variable ratio' },
      forma: { title: 'Form', subtitle: 'body and eye proportions' },
      aura_pattern: { title: 'Aura & Pattern', subtitle: 'skin glow and texture' },
      appendages: {
        title: 'Appendages',
        subtitle: "hide parts the DNA shows (doesn't invent what isn't there)",
      },
      actions: { title: 'Actions' },
      mutations_active: {
        title: 'Active mutations',
        subtitle_count: (n: number) =>
          `${n} mutation${n === 1 ? '' : 's'} unlocked — affecting the preview`,
        subtitle_empty: 'biological milestones still to come',
      },
      personalities: {
        title: 'Other personalities',
        subtitle: 'same DNA with different vibes (read-only)',
      },
      looks: { title: 'Saved looks', subtitle: 'named customizations for quick swap' },
    },
    sliders: {
      eye_size: { label: 'Eye size', hint: 'larger feels cuter; smaller feels mature' },
      eye_spread: { label: 'Eye spread', hint: 'pulls eyes apart or together' },
      body_height: { label: 'Body height', hint: 'stretches or flattens vertically' },
      body_width: { label: 'Body width', hint: 'widens or narrows horizontally' },
      aura_intensity: { label: 'Aura intensity', hint: 'particles and glow around' },
      pattern_density: { label: 'Pattern density', hint: 'more or fewer marks on the body' },
      posture: { label: 'Lean', hint: 'body posture (negative = back, positive = forward)' },
    },
    toggles: {
      hide_tail: { label: 'Hide tail', description: 'only if the DNA has a tail' },
      hide_antennae: { label: 'Hide antennae', description: 'only if the DNA has antennae' },
      hide_spikes: { label: 'Hide spikes', description: 'only if the DNA has spikes' },
      a11y_hint: (action: string, description: string) =>
        `Tap to ${action}. ${description}`.trim(),
      action_show: 'show',
      action_hide: 'hide',
    },
    actions: {
      undo: 'Undo',
      redo: 'Redo',
      random: 'Random',
      reset: 'Pure DNA',
      compare: 'Compare before/after',
      attribution: 'Visual composition',
      cancel: 'Cancel',
    },
    blend: {
      pick_prompt: 'Pick a preset:',
      slider_label: 'Mix A B',
      slider_hint: (labelA: string, labelB: string) =>
        `0 = only ${labelA}, 1 = only ${labelB}`,
      apply: 'Apply blend',
      a11y_pick_slot: (slot: string, label: string) =>
        `Preset ${slot}: ${label}. Tap to change.`,
      a11y_apply: 'Apply blend to draft',
    },
    blend_multi: {
      title: 'Compose 3 presets',
      subtitle: 'weights normalize automatically',
      add_slot: 'Add preset',
      remove_slot: 'Remove',
      apply: 'Apply composition',
      slot_label: (slot: number) => `Slot ${slot}`,
      weight_label: 'Weight',
    },
    looks_history: {
      title: 'Looks history',
      subtitle: 'automatic snapshots of your journey',
      empty: 'no snapshots yet. Come back in a few days.',
      load: 'Load',
      delete_action: 'Delete snapshot',
      delete_confirm_title: 'Delete snapshot?',
      delete_confirm_body: 'Automatic snapshots can be regenerated soon.',
    },
    celebration: {
      title_new_mutation: 'New mutation active!',
      subtitle: 'a milestone for your mascot',
      dismiss: 'Continue',
    },
    preview: {
      live: 'live preview',
      restored: 'draft restored - live preview',
      loading: 'Loading...',
    },
    alerts: {
      discard_changes: {
        title: 'Leave without saving?',
        body: 'Your changes in the Atelier will be discarded.',
        cancel: 'Keep editing',
        confirm: 'Discard',
      },
      reset_dna: {
        title: 'Return to pure DNA?',
        body_default: "This resets all sliders and patterns. You'll be able to save afterward.",
        body_with_locks: (n: number) =>
          `This resets all sliders and patterns — except ${n} locked field${n === 1 ? '' : 's'}. You'll be able to save afterward.`,
        cancel: 'Cancel',
        confirm: 'Reset',
      },
      save_error: { title: 'Error saving' },
    },
    footer: {
      closet_hint: 'Accessories and scenes live in the Closet.',
      dna_safety: 'Customization never alters DNA — it only sculpts the look.',
      preferences_link: 'Atelier preferences',
    },
  },
  onboarding: {
    welcome: {
      title_line1: 'Take care of you.',
      title_line2: 'Your Mascot grows with you.',
      subtitle: 'In 30 seconds a day, you take care of you and it grows at your pace. No pressure, no guilt.',
      promise: "When the day gets heavy, it doesn't judge you: it reminds you to breathe, rest, and begin again gently.",
      cta_start: 'Get started',
      skip_label: 'Skip the intro and choose directly',
      skip_alert_title: 'Skip the tour?',
      skip_alert_body: "You'll miss the mascot intro and the quick rundown of missions. You can come back later in settings.",
      skip_alert_cancel: 'Back to the tour',
      skip_alert_confirm: 'Skip anyway',
      disclaimer: 'Mascot is wellness and self-care. It does not replace professional care.',
    },
  },
};
