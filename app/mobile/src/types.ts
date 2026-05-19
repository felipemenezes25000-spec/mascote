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
  last_seen_at: string;
  created_at: string;
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
  reason: 'checkin' | 'mission' | 'streak_bonus' | 'first_login' | 'manual_adjust' | 'achievement';
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
}

export interface InAppNotification {
  id: string;
  user_id: string;
  kind: 'reminder' | 'streak_at_risk' | 'evolution' | 'level_up' | 'mission_new' | 'weekly_report' | 'birthday' | 'seasonal' | 'safety';
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
