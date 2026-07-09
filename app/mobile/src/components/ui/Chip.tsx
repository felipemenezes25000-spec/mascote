/**
 * Chip — toggleable tag pill (selected/unselected) ou link.
 * Diferente do `Badge` (estático), Chip é interativo e tem estado.
 */
import { Pressable, StyleSheet, type AccessibilityRole, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { Typography } from './Typography';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: ViewStyle;
  /**
   * Papel de acessibilidade. Default 'button'. Grupos de escolha única
   * (dentro de um container `radiogroup`) devem passar 'radio' pra que o
   * leitor de tela anuncie posição no conjunto + estado selecionado.
   */
  accessibilityRole?: AccessibilityRole;
}

export function Chip({ label, selected, onPress, leading, trailing, style, accessibilityRole = 'button' }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ selected }}
      // hitSlop 8 estende alvo de toque pra ~44x44 mesmo em chips compactos
      // (padding 12x6 + caption ~16 = ~28px de altura visual). Sem o slop, o
      // alvo real é menor que a recomendação WCAG/Apple HIG.
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.base,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.pill,
        },
        style,
      ]}
    >
      {leading}
      <Typography
        variant="caption"
        style={{
          color: selected ? theme.tokens.semantic.inkOnBrand : theme.colors.text,
          fontWeight: '700',
        }}
      >
        {label}
      </Typography>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
});
