import type { HabitKind, Personality } from '@/types';
import { extendedMissionCatalog } from './missions-extended';

export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  habit_kind: HabitKind;
  target_value: number | null;
  xp_reward: number;
  preferred_personalities: Personality[];
}

export const missionCatalog: MissionTemplate[] = [
  // água (8)
  { id: 'm-water-1', title: 'Bebe 2 copos de água', description: 'Pequeno gesto, grande efeito. 2 copos até as 11h.', habit_kind: 'water', target_value: 2, xp_reward: 15, preferred_personalities: ['motivador', 'fofo'] },
  { id: 'm-water-2', title: 'Garrafa cheia ao lado', description: 'Deixa visível. Lembrar fica fácil.', habit_kind: 'water', target_value: null, xp_reward: 10, preferred_personalities: ['sabio'] },
  { id: 'm-water-3', title: 'Água antes do café', description: 'Um copo antes da primeira cafeína.', habit_kind: 'water', target_value: 1, xp_reward: 10, preferred_personalities: ['calmo', 'sabio'] },
  { id: 'm-water-4', title: 'Hidratação completa hoje', description: '6 copos espalhados pelo dia.', habit_kind: 'water', target_value: 6, xp_reward: 25, preferred_personalities: ['motivador'] },
  { id: 'm-water-5', title: 'Água com limão', description: 'Versão fancy. Faz uma vez.', habit_kind: 'water', target_value: 1, xp_reward: 15, preferred_personalities: ['fofo'] },
  { id: 'm-water-6', title: 'Garrafa que viaja', description: 'Hoje a garrafa vai com você pra todo lado.', habit_kind: 'water', target_value: null, xp_reward: 15, preferred_personalities: ['motivador', 'sabio'] },
  // sono (7)
  { id: 'm-sleep-1', title: 'Tela longe da cama hoje', description: '15 minutos antes de dormir, sem celular.', habit_kind: 'sleep', target_value: null, xp_reward: 25, preferred_personalities: ['calmo', 'sabio'] },
  { id: 'm-sleep-2', title: 'Cama antes da meia-noite', description: 'Só hoje. Vai fazer diferença.', habit_kind: 'sleep', target_value: null, xp_reward: 25, preferred_personalities: ['motivador'] },
  { id: 'm-sleep-3', title: 'Anota a hora que dormiu', description: 'Só pra começar a notar padrão.', habit_kind: 'sleep', target_value: 1, xp_reward: 10, preferred_personalities: ['sabio'] },
  { id: 'm-sleep-4', title: 'Quarto bem escuro', description: 'Cortina fechada, luz baixa, devagar.', habit_kind: 'sleep', target_value: null, xp_reward: 15, preferred_personalities: ['calmo', 'fofo'] },
  { id: 'm-sleep-5', title: '8 horas como meta', description: 'Conta de trás pra frente do horário que precisa acordar.', habit_kind: 'sleep', target_value: 8, xp_reward: 25, preferred_personalities: ['motivador', 'sabio'] },
  { id: 'm-sleep-6', title: 'Sem cochilo longo hoje', description: 'Cochilo de 20min cabe. Mais de 1h estraga a noite.', habit_kind: 'sleep', target_value: null, xp_reward: 15, preferred_personalities: ['sabio'] },
  { id: 'm-sleep-7', title: 'Pijama confortável', description: 'Roupa boa de dormir já ajuda.', habit_kind: 'sleep', target_value: null, xp_reward: 10, preferred_personalities: ['fofo'] },
  // respiração (6)
  { id: 'm-breath-1', title: 'Respira fundo 3 vezes', description: 'Pausa de 60 segundos pra respirar.', habit_kind: 'breath', target_value: 3, xp_reward: 15, preferred_personalities: ['calmo', 'fofo'] },
  { id: 'm-breath-2', title: '4-7-8 antes de dormir', description: 'Inspira 4s, segura 7s, expira 8s. 3 vezes.', habit_kind: 'breath', target_value: 3, xp_reward: 25, preferred_personalities: ['calmo'] },
  { id: 'm-breath-3', title: 'Respiração da caixa', description: '4 segundos pra cada fase. 5 ciclos.', habit_kind: 'breath', target_value: 5, xp_reward: 25, preferred_personalities: ['sabio', 'calmo'] },
  { id: 'm-breath-4', title: 'Respira no semáforo', description: 'Próximo trânsito ou fila: 3 respiradas.', habit_kind: 'breath', target_value: 3, xp_reward: 10, preferred_personalities: ['motivador'] },
  { id: 'm-breath-5', title: 'Ar pela narina, calor pela boca', description: 'Inspira por 5s pelo nariz, expira lento pela boca.', habit_kind: 'breath', target_value: 3, xp_reward: 15, preferred_personalities: ['calmo'] },
  { id: 'm-breath-6', title: 'Suspiro consciente', description: 'Um suspiro grande, soltando o que tava preso.', habit_kind: 'breath', target_value: 1, xp_reward: 10, preferred_personalities: ['fofo', 'sabio'] },
  // exercício (8)
  { id: 'm-exercise-1', title: 'Caminhada de 10 minutos', description: 'Pode ser quarteirão. Pode ser do quarto à cozinha em loop.', habit_kind: 'exercise', target_value: 10, xp_reward: 25, preferred_personalities: ['motivador'] },
  { id: 'm-exercise-2', title: 'Alongar por 3 minutos', description: 'Levanta, estica braços e coluna.', habit_kind: 'exercise', target_value: 3, xp_reward: 15, preferred_personalities: ['fofo', 'calmo'] },
  { id: 'm-exercise-3', title: '20 polichinelos', description: 'Em casa mesmo. Levanta o corpo.', habit_kind: 'exercise', target_value: 20, xp_reward: 15, preferred_personalities: ['motivador'] },
  { id: 'm-exercise-4', title: '5 saudações ao sol', description: 'Sequência de yoga curtinha.', habit_kind: 'exercise', target_value: 5, xp_reward: 25, preferred_personalities: ['calmo', 'sabio'] },
  { id: 'm-exercise-5', title: 'Sobe escada uma vez', description: 'Em vez do elevador. Conta.', habit_kind: 'exercise', target_value: 1, xp_reward: 10, preferred_personalities: ['motivador'] },
  { id: 'm-exercise-6', title: 'Caminhada de 30 minutos', description: 'Sem destino, só pra respirar fora.', habit_kind: 'exercise', target_value: 30, xp_reward: 40, preferred_personalities: ['motivador', 'sabio'] },
  { id: 'm-exercise-7', title: 'Dança 3 músicas', description: 'Na sala, no quarto. Vergonha não conta.', habit_kind: 'exercise', target_value: 10, xp_reward: 25, preferred_personalities: ['fofo'] },
  { id: 'm-exercise-8', title: 'Movimenta as articulações', description: 'Pescoço, ombros, quadril, tornozelo. Devagar.', habit_kind: 'exercise', target_value: 5, xp_reward: 15, preferred_personalities: ['calmo'] },
  // meditação (6)
  { id: 'm-meditation-1', title: 'Silêncio de 5 minutos', description: 'Senta. Fecha os olhos. Não precisa "esvaziar a mente".', habit_kind: 'meditation', target_value: 5, xp_reward: 25, preferred_personalities: ['calmo', 'sabio'] },
  { id: 'm-meditation-2', title: 'Body scan', description: 'Atenção do dedão do pé até o topo da cabeça. 10 min.', habit_kind: 'meditation', target_value: 10, xp_reward: 40, preferred_personalities: ['calmo'] },
  { id: 'm-meditation-3', title: '1 minuto de presença', description: 'Olha em volta com calma. Nome do que vê.', habit_kind: 'meditation', target_value: 1, xp_reward: 10, preferred_personalities: ['fofo', 'sabio'] },
  { id: 'm-meditation-4', title: 'Meditação guiada qualquer', description: 'YouTube ou Spotify, 5-10 min.', habit_kind: 'meditation', target_value: 5, xp_reward: 25, preferred_personalities: ['motivador'] },
  { id: 'm-meditation-5', title: 'Escuta o som ao redor', description: '2 minutos só notando sons. Sem julgar.', habit_kind: 'meditation', target_value: 2, xp_reward: 15, preferred_personalities: ['sabio'] },
  { id: 'm-meditation-6', title: 'Atenção no chá', description: 'Faz um chá. Sente o cheiro. Toma sem celular.', habit_kind: 'meditation', target_value: 5, xp_reward: 25, preferred_personalities: ['fofo', 'calmo'] },
  // leitura (5)
  { id: 'm-reading-1', title: 'Lê 1 página', description: 'Qualquer livro. Uma página. Hoje.', habit_kind: 'reading', target_value: 1, xp_reward: 15, preferred_personalities: ['sabio'] },
  { id: 'm-reading-2', title: 'Lê 5 páginas', description: 'Sem celular por perto. 5 páginas.', habit_kind: 'reading', target_value: 5, xp_reward: 25, preferred_personalities: ['sabio'] },
  { id: 'm-reading-3', title: 'Artigo curto que te interessa', description: 'Não tudo. Um.', habit_kind: 'reading', target_value: 1, xp_reward: 15, preferred_personalities: ['sabio', 'motivador'] },
  { id: 'm-reading-4', title: 'Poesia em voz alta', description: 'Lê um poema em voz alta. Pra você.', habit_kind: 'reading', target_value: 1, xp_reward: 15, preferred_personalities: ['fofo', 'sabio'] },
  { id: 'm-reading-5', title: '15 minutos sem rolar feed', description: 'Livro ou nada. Mas sem feed.', habit_kind: 'reading', target_value: 15, xp_reward: 25, preferred_personalities: ['sabio'] },
  // journaling / gratidão (6)
  { id: 'm-journal-1', title: 'Anota uma coisa boa', description: 'Uma coisa que aconteceu hoje. Curtinha.', habit_kind: 'journaling', target_value: 1, xp_reward: 15, preferred_personalities: ['fofo', 'sabio'] },
  { id: 'm-journal-2', title: 'O que cuidou de você hoje?', description: 'Anota a resposta. Uma frase basta.', habit_kind: 'journaling', target_value: 1, xp_reward: 25, preferred_personalities: ['sabio'] },
  { id: 'm-journal-3', title: '3 coisas pelas quais sou grato', description: 'Pode ser bobas. Vale a soma.', habit_kind: 'journaling', target_value: 3, xp_reward: 25, preferred_personalities: ['fofo'] },
  { id: 'm-journal-4', title: 'O sentimento principal de hoje', description: 'Em uma palavra. Anota.', habit_kind: 'journaling', target_value: 1, xp_reward: 15, preferred_personalities: ['calmo', 'sabio'] },
  { id: 'm-journal-5', title: 'Carta pra mim mesmo daqui um ano', description: 'Algumas linhas. O que quero lembrar?', habit_kind: 'journaling', target_value: 1, xp_reward: 40, preferred_personalities: ['sabio'] },
  { id: 'm-journal-6', title: 'O melhor momento do dia', description: 'Mesmo que pequeno. Vale anotar.', habit_kind: 'journaling', target_value: 1, xp_reward: 15, preferred_personalities: ['fofo'] },
  // outdoor (5)
  { id: 'm-outdoor-1', title: 'Olha pelo lado de fora 1 minuto', description: 'Janela, varanda, porta. Só olha.', habit_kind: 'outdoor', target_value: 1, xp_reward: 10, preferred_personalities: ['calmo', 'fofo'] },
  { id: 'm-outdoor-2', title: 'Caminha até a esquina', description: 'Sem destino. Volta quando quiser.', habit_kind: 'outdoor', target_value: null, xp_reward: 25, preferred_personalities: ['motivador'] },
  { id: 'm-outdoor-3', title: 'Sai pra comprar algo simples', description: 'Pão, banana, água. Movimento.', habit_kind: 'outdoor', target_value: null, xp_reward: 15, preferred_personalities: ['motivador'] },
  { id: 'm-outdoor-4', title: '15 minutos em parque ou praça', description: 'Mesmo que sentado.', habit_kind: 'outdoor', target_value: 15, xp_reward: 25, preferred_personalities: ['calmo', 'sabio'] },
  { id: 'm-outdoor-5', title: 'Toca terra/grama', description: 'Pé descalço por 1 minuto.', habit_kind: 'outdoor', target_value: 1, xp_reward: 15, preferred_personalities: ['fofo', 'sabio'] },
  // sol (4)
  { id: 'm-sun-1', title: '5 minutos de sol no rosto', description: 'Manhã ou tarde. No quintal, varanda, janela.', habit_kind: 'sun', target_value: 5, xp_reward: 15, preferred_personalities: ['fofo', 'calmo'] },
  { id: 'm-sun-2', title: 'Sol da manhã', description: 'Antes das 10h, 10 minutos.', habit_kind: 'sun', target_value: 10, xp_reward: 25, preferred_personalities: ['motivador'] },
  { id: 'm-sun-3', title: 'Pôr-do-sol consciente', description: 'Para por 5 min e observa.', habit_kind: 'sun', target_value: 5, xp_reward: 15, preferred_personalities: ['sabio'] },
  { id: 'm-sun-4', title: 'Vitamina D natural', description: '15min com braços expostos no sol.', habit_kind: 'sun', target_value: 15, xp_reward: 25, preferred_personalities: ['motivador'] },
];

