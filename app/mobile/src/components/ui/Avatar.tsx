/**
 * Avatar — círculo com inicial ou ícone, cor derivada do nome (deterministic).
 */
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { Typography } from './Typography';

interface Props {
  name: string;
  size?: number;
  /** Se passado, sobrescreve a cor de fundo derivada. */
  bg?: string;
  fg?: string;
}

function colorForName(name: string, fallback: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const palette = ['#FF8030', '#7BAE7A', '#B79FD4', '#E96B5C', '#F2C14E', '#6FA9CA'];
  return palette[hash % palette.length] ?? fallback;
}

export function Avatar({ name, size = 40, bg, fg }: Props) {
  const theme = useTheme();
  const initial = (name || '?').trim().slice(0, 1).toUpperCase();
  const backgroundColor = bg ?? colorForName(name, theme.colors.primary);
  return (
    <View
      accessibilityLabel={`Avatar de ${name}`}
      style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}
    >
      <Typography
        variant="bodyBold"
        style={{ color: fg ?? theme.tokens.semantic.inkOnBrand, fontSize: size * 0.42 }}
      >
        {initial}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
