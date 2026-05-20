/**
 * Tipografia padronizada — usa tokens do theme.
 *
 * Variants:
 *  - display: hero serif gigante (welcome/onboarding)
 *  - title: editorial serif (page title)
 *  - heading: UI bold (section title)
 *  - body: corpo de leitura
 *  - bodyBold: corpo destacado
 *  - caption: labels, hints (12-13px)
 *  - mono: rótulos técnicos uppercase (10-11px)
 *
 * `tone` controla cor:
 *  - default | secondary | dim | brand | success | warning | error | inkOnBrand
 */

import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/lib/useTheme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyBold' | 'caption' | 'mono';
type Tone =
  | 'default'
  | 'secondary'
  | 'dim'
  | 'brand'
  | 'success'
  | 'warning'
  | 'error'
  | 'inkOnBrand'
  | 'inkOnDark';

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
}

export function Typography({
  variant = 'body',
  tone = 'default',
  align,
  style,
  children,
  ...rest
}: Props) {
  const theme = useTheme();
  const variantStyle: TextStyle = (() => {
    switch (variant) {
      case 'display':
        return { ...theme.text.h1, fontSize: theme.text.h1.fontSize * 1.15 };
      case 'title':
        return theme.text.h1 as TextStyle;
      case 'heading':
        return theme.text.h3 as TextStyle;
      case 'body':
        return theme.text.body as TextStyle;
      case 'bodyBold':
        return theme.text.bodyBold as TextStyle;
      case 'caption':
        return theme.text.sm as TextStyle;
      case 'mono':
        return theme.text.xs as TextStyle;
    }
  })();
  const color = ((): string => {
    switch (tone) {
      case 'default':
        return theme.colors.text;
      case 'secondary':
        return theme.colors.textSecondary;
      case 'dim':
        return theme.colors.textDim;
      case 'brand':
        return theme.colors.primary;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      case 'inkOnBrand':
        return theme.tokens.semantic.inkOnBrand;
      case 'inkOnDark':
        return theme.tokens.semantic.inkOnDark;
    }
  })();
  return (
    <Text
      {...rest}
      style={[variantStyle, { color, textAlign: align }, style]}
    >
      {children}
    </Text>
  );
}