/** Catálogo completo: base + expandido (150+ missões). */
export const fullMissionCatalog: MissionTemplate[] = [
  ...missionCatalog,
  ...extendedMissionCatalog.filter(e => !missionCatalog.some(m => m.id === e.id)),
];

// Hash determinístico para uma string. Usado para gerar seed estável que
// rotaciona missões sem colisões previsíveis entre meses.
function djb2(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Escolhe a missão diária:
 * - `dateKey` é uma string única por dia (ex.: '2026-05-18'). Hashada para
 *   evitar colisões previsíveis quando seed era day+month.
 * - Aceita number legado para retrocompat (será convertido).
 */
export function pickDailyMission(
  personality: Personality,
  dateKey: string | number
): MissionTemplate {
  const preferred = fullMissionCatalog.filter(m => m.preferred_personalities.includes(personality));
  /* v8 ignore next — todos as personalities têm missions preferidas no
     catálogo atual; fallback ao catálogo completo cobre extensão futura. */
  const pool = preferred.length > 0 ? preferred : fullMissionCatalog;
  const seed = typeof dateKey === 'string' ? djb2(`${personality}:${dateKey}`) : dateKey;
  return pool[seed % pool.length];
}

export const habitMeta: Record<HabitKind, { label: string; emoji: string; xp: number }> = {
  water: { label: 'Bebi água', emoji: '💧', xp: 10 },
  sleep: { label: 'Dormi bem', emoji: '💤', xp: 10 },
  exercise: { label: 'Movimento', emoji: '🚶', xp: 10 },
  meditation: { label: 'Meditei', emoji: '🧘', xp: 10 },
  reading: { label: 'Li algo', emoji: '📖', xp: 10 },
  journaling: { label: 'Escrevi', emoji: '✍️', xp: 10 },
  breath: { label: 'Respirei', emoji: '🌬️', xp: 10 },
  outdoor: { label: 'Saí um pouco', emoji: '🌳', xp: 10 },
  sun: { label: 'Sol no rosto', emoji: '☀️', xp: 10 },
};
