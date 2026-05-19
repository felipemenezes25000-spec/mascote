/**
 * Voz procedural — types.
 *
 * Cada criatura tem voz **única** derivada do DNA. Não é text-to-speech
 * (caro + DNA não pode sair do device); é **micro-vocalização sintetizada**
 * estilo Sims/Animal Crossing — notas curtas moduladas pelos genes,
 * disparadas em eventos (greet, react, mood-change, mutation-unlock).
 *
 * **Princípios invioláveis**:
 *  - Voz NUNCA é fala real — só tons modulados. Evita falsa promessa de TTS.
 *  - Voz NUNCA expõe DNA — passa por `voiceProfileFromGenome`, nunca os
 *    valores brutos chegam ao DOM.
 *  - Player no-op silencioso se Web Audio não disponível (RN nativo sem
 *    expo-av wireado) — nunca crasha.
 *  - Volume sempre <= 0.2 — voz é ambient, não notificação invasiva.
 */

/**
 * Perfil de voz derivado do DNA. Inteiramente puro/determinístico.
 * Mesma genome → mesmo perfil → mesma voz sempre.
 */
export interface VoiceProfile {
  /** Frequência fundamental em Hz. 140-380 (baixa = grave/calmo). */
  baseFreq: number;
  /** Modulação de freq (LFO). 0 = nota pura; 1 = trêmula. */
  vibrato: number;
  /** Brilho do timbre. 0 = sine pura; 1 = sawtooth aguda. */
  brightness: number;
  /** Duração de cada nota em segundos. 0.1-0.4. */
  decay: number;
  /** Escala em semitons sobre baseFreq. Define a "melodia" da phrase. */
  scale: readonly number[];
  /** Número de notas por phrase. 2-5. */
  syllables: number;
  /** Espaçamento entre notas (s). Menor = staccato; maior = lento. */
  noteSpacing: number;
}

/**
 * Tipo de linha vocal — modula intensity + intent semântico.
 * Caller dispara via `playVoiceLine(profile, { kind, emotion })`.
 */
export interface VoiceLine {
  kind: 'greet' | 'react' | 'curious' | 'sleepy' | 'celebrate' | 'attention';
  /** Intensidade emocional [0, 1] — escala volume + andamento. */
  emotion: number;
}

/**
 * Identidade do canal de áudio — útil pra rastrear/silenciar voices ativas.
 */
export interface VoiceHandle {
  /** ID único da reprodução (timestamp + random). */
  id: string;
  /** Promise que resolve quando termina (ou cancelada). */
  done: Promise<void>;
}
