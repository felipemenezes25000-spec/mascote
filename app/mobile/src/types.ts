export type Personality = 'calmo' | 'motivador' | 'fofo' | 'sabio';
export type MascotPhase = 'ovo' | 'bebe' | 'crianca' | 'adolescente' | 'adulto' | 'evoluido';
export type MascotMood = 'triste' | 'ok' | 'feliz' | 'empolgado' | 'exausto';

export type HabitKind =
  | 'water'
  | 'sleep'
  | 'exercise'
  | 'meditation'
  | 'reading'
  | 'journaling'
  | 'breath'
  | 'outdoor'
  | 'sun';

export type SafetyFlag = 'safe' | 'watch' | 'high' | 'critical';

export type AccessorySlot = 'hat' | 'glasses' | 'neck' | 'back' | 'ear';
export type UnlockKind = 'level' | 'streak' | 'phase' | 'mission_count' | 'seasonal';

export interface Profile {
  id: string;
  display_name: string;
  age_band: '16-24' | '25-34' | '35-44' | '45+' | null;
  timezone: string;
  locale: string;
  created_at: string;
}

/**
 * Genoma procedural. 11 floats em [0.02, 0.98].
 * Documentação completa em `src/lib/dna/genome.ts`.
 */
export interface MascotDNA {
  empathy: number;
  curiosity: number;
  creativity: number;
  discipline: number;
  chaos: number;
  aggression: number;
  resilience: number;
  emotionalDepth: number;
  socialEnergy: number;
  adaptability: number;
  intelligence: number;
}

export interface Mascot {
  id: string;
  user_id: string;
  name: string;
  personality: Personality;
  phase: MascotPhase;
  mood: MascotMood;
  xp: number;
  level: number;
  energy: number;
  health: number;
  /**
   * Genoma procedural. Opcional pra retro-compatibilidade com snapshots v1 —
   * migration v1→v2 popula com preset da personalidade.
   */
  dna?: MascotDNA;
  /** Seed usado pra gerar variação procedural inicial. Imutável. */
  dna_seed?: number;
  /**
   * Genome procedural IA-gerado. Quando presente, Mascot2D usa pra desenhar
   * em vez do DNA puro. Atualizado em milestones (evolução, streak, etc.).
   * Ver `docs/superpowers/specs/2026-05-27-mascote-2d-procedural-ia-design.md`.
   */
  procedural_genome?: ProceduralGenome | null;
  last_seen_at: string;
  created_at: string;
}

/** HSL color tuple [h: 0-360, s: 0-100, l: 0-100]. */
export type HSL = [number, number, number];

export type MilestoneTrigger =
  | `evolution:${MascotPhase}`
  | `streak:${number}d`
  | `achievement:${string}`
  | `messages:${number}`
  | 'onboarding';

export type MarkKind = 'spot' | 'stripe' | 'scar' | 'star' | 'crescent' | 'leaf' | 'rune';
export type MarkPlacement = 'cheek' | 'forehead' | 'body' | 'tail';
export type MarkColor = 'accent' | 'deep' | 'gold';

export type HeadShape = 'round' | 'oval' | 'square' | 'teardrop' | 'crystal' | 'cloud';
export type BodyShape = 'pebble' | 'capsule' | 'orb' | 'leaf' | 'stone';

export interface ProceduralGenome {
  version: 1;
  generatedAt: string;
  trigger: MilestoneTrigger;
  palette: { body: HSL; accent: HSL; deep: HSL; eye: HSL };
  silhouette: {
    headShape: HeadShape;
    headRx: number;
    headRy: number;
    bodyShape: BodyShape;
    proportions: { headBody: number; eyeSize: number };
  };
  marks: Array<{
    kind: MarkKind;
    placement: MarkPlacement;
    color: MarkColor;
    seed: number;
  }>;
  accessories: Array<{
    id: string;
    customSvg?: string;
    origin: string;
  }>;
  expression: {
    mouthCurve: number;
    eyeTilt: number;
    cheekAlways: boolean;
  };
  story: string;
  /** Overrides manuais do user via /mascot-editor. Aplicados depois do IA. */
  userOverrides?: {
    bodyHue?: number;
    accentSaturation?: number;
    markCount?: number;
    disabledAccessories?: string[];
  };
}

export interface Checkin {
  id: string;
  user_id: string;
  habit_kind: HabitKind;
  value: number | null;
  unit: string | null;
  occurred_on: string;
  occurred_at: string;
  xp_awarded: number;
  idempotency_key: string;
  created_at: string;
}

