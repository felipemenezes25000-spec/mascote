export * from './MascotAI';
// PromptBuilder.buildMascotPrompt foi REMOVIDO (concatenava userMessage cru no
// system prompt — vetor de prompt injection + bypass das regras de wellness).
// Construção de prompt é só via `buildMascotSystemPrompt` em lib/ai.ts, que
// separa roles user/system. Não reintroduzir um builder que concatene input cru.
export * from './SafetyRules';
export * from './LocalFallbackAI';
export * from './MissionGeneratorAI';
export * from './EmotionalMemory';
export { checkAiRateLimit, recordAiUsage, resetAiUsage } from './AIRateLimiter';
export { checkAiCostBudget, recordAiCost, resetAiCost } from './AICostGuard';
export { validateAiResponse, toAiResponse } from './AIResponseValidator';
export { buildPersonalityVoice, applyPersonalityVoice } from './PersonalityVoice';
