/**
 * AccessibilityButton — botão grande com label + ícone + role/state corretos.
 * Use para CTAs em telas críticas (settings/onboarding/paywall) onde
 * touch target e label de acessibilidade importam.
 */
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { Icon, type IconName } from '@/components/Icon';
import { Typography } from './Typography';

interface Props {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** A11y: state.disabled / state.selected. */
  selected?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  /** Override de label para a11y (default: usa label). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function AccessibilityButton({
  label,
  onPress,
  icon,
  selected,
  disabled,
  variant = 'primary',
  style,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.base,
        {
          minHeight: 56,
          backgroundColor: isPrimary ? theme.colors.primary : theme.colors.surface,
          borderColor: isPrimary ? theme.colors.primary : theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={20}
          color={isPrimary ? theme.tokens.semantic.inkOnBrand : theme.colors.text}
          strokeWidth={2}
        />
      ) : null}
      <Typography
        variant="bodyBold"
        style={{ color: isPrimary ? theme.tokens.semantic.inkOnBrand : theme.colors.text }}
      >
        {label}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
