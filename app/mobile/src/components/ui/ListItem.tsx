/**
 * ListItem — linha clicável com title + description + accessory (right).
 * Padrão usado em settings, profile, listas de configuração.
 */
import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Typography } from './Typography';

interface Props {
  title: string;
  description?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function ListItem({
  title,
  description,
  leading,
  trailing,
  onPress,
  destructive,
  disabled,
  style,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const titleColor = destructive ? theme.colors.error : theme.colors.text;
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.row,
        pressed && styles.pressed,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <Typography style={{ color: titleColor }} variant="bodyBold">{title}</Typography>
        {description ? <Typography variant="caption" tone="secondary">{description}</Typography> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Wrapper>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
    },
    pressed: { backgroundColor: theme.colors.bg2 },
    leading: {},
    trailing: { marginLeft: 'auto' },
    body: { flex: 1, gap: 2 },
  });
}
