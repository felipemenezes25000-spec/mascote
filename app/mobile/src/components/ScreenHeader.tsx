/**
 * ScreenHeader — header primitivo unificado pra telas modais e secundárias.
 *
 * Estrutura: [close/back] + Title (centered serif) + [optional action]
 *
 * Variants:
 *  - 'modal'  → botão close X à esquerda
 *  - 'back'   → botão back arrow à esquerda
 *  - 'plain'  → sem botão à esquerda (full title)
 *
 * Title usa Instrument Serif pra ar editorial. Subtitle (opcional) em italic.
 * Actions à direita: ícone SVG ou texto. Múltiplas actions com gap.
 */

import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { t } from '@/lib/i18n';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

interface Props {
  title?: string;
  subtitle?: string;
  variant?: 'modal' | 'back' | 'plain';
  /** Override do dismiss (default: router.back()). */
  onClose?: () => void;
  /** Ações no canto direito (ícones ou JSX custom). */
  rightActions?: Array<{ icon: IconName; onPress: () => void; label: string; danger?: boolean }>;
  rightSlot?: ReactNode;
  /** Border bottom hairline. Default true. */
  divider?: boolean;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  subtitle,
  variant = 'modal',
  onClose,
  rightActions,
  rightSlot,
  divider = true,
  style,
}: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();

  const handleClose = onClose ?? (() => router.back());

  return (
    <View style={[styles.row, divider && styles.divider, style]}>
      {variant !== 'plain' ? (
        <PressableScale
          onPress={handleClose}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={variant === 'back' ? t('common.back') : t('common.close')}
          hitSlop={6}
        >
          <Icon
            name={variant === 'back' ? 'arrow-left' : 'x'}
            size={18}
            color={theme.colors.text}
            strokeWidth={2}
          />
        </PressableScale>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.titleWrap}>
        {/* accessibilityRole="header" emite role=heading no DOM (RN Web) e
            anuncia como header em VoiceOver/TalkBack. QA flagrou 0 headings
            no DOM — esta é a fix base; subtítulo segue como texto comum. */}
        {title ? <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={styles.actions}>
        {rightSlot}
        {rightActions?.map((a, i) => (
          <PressableScale
            key={i}
            onPress={a.onPress}
            style={[styles.iconBtn, a.danger && styles.iconBtnDanger]}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            hitSlop={6}
          >
            <Icon
              name={a.icon}
              size={18}
              color={a.danger ? theme.colors.error : theme.colors.text}
              strokeWidth={2}
            />
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.bg,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconBtnDanger: {
      backgroundColor: theme.colors.error + '12',
      borderColor: theme.colors.error + '30',
    },
    spacer: { width: 38 },
    titleWrap: {
      flex: 1,
      alignItems: 'center',
      gap: 1,
    },
    title: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 11,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
  });
}
