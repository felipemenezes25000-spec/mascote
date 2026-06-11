/**
 * Catálogo de eventos analíticos do Mascote.
 *
 * Princípios:
 *  - Nomes em snake_case curto (compatível com Firebase/Mixpanel/PostHog).
 *  - Props têm tipos explícitos — nada de `any`. Cada evento conhece o seu shape.
 *  - Nenhum dado pessoal direto (PII). user_id é hash anônimo (o repo já faz).
 *
 * **Eventos cobertos** (D1/D7/D30 + 5 pilares de assinatura):
 *  - Onboarding, mascote, engajamento, monetização
 *  - checkin_completed, mascot_gesture (Pilar 1–2)
 *  - ai_reply_* (Pilar 3)
 *  - weekly_report_viewed (Pilar 4)
 *  - subscription_cancelled / subscription_restored (Pilar 5)
 */

export const ANALYTICS_EVENTS = {
  onboarding_started: 'onboarding_started',
  onboarding_completed: 'onboarding_completed',
  mascot_created: 'mascot_created',
  first_mission_completed: 'first_mission_completed',
  first_microevolution_seen: 'first_microevolution_seen',
  mutation_unlocked: 'mutation_unlocked',
  paywall_viewed: 'paywall_viewed',
  trial_started: 'trial_started',
  purchase_completed: 'purchase_completed',
  purchase_failed: 'purchase_failed',
  mission_completed: 'mission_completed',
  streak_started: 'streak_started',
  streak_recovered: 'streak_recovered',
  weekly_report_viewed: 'weekly_report_viewed',
  app_opened: 'app_opened',
  user_returned_after_absence: 'user_returned_after_absence',
  checkin_completed: 'checkin_completed',
  mascot_gesture: 'mascot_gesture',
  ai_reply_requested: 'ai_reply_requested',
  ai_reply_succeeded: 'ai_reply_succeeded',
  ai_reply_failed: 'ai_reply_failed',
  ai_reply_rated: 'ai_reply_rated',
  subscription_cancelled: 'subscription_cancelled',
  subscription_restored: 'subscription_restored',
  journey_phase_reached: 'journey_phase_reached',
  journey_reward_claimed: 'journey_reward_claimed',
  journey_map_viewed: 'journey_map_viewed',
  forms_gallery_viewed: 'forms_gallery_viewed',
  minigame_started: 'minigame_started',
  minigame_completed: 'minigame_completed',
  mystery_box_opened: 'mystery_box_opened',
  daily_reward_claimed: 'daily_reward_claimed',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type CheckinAnalyticsPath = 'home' | 'mission' | 'breathe' | 'other';
export type AiReplySource = 'proxy' | 'byok' | 'local';
export type MascotGestureKind = 'tap' | 'double' | 'long' | 'pet';

export interface AnalyticsEventPayload {
  onboarding_started: { source?: 'install' | 'reset' };
  onboarding_completed: { duration_ms: number; steps_completed: number };
  mascot_created: { personality: string; phase: string };
  first_mission_completed: { mission_id: string; duration_ms: number };
  first_microevolution_seen: { kind: string };
  mutation_unlocked: { mutation_id: string; rarity: string };
  paywall_viewed: { trigger: string; tier_target?: string };
  trial_started: { tier: string; provider: 'mock' | 'revenuecat' };
  purchase_completed: { tier: string; provider: 'mock' | 'revenuecat' };
  purchase_failed: { tier: string; reason: string };
  mission_completed: { mission_id: string; habit_kind?: string };
  streak_started: { length: number };
  streak_recovered: { gap_days: number };
  weekly_report_viewed: { week_iso: string; tier: string };
  app_opened: { cold_start: boolean };
  user_returned_after_absence: { days_away: number };
  checkin_completed: {
    habit_kind: string;
    duration_ms: number;
    path: CheckinAnalyticsPath;
    xp_gained: number;
    phase_changed: boolean;
  };
  mascot_gesture: { kind: MascotGestureKind };
  ai_reply_requested: { source: AiReplySource; tier: string };
  ai_reply_succeeded: { source: AiReplySource; latency_ms: number; tier: string };
  ai_reply_failed: { source: AiReplySource; reason: string; tier: string };
  ai_reply_rated: { helpful: boolean; repetition: boolean };
  subscription_cancelled: { tier: string; via: 'store' | 'expiry' | 'demo' };
  subscription_restored: { tier: string; success: boolean };
  /** Uma por fase nova alcançada — funil de progressão D1/D7/D30. */
  journey_phase_reached: { phase: number; world: number };
  /** Resumo de um resgate (pode cobrir várias fases de uma vez). */
  journey_reward_claimed: {
    phases: number;
    coins: number;
    gems: number;
    /** Fases premium pendentes vistas neste claim (sinal de upsell). */
    premium_locked: number;
  };
  journey_map_viewed: { phase: number; world: number };
  forms_gallery_viewed: { form: number; world: number };
  minigame_started: { game_id: string };
  minigame_completed: {
    game_id: string;
    score: number;
    duration_ms: number;
    coins_earned: number;
    xp_earned: number;
    /** false = jogou além do cap diário (só diversão, sem recompensa). */
    rewarded: boolean;
  };
  mystery_box_opened: { total_opened: number };
  daily_reward_claimed: { day: number };
}

/** Type-safe helper: `event('mascot_created', { personality, phase })`. */
export type AnalyticsEvent = {
  [K in AnalyticsEventName]: { name: K; props: AnalyticsEventPayload[K] };
}[AnalyticsEventName];
