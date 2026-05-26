/**
 * AtelierOnboarding — wizard de boas-vindas no primeira visita.
 *
 * Modal fullscreen com 4 telas explicando cada feature principal do Atelier.
 * Dot indicator + Anterior/Próximo + botão "Pular" (sempre visível).
 *
 * Skip = mesmo efeito de Finish: persiste flag e fecha. Usuário avançado
 * que sabe o que está fazendo não fica refém de onboarding.
 *
 * Flag persistida em AsyncStorage. Reset via debug menu se quiser ver de novo.
 */

import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/ui';
import { logger } from '@/lib/logger';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const ONBOARDED_KEY = 'mascote:atelier_onboarded:v1';

interface Step {
  title: string;
  body: string;
  emoji: string;
}

const STEPS: ReadonlyArray<Step> = [
  {
    emoji: '✨',
    title: 'Bem-vindo ao Ateliê',
    body: 'Aqui você esculpe a aparência do seu mascote. As mudanças NUNCA alteram o DNA — apenas como ele se manifesta visualmente.',
  },
  {
    emoji: '🎨',
    title: 'Presets + Mistura',
    body: 'Comece com um preset (Kawaii, Robusto, Místico…) ou combine 2 com o slider de mix. Resultado fica como base pra você refinar.',
  },
  {
    emoji: '🔒',
    title: 'Trave o que ama',
    body: 'Cadeado em cada slider protege ele do Aleatório / DNA puro / Presets. Use pra preservar a parte do mascote que você não quer mudar.',
  },
  {
    emoji: '💾',
    title: 'Salve looks pra trocar',
    body: 'Salve até 5 looks com nome ("Matinal", "Festivo") e troque entre eles a qualquer momento. Compartilhe com amigos via JSON.',
  },
];

export interface AtelierOnboardingAPI {
  /** True se onboarding deve aparecer (não viu ainda + load completo). */
  visible: boolean;
  /** Marca como completo e fecha. */
  finish: () => Promise<void>;
}

/**
 * Hook que gerencia state do onboarding.
 * Carrega flag do AsyncStorage; mostra modal se nunca completou.
 */
export function useAtelierOnboarding(): AtelierOnboardingAPI {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (cancelled) return;
        setVisible(raw !== 'true');
      } catch (e) {
        logger.warn?.('[AtelierOnboarding] read flag failed', {
          reason: e instanceof Error ? e.message : 'unknown',
        });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback(async (): Promise<void> => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    } catch (e) {
      logger.warn?.('[AtelierOnboarding] write flag failed', {
        reason: e instanceof Error ? e.message : 'unknown',
      });
    }
  }, []);

  return { visible: visible && loaded, finish };
}

export interface AtelierOnboardingProps {
  visible: boolean;
  onFinish: () => void;
}

export function AtelierOnboarding({ visible, onFinish }: AtelierOnboardingProps) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const [stepIdx, setStepIdx] = useState(0);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const handleNext = (): void => {
    if (isLast) {
      onFinish();
      setStepIdx(0); // reset pra próxima vez
      return;
    }
    setStepIdx(i => i + 1);
  };

  const handlePrev = (): void => {
    setStepIdx(i => Math.max(0, i - 1));
  };

  const handleSkip = (): void => {
    onFinish();
    setStepIdx(0);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.bg, borderRadius: theme.radius.xl },
          ]}
        >
          <Pressable
            onPress={handleSkip}
            style={styles.skipBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Pular tutorial"
          >
            <Typography variant="caption" tone="secondary">
              Pular
            </Typography>
          </Pressable>

          <View style={styles.content}>
            <Typography
              variant="display"
              align="center"
              style={styles.emoji}
            >
              {step.emoji}
            </Typography>
            <Typography variant="heading" align="center" style={styles.title}>
              {step.title}
            </Typography>
            <Typography variant="body" align="center" tone="secondary" style={styles.body}>
              {step.body}
            </Typography>
          </View>

          <View style={styles.dotsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === stepIdx ? theme.colors.primary : theme.colors.border,
                    width: i === stepIdx ? 22 : 6,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.navRow}>
            {stepIdx > 0 ? (
              <PressableScale
                onPress={handlePrev}
                style={[styles.navBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Anterior"
              >
                <Icon name="arrow-left" size={16} color={theme.colors.text} strokeWidth={2} />
                <Typography variant="bodyBold">Anterior</Typography>
              </PressableScale>
            ) : (
              <View style={styles.navSpacer} />
            )}
            <PressableScale
              onPress={handleNext}
              style={[
                styles.navBtn,
                styles.navBtnPrimary,
                { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isLast ? 'Começar' : 'Próximo'}
            >
              <Typography
                variant="bodyBold"
                style={{ color: theme.tokens.semantic.inkOnBrand }}
              >
                {isLast ? 'Começar' : 'Próximo'}
              </Typography>
              <Icon
                name={isLast ? 'check' : 'arrow-right'}
                size={16}
                color={theme.tokens.semantic.inkOnBrand}
                strokeWidth={2}
              />
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
      ...theme.shadow.md,
    },
    skipBtn: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    content: {
      gap: theme.spacing.md,
      alignItems: 'center',
      paddingTop: theme.spacing.md,
    },
    emoji: {
      fontSize: 48,
      lineHeight: 56,
    },
    title: {},
    body: {
      paddingHorizontal: theme.spacing.sm,
      lineHeight: 22,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dot: {
      height: 6,
      borderRadius: 3,
    },
    navRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    navBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
    },
    navBtnPrimary: {},
    navSpacer: {
      flex: 1,
    },
  });
}
