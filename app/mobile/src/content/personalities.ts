import { theme } from '@/theme';
import type { Personality } from '@/types';

export interface PersonalityMeta {
  id: Personality;
  label: string;       // nome do tipo ("Calmo")
  mascotName: string;  // nome do mascote oficial ("Bipo")
  tagline: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  greeting: string;
  voice: string;
  bestFor: string[];
}

export const personalities: PersonalityMeta[] = [
  {
    id: 'calmo',
    label: 'Calmo',
    mascotName: 'Bipo',
    tagline: 'Presença que não corre.',
    description: 'Voz baixa, fala devagar. Foca em respiração, sono, pausas, silêncio, natureza.',
    primaryColor: theme.colors.sage,
    accentColor: theme.colors.sageDeep,
    greeting: 'Eu fico contigo agora. Sem pressa.',
    voice: 'sereno, gentil, protetor',
    bestFor: ['Sono', 'Respiração', 'Pausa'],
  },
  {
    id: 'motivador',
    label: 'Motivador',
    mascotName: 'Zip',
    tagline: 'Energia que não bate.',
    description: 'Objetivo, otimista, celebra cada conquista pequena. Sem "vamoooo".',
    primaryColor: theme.colors.primary,
    accentColor: theme.colors.primaryDeep,
    greeting: 'Bora junto. Um passo só.',
    voice: 'animado, confiante, encorajador',
    bestFor: ['Exercício', 'Foco', 'Hidratação'],
  },
  {
    id: 'fofo',
    label: 'Companheira',
    mascotName: 'Lulu',
    tagline: 'Carinho que escuta.',
    description: 'Doce, próxima. Bons emojis. Acolhe sem segurar.',
    primaryColor: theme.colors.coral,
    accentColor: theme.colors.coralDeep,
    greeting: 'Que bom te ver. Conta pra mim.',
    voice: 'doce, afetuosa, companheira',
    bestFor: ['Diário', 'Gratidão', 'Conexão'],
  },
  {
    id: 'sabio',
    label: 'Sábio',
    mascotName: 'Aro',
    tagline: 'Pergunta que ilumina.',
    description: 'Pensativo, elegante. Mentor antigo. Pergunta antes de aconselhar.',
    primaryColor: theme.colors.lilac,
    accentColor: theme.colors.lilacDeep,
    greeting: 'O que tá vivo em você hoje?',
    voice: 'maduro, reflexivo, calmo',
    bestFor: ['Reflexão', 'Leitura', 'Intenção'],
  },
];

export function getPersonality(id: Personality): PersonalityMeta {
  return personalities.find(p => p.id === id) ?? personalities[0];
}
