// v2 — entrada cinematográfica (Phase 1)
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

export default function Welcome() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const reduceMotion = useStore(s => s.settings?.reduce_motion ?? false);

  // entrada em cascata
  const logoScale = useSharedValue(reduceMotion ? 1 : 0.7);
  const logoOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const wordmarkY = useSharedValue(reduceMotion ? 0 : 14);
  const wordmarkOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const titleOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const titleY = useSharedValue(reduceMotion ? 0 : 8);
  const subtitleOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const footerOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const footerY = useSharedValue(reduceMotion ? 0 : 12);

  // glow loop
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.35);

  // float loop (logo flutua sutil)
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    logoScale.value = withSpring(1, { damping: 12, stiffness: 90, mass: 0.9 });
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });

    wordmarkY.value = withDelay(280, withSpring(0, { damping: 14, stiffness: 110 }));
    wordmarkOpacity.value = withDelay(280, withTiming(1, { duration: 420 }));

    titleY.value = withDelay(640, withSpring(0, { damping: 16, stiffness: 120 }));
    titleOpacity.value = withDelay(640, withTiming(1, { duration: 380 }));

    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: 380 }));

    footerY.value = withDelay(1100, withSpring(0, { damping: 18, stiffness: 130 }));
    footerOpacity.value = withDelay(1100, withTiming(1, { duration: 420 }));

    // glow infinito
    glowScale.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1.18, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
    glowOpacity.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.25, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );

    // float sutil (logo flutuando)
    floatY.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );

    return () => {
      cancelAnimation(logoScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(wordmarkY);
      cancelAnimation(wordmarkOpacity);
      cancelAnimation(titleY);
      cancelAnimation(titleOpacity);
      cancelAnimation(subtitleOpacity);
      cancelAnimation(footerY);
      cancelAnimation(footerOpacity);
      cancelAnimation(glowScale);
      cancelAnimation(glowOpacity);
      cancelAnimation(floatY);
    };
  }, [reduceMotion]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: floatY.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: footerY.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={styles.root}>
      {/* Gradient de fundo (sutil, do bg ao bg2) */}
      <LinearGradient
        colors={[theme.colors.bg, theme.colors.bg2, theme.colors.bg]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.mascotWrap}>
            {/* Glow atrás do logo */}
            <Animated.View style={[styles.glow, glowStyle]} />
            <Animated.View style={logoStyle}>
              <BrandLogo size={180} />
            </Animated.View>
            <Animated.Text style={[styles.wordmark, wordmarkStyle]}>mascote</Animated.Text>
          </View>
          <View style={styles.textWrap}>
            <Animated.Text style={[styles.title, titleStyle]}>Cuide de você.</Animated.Text>
            <Animated.Text style={[styles.title, titleStyle]}>
              Seu Mascote evolui junto.
            </Animated.Text>
            <Animated.Text style={[styles.subtitle, subtitleStyle]}>
              Em 30 segundos por dia, você cuida de você e ele cresce. Sem cobrança, sem culpa.
            </Animated.Text>
          </View>
          <Animated.View style={[styles.footer, footerStyle]}>
            <Button label="Começar" onPress={() => router.push('/signup')} />
            <Pressable
              onPress={() => {
                // QA flagrou: pular sem confirmação faz o usuário perder a apresentação
                // (mascote, missão diária, segurança) e impacta retenção. Confirmamos
                // pra dar uma última chance de voltar pro flow recomendado.
                const goSkip = () => router.push('/onboarding/personality');
                if (Platform.OS === 'web') {
                  if (typeof window !== 'undefined' && window.confirm('Pular o tour rápido? Você perde a apresentação do mascote e o tutorial.')) goSkip();
                } else {
                  Alert.alert(
                    'Pular o tour?',
                    'Você perde a apresentação do mascote e a explicação rápida das missões. Dá pra voltar depois nas configurações.',
                    [
                      { text: 'Volto pro tour', style: 'cancel' },
                      { text: 'Pular mesmo assim', style: 'destructive', onPress: goSkip },
                    ],
                  );
                }
              }}
            >
              <Text style={styles.linkText}>Pular descobrimento e escolher direto</Text>
            </Pressable>
            <Text style={styles.disclaimer}>
              Mascote é wellness e autocuidado. Não substitui acompanhamento profissional.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.bg },
    safe: { flex: 1 },
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    mascotWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    glow: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: theme.colors.primary,
      opacity: 0.35,
    },
    wordmark: {
      fontSize: 40,
      fontFamily: 'Quicksand_700Bold',
      color: theme.colors.primary,
      letterSpacing: -1.5,
      lineHeight: 44,
    },
    textWrap: { gap: theme.spacing.sm, marginBottom: theme.spacing.xl },
    title: { ...theme.text.h1, color: theme.colors.text, textAlign: 'center' },
    subtitle: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    footer: { gap: theme.spacing.md },
    linkText: { color: theme.colors.primary, textAlign: 'center', fontWeight: '600', paddingVertical: 6 },
    disclaimer: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
  });
}
