/**
 * MutationCelebrationOverlay — celebracao visual quando o usuario
 * desbloqueia uma nova mutacao.
 *
 * Por que existe:
 *   O sistema procedural ja "ativa" mutacoes silenciosamente quando os
 *   genes batem o trigger. Sem feedback explicito, a evolucao do
 *   mascote vira invisivel pro usuario e perde impacto emocional.
 *
 * Design:
 *   - Overlay full-screen sobre Atelier ou Home.
 *   - Particles + glow ao redor do nome da mutacao.
 *   - Auto-dismiss em 4s OU tap pra continuar.
 *   - Vibe celebratoria, NUNCA clinica.
 *   - Sem trofeu/medalha (nao eh achievement, eh evolucao biologica).
 *
 * Principio "sem culpa": se o usuario abriu o app depois de pausar e a
 * mutacao foi destravada, celebra do mesmo jeito. Nada sobre "voltou"
 * ou "esforco" — so a mudanca em si.
 */

import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Typography } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useTheme } from '@/lib/useTheme';

export interface MutationCelebrationOverlayProps {
  visible: boolean;
  /** Nome legivel da mutacao desbloqueada (ja localizado). */
  mutationLabel: string;
  /** Emoji ou icone curto representando a mutacao. */
  mutationGlyph?: string;
  onDismiss: () => void;
  /** Tempo em ms ate auto-dismiss. Default 4000. 0 desabilita. */
  autoDismissMs?: number;
}

export function MutationCelebrationOverlay({
  visible,
  mutationLabel,
  mutationGlyph = '✨',
  onDismiss,
  autoDismissMs = 4000,
}: MutationCelebrationOverlayProps) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glyphPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.85);
      opacity.setValue(0);
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 80,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glyphPulse, {
          toValue: 1.18,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(glyphPulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    const timer =
      autoDismissMs > 0
        ? setTimeout(() => {
            onDismiss();
          }, autoDismissMs)
        : undefined;

    return () => {
      pulse.stop();
      if (timer) clearTimeout(timer);
    };
  }, [visible, scale, opacity, glyphPulse, autoDismissMs, onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('atelier.celebration.dismiss')}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.primary,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <Animated.Text
            style={[styles.glyph, { transform: [{ scale: glyphPulse }] }]}
          >
            {mutationGlyph}
          </Animated.Text>

          <View style={styles.textWrap}>
            <Typography variant="bodyBold" align="center">
              {t('atelier.celebration.title_new_mutation')}
            </Typography>
            <Typography variant="title" align="center">
              {mutationLabel}
            </Typography>
            <Typography variant="caption" tone="secondary" align="center">
              {t('atelier.celebration.subtitle')}
            </Typography>
          </View>

          <View style={styles.hintWrap}>
            <Typography variant="caption" tone="secondary">
              {t('atelier.celebration.dismiss')}
            </Typography>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 2,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
  },
  glyph: {
    fontSize: 72,
    lineHeight: 80,
  },
  textWrap: {
    gap: 4,
    alignItems: 'center',
  },
  hintWrap: {
    marginTop: 4,
    opacity: 0.7,
  },
});
