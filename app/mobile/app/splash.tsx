import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BrandLogo } from '@/components/BrandLogo';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';

import { Typography } from '@/components/ui';
export default function Splash() {
  const theme = useTheme();
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Reduzimos de 1400ms → 700ms após QA flagrar splash longo. Animação de scale
    // dura 600ms; setamos 700ms para terminar pouco depois do final visual da
    // animação. Em rede ruim a hidratação do store (não este timeout) é o gargalo
    // real, mas eliminamos o delay artificial.
    scale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 300 });
    const t = setTimeout(() => {
      // Lê o profile MAIS RECENTE do snapshot do store — não do closure
      // capturado no mount. Sem isso, se a hidratação do AsyncStorage terminar
      // ENTRE o mount e o timeout, o profile capturado era null e mandávamos
      // user já cadastrado pro onboarding (regressão silenciosa).
      const profile = useStore.getState().profile;
      if (profile) router.replace('/(tabs)');
      else router.replace('/onboarding/welcome');
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.bg }]}>
      <Animated.View style={[styles.content, style]}>
        <BrandLogo size={200} shadow={false} />
        <Typography variant="body" style={[styles.wordmark, { color: theme.colors.primary }]}>mascote</Typography>
        <Typography variant="body" style={[styles.tagline, { color: theme.colors.textSecondary }]}>
          Seu companheiro de autocuidado.
        </Typography>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 14 },
  wordmark: {
    fontSize: 48,
    fontFamily: 'Quicksand_700Bold',
    letterSpacing: -1.5,
    lineHeight: 52,
    marginTop: -4,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    maxWidth: 240,
  },
});
