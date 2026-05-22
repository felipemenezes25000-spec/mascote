/**
 * SectionHeader — título + subtítulo padronizado de seção.
 *
 * Sempre usa tokens de tipografia e espaçamento. NÃO aceita estilo bruto —
 * se precisar de variação, adicionar prop semântica aqui.
 *
 * Uso típico:
 *   <SectionHeader title="Memórias" subtitle="O que o seu mascote lembra" />
 */

import { View, type ViewStyle } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '@/lib/useTheme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Trailing slot (e.g. botão "Ver tudo"). */
  trailing?: React.ReactNode;
  /** Compactar vertical (use em seções aninhadas). */
  compact?: boolean;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  subtitle,
  trailing,
  compact = false,
  style,
}: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.md,
          paddingBottom: compact ? theme.spacing.xs : theme.spacing.sm,
          paddingTop: compact ? theme.spacing.sm : theme.spacing.md,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: theme.spacing.xs / 2 }}>
        <Typography variant="heading">{title}</Typography>
        {subtitle ? (
          <Typography variant="caption" tone="secondary">
            {subtitle}
          </Typography>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}
