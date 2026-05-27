/**
 * ShareMascotButton — captura PNG do mascote e abre Share Sheet do SO.
 *
 * Usa react-native-view-shot pra rasterizar o componente filho (Mascot2D em
 * geral) e Share API nativa pra enviar a imagem. Funciona com qualquer app
 * que aceite imagens (Instagram, WhatsApp, Twitter, email, etc.).
 *
 * Ver spec § B.10.
 */

import { useCallback, useRef } from 'react';
import { Pressable, Share, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/lib/useTheme';
import { logger } from '@/lib/logger';

interface Props {
  /** Conteúdo a ser fotografado (geralmente Mascot2D). */
  children: React.ReactNode;
  /** Texto sugerido no Share Sheet. Algumas apps usam (WhatsApp, email). */
  caption?: string;
  /** Estilo extra do botão. */
  style?: StyleProp<ViewStyle>;
  /** Label do botão. */
  label?: string;
}

export function ShareMascotButton({ children, caption, style, label = 'Compartilhar mascote' }: Props) {
  const theme = useTheme();
  const ref = useRef<ViewShot>(null);

  const handleShare = useCallback(async () => {
    try {
      if (!ref.current?.capture) {
        logger.warn('[share-mascot] ViewShot ref sem capture');
        return;
      }
      const uri = await ref.current.capture();
      await Share.share({
        url: uri,
        message: caption ?? 'Conheça meu mascote, feito de hábitos.',
      });
    } catch (err) {
      logger.warn('[share-mascot] falha ao compartilhar', { err: String(err) });
    }
  }, [caption]);

  return (
    <View style={style}>
      <ViewShot ref={ref} options={{ format: 'png', quality: 0.95, result: 'tmpfile' }}>
        <View style={styles.shotWrap}>{children}</View>
      </ViewShot>
      <Pressable
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: pressed ? theme.colors.primaryDeep ?? theme.colors.primary : theme.colors.primary,
          },
        ]}
      >
        <Typography variant="body" style={styles.btnLabel}>{label}</Typography>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shotWrap: { alignItems: 'center', justifyContent: 'center' },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    alignSelf: 'center',
    marginTop: 12,
  },
  btnLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
