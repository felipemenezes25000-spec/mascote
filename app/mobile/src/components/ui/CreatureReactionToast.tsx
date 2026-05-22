/**
 * CreatureReactionToast — toast estilizado com presença do mascote.
 *
 * Quando o mascote "reage" a uma ação (mutação desbloqueada, missão completa,
 * memória salva), em vez de Toast genérico do sistema, este componente entrega
 * uma reação que parece vinda DO mascote. Estilo orgânico, paleta DNA-aware,
 * sem hex hardcoded.
 *
 * Uso típico — em conjunto com CreatureMomentService:
 *   creatureMoments.on('mutation.unlocked', (m) => {
 *     showReactionToast({ icon: '✨', message: 'Bipo ganhou olhar mais profundo' });
 *   });
 *
 * Este componente é PURE (render only). O orquestrador (queue, timeout,
 * dismiss) é externo — facilita testar e portar entre filas de toast distintas.
 */

import { View, type ViewStyle } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '@/lib/useTheme';

export type ReactionKind = 'celebrate' | 'gentle' | 'memory' | 'milestone';

export interface CreatureReactionToastProps {
  /** Texto principal — curto, < 60 chars (limite UX). */
  message: string;
  /** Texto secundário opcional. */
  hint?: string;
  /** Ícone/emoji curtinho à esquerda. */
  icon?: string;
  /** Categoria — afeta cor/tom (não hex hardcoded). */
  kind?: ReactionKind;
  /** Acessibilidade. */
  accessibilityLabel?: string;
  style?: ViewStyle;
  testID?: string;
}

export function CreatureReactionToast({
  message,
  hint,
  icon,
  kind = 'gentle',
  accessibilityLabel,
  style,
  testID,
}: CreatureReactionToastProps) {
  const theme = useTheme();
  const accent = accentForKind(kind, theme);

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel ?? message}
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderColor: accent,
          borderWidth: 1.5,
          borderRadius: theme.radius.lg,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          gap: theme.spacing.sm,
          ...theme.shadow.md,
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityElementsHidden
        >
          <Typography variant="heading" align="center">{icon}</Typography>
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Typography variant="bodyBold" numberOfLines={2}>
          {message}
        </Typography>
        {hint ? (
          <Typography variant="caption" tone="secondary" numberOfLines={2}>
            {hint}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}

function accentForKind(kind: ReactionKind, theme: ReturnType<typeof useTheme>): string {
  // FIXED colors (sage, gold, lilac, coral) já estão spreadados em theme.colors.
  // primary é o brand atual da paleta selecionada.
  switch (kind) {
    case 'celebrate':  return theme.colors.primary;
    case 'milestone':  return theme.colors.gold;
    case 'memory':     return theme.colors.lilac;
    case 'gentle':
    default:           return theme.colors.sage;
  }
}