export interface Mission {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  habit_kind: HabitKind;
  target_value: number | null;
  xp_reward: number;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'expired';
  scheduled_for: string;
  completed_at: string | null;
  created_at: string;
  /**
   * ID do template original que originou esta missão (catálogo). Necessário pra
   * alimentar o bandit ML quando a missão é concluída/skipada. Pode ser null
   * em missões legadas (criadas antes do bandit) — nesse caso o bandit ignora.
   */
  template_id?: string | null;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  grace_days_left: number;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'mascot' | 'system';
  content: string;
  safety_flag: SafetyFlag;
  cached: boolean;
  created_at: string;
}

export interface XpEvent {
  id: string;
  user_id: string;
  amount: number;
  reason: 'checkin' | 'mission' | 'streak_bonus' | 'first_login' | 'manual_adjust' | 'achievement' | 'minigame';
  reference: Record<string, unknown> | null;
  created_at: string;
}

export interface OwnedAccessory {
  user_id: string;
  accessory_id: string;
  equipped: boolean;
  unlocked_at: string;
}

export interface OwnedScene {
  user_id: string;
  scene_id: string;
  active: boolean;
  unlocked_at: string;
}

export interface Achievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export type ThemeMode = 'light' | 'dark' | 'sepia' | 'system';

export type BrandPaletteId = 'classic' | 'sunset' | 'peach' | 'coral' | 'sun';

export interface Settings {
  user_id: string;
  theme_mode: ThemeMode;
  brand_palette: BrandPaletteId;
  dynamic_text: boolean;
  reduce_motion: boolean;
  high_contrast: boolean;
  push_enabled: boolean;
  quiet_start: string; // "22:00"
  quiet_end: string; // "08:00"
  paused_until: string | null;
  language: string;
  consent_analytics: boolean;
  tour_completed: boolean;
  /**
   * Quando true, weekly snapshot automático fica desabilitado.
   * Default false (snapshots criados automaticamente — Frente U).
   * Aparece em /atelier/settings (Frente V).
   */
  atelier_disable_weekly_snapshot?: boolean;
  /** Sons curtos de recompensa (jingles procedurais). Default true. */
  sfx_enabled?: boolean;
}

export interface InAppNotification {
  id: string;
  user_id: string;
  kind: 'reminder' | 'streak_at_risk' | 'evolution' | 'level_up' | 'mission_new' | 'weekly_report' | 'birthday' | 'seasonal' | 'safety' | 'journey';
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface Wallet {
  user_id: string;
  coins: number;
  gems: number;
  updated_at: string;
}

export interface DailyReward {
  user_id: string;
  // último resgate da sequência D1..D7
  last_claimed_date: string | null;
  current_day: number; // 1..7
  updated_at: string;
}

export interface MysteryBox {
  user_id: string;
  last_opened_date: string | null;
  /** Total de caixas abertas pela vida toda (usado por paywall triggers). */
  total_opened?: number;
  updated_at: string;
}

export interface Combo {
  user_id: string;
  current: number; // 1..5
  last_action_at: string | null;
  updated_at: string;
}

/** Padrão corporal aplicado via shader pelo renderer. */
export type BodyPattern = 'plain' | 'stripes' | 'spots' | 'fractal' | 'cells';

/**
 * Overrides morfológicos aplicados PELO USUÁRIO sobre a morfologia
 * derivada do DNA (Sims/Spore-like customization).
 *
 * **Princípio inviolável**: cada multiplicador é clampado em [0.7, 1.3] —
 * usuário INFLUENCIA mas não DESTRÓI a identidade genética. DNA bruto
 * permanece intocável; overrides aplicam em runtime via `applyCustomization`.
 */
export interface MascotCustomization {
  user_id: string;
  /** Multiplicador no tamanho dos olhos. Cap [0.7, 1.3]. */
  eye_size: number;
  /** Multiplicador na distância entre os olhos. Cap [0.7, 1.3]. */
  eye_spread: number;
  /** Multiplicador na altura do corpo. Cap [0.7, 1.3]. */
  body_height: number;
  /** Multiplicador na largura do corpo. Cap [0.7, 1.3]. */
  body_width: number;
  /** Multiplicador na intensidade da aura (opacity + tamanho). Cap [0.7, 1.3]. */
  aura_intensity: number;
  /** Multiplicador na densidade de padrões corporais. Cap [0.7, 1.3]. */
  pattern_density: number;
  /** Padrão preferido — sobrescreve o desbloqueado por mutação. */
  preferred_pattern: BodyPattern;
  /**
   * Inclinação postural (radianos). Cap [-0.2, 0.2]. Negativo = pra frente
   * (pensativo/triste), positivo = pra trás (orgulhoso/empolgado).
   */
  posture_lean: number;
  /** Esconde cauda mesmo se DNA habilita. Default false (segue DNA). */
  force_hide_tail: boolean;
  /** Esconde antenas mesmo se DNA habilita. Default false. */
  force_hide_antennae: boolean;
  /** Esconde espinhos mesmo se DNA habilita. Default false. */
  force_hide_spikes: boolean;
  updated_at: string;
}
