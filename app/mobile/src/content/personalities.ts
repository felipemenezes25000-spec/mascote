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
    tagline: 'Para quem busca pausa, sono e respiração.',
    description: 'Voz baixa, fala devagar. Foca em respiração, sono, pausas, silêncio, natureza.',
    primaryColor: theme.colors.sage,
    accentColor: theme.colors.sageDeep,
    greeting: 'Vamos respirar um pouco? Você não precisa resolver tudo agora.',
    voice: 'sereno, gentil, protetor',
    bestFor: ['Sono', 'Meditação', 'Pausa', 'Journaling'],
  },
  {
    id: 'motivador',
    label: 'Motivador',
    mascotName: 'Zip',
    tagline: 'Para quem quer rotina, foco e movimento.',
    description: 'Objetivo, otimista, celebra cada conquista pequena. Sem "vamoooo".',
    primaryColor: theme.colors.primary,
    accentColor: theme.colors.primaryDeep,
    greeting: 'Um passo pequeno hoje ainda conta. Bora fazer a missão?',
    voice: 'animado, confiante, encorajador',
    bestFor: ['Exercício', 'Foco', 'Hidratação', 'Organização'],
  },
  {
    id: 'fofo',
    label: 'Fofo',
    mascotName: 'Lulu',
    tagline: 'Para quem quer presença, carinho e leveza.',
    description: 'Doce, próximo. Bons emojis. Acolhe sem segurar.',
    primaryColor: theme.colors.coral,
    accentColor: theme.colors.coralDeep,
    greeting: 'Que bom que você voltou. Eu queria saber como foi seu dia.',
    voice: 'doce, afetuoso, companheiro',
    bestFor: ['Gratidão', 'Vitórias', 'Vínculo', 'Humor'],
  },
  {
    id: 'sabio',
    label: 'Sábio',
    mascotName: 'Aro',
    tagline: 'Para quem busca reflexão, leitura e autoconhecimento.',
    description: 'Pensativo, elegante. Mentor antigo. Pergunta antes de aconselhar.',
    primaryColor: theme.colors.lilac,
    accentColor: theme.colors.lilacDeep,
    greeting: 'O que hoje te ensinou sobre você?',
    voice: 'maduro, reflexivo, calmo',
    bestFor: ['Leitura', 'Reflexão', 'Journaling', 'Espiritualidade'],
  },
];

export function getPersonality(id: Personality): PersonalityMeta {
  return personalities.find(p => p.id === id) ?? personalities[0];
}
