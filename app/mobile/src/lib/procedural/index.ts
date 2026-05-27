/**
 * Procedural — orchestrator do pipeline IA-procedural.
 *
 * Exporta API pública do módulo. Importações devem usar este index
 * (`import { ... } from '@/lib/procedural'`) em vez de arquivos internos.
 */

export {
  generateProceduralGenome,
  fallbackGenome,
  shouldRegenerate,
  type GenerateInput,
} from './generate';
export {
  validateProceduralGenome,
  ProceduralGenomeValidationError,
} from './schema';
export { sanitizeSvg, SvgSanitizationError } from './sanitizeSvg';
export {
  onPhaseChange,
  onStreakDay,
  onAchievementUnlock,
  onMessageCount,
  onOnboardingComplete,
} from './triggers';
export { hslToHex, applyUserOverrides } from './palette';
export { maybeAutoUpdateGenome, type AutoUpdateContext } from './autoUpdate';
