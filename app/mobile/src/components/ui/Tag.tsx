/**
 * Tag — etiqueta tipográfica grande (titulo categoria), diferente de Badge (sutil).
 */
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { Typography } from './Typography';

interface Props {
  label: string;
  color?: string;
  background?: string;
  style?: ViewStyle;
}

export function Tag({ label, color, background, style }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: background ?? theme.colors.primaryTint,
          borderRadius: theme.radius.sm,
        },
        style,
      ]}
    >
      <Typography variant="caption" style={{ color: color ?? theme.colors.primaryDeep, fontWeight: '700' }}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
});
