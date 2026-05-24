/**
 * Barrel do package `lib/db`. Importadores podem fazer:
 *
 *   import { profiles, mascots, settings, withLock } from '@/lib/db';
 *
 * Cada subdomínio é um módulo dedicado em `lib/db/<domain>.ts`. Esse arquivo
 * só faz re-export — não defina lógica aqui.
 */

export { withLock } from './internal';
export {
  CURRENT_SCHEMA_VERSION,
  type DbMeta,
  readMeta,
  runMigrations,
} from './migrations';
export { todayLocal, dateLocal, daysBetween, addDays } from './dates';

export { profiles } from './profiles';
export { mascots } from './mascots';
export { checkins } from './checkins';
export { missions } from './missions';
export { streaks } from './streaks';
export { messages } from './messages';
export { xpEvents } from './xp-events';
export { inventory } from './inventory';
export { userScenes } from './scenes';
export { settings } from './settings';
export { achievements } from './achievements';
export { dnaMutations } from './dna-mutations';
export { customization } from './customization';
export { wallet } from './wallet';
export { mascotLife } from './mascot-life';
export { dailyReward, predictNextDailyRewardDay } from './daily-rewards';
export { mysteryBox } from './mystery-box';
export { combo, comboXpBonus } from './combo';
export { notifications } from './notifications';
export {
  resetAll,
  exportAll,
  importAll,
  type ImportResult,
} from './export-import';
