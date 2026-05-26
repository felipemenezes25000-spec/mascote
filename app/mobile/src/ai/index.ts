export * from './MascotAI';
// PromptBuilder NÃO é re-exportado: concatena userMessage no system prompt
// sem passar pelas regras invioláveis de wellness (vetor de prompt injection
// + bypass das regras de safety). Use `buildMascotSystemPrompt` em lib/ai.ts.
export * from './SafetyRules';
export * from './LocalFallbackAI';
export * from './MissionGeneratorAI';
export * from './EmotionalMemory';
export { checkAiRateLimit, recordAiUsage, resetAiUsage } from './AIRateLimiter';
export { checkAiCostBudget, recordAiCost, resetAiCost } from './AICostGuard';
export { validateAiResponse, toAiResponse } from './AIResponseValidator';
export { buildPersonalityVoice, applyPersonalityVoice } from './PersonalityVoice';
