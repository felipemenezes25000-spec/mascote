import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Button } from '@/components/Button';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { Icon } from '@/components/Icon';
import { MysteryBoxCard } from '@/components/MysteryBoxCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { WalletPills } from '@/components/WalletPills';
import { mysteryBox, todayLocal, wallet as walletDb } from '@/lib/db';
import { useTheme } from '@/lib/useTheme';
import { makeShadow } from '@/lib/themes';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

interface Slice {
  id: string;
  label: string;
  coins: number;
  gems: number;
  color: string;
}

export default function Rewards() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const profile = useStore(s => s.profile);
  const wallet = useStore(s => s.wallet);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);

  const SLICES: Slice[] = [
    { id: 's1', label: '+10 🪙', coins: 10, gems: 0, color: theme.colors.primary },
    { id: 's2', label: '+30 🪙', coins: 30, gems: 0, color: theme.colors.sage },
    { id: 's3', label: '+1 💎', coins: 0, gems: 1, color: theme.colors.sky },
    { id: 's4', label: '+75 🪙', coins: 75, gems: 0, color: theme.colors.coral },
    { id: 's5', label: '+5 🪙', coins: 5, gems: 0, color: theme.colors.primaryDeep },
    { id: 's6', label: '+50 🪙', coins: 50, gems: 0, color: theme.colors.lilac },
    { id: 's7', label: '+2 💎', coins: 0, gems: 2, color: theme.colors.gold },
    { id: 's8', label: '+100 🪙', coins: 100, gems: 0, color: theme.colors.sageDeep },
  ];

  const rotation = useSharedValue(0);
  const pointerPulse = useSharedValue(0.6);
  const [spinning, setSpinning] = useState(false);
  const [boxAvailable, setBoxAvailable] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const [usedTodaySpin, setUsedTodaySpin] = useState(false);
  const today = todayLocal();
  // Ref pra cancelar o confetti timer no unmount e em chamadas concorrentes.
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timer da roda (3.6s) também precisa cancelar no unmount pra evitar
  // setState após desmontagem se user navegar embora durante o spin.
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sinal pra fn assíncrona dentro do setTimeout abortar antes de mexer no state.
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
  }, []);

  function showConfetti(ms: number) {
    setConfetti(true);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = setTimeout(() => setConfetti(false), ms);
  }

  useEffect(() => {
    pointerPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(pointerPulse);
  }, []);

  useEffect(() => {
    if (!profile) return;
    void load();
  }, [profile?.id]);

  async function load() {
    if (!profile) return;
    const b = await mysteryBox.get(profile.id);
    const usedToday = b.last_opened_date === today;
    setBoxAvailable(!usedToday);
    // Roda e caixa compartilham o slot diário: usar 1 trava a outra.
    // Sem isto, sair e voltar à tela permitia girar infinitamente (usedTodaySpin é só state).
    setUsedTodaySpin(usedToday);
  }

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pointerStyle = useAnimatedStyle(() => ({
    opacity: pointerPulse.value,
    transform: [{ scale: 0.85 + pointerPulse.value * 0.3 }],
  }));

  async function spin() {
    if (!profile || spinning || usedTodaySpin) return;
    const idx = Math.floor(Math.random() * SLICES.length);
    const slice = SLICES[idx];
    const sliceAngle = 360 / SLICES.length;
    // queremos a fatia idx parar no topo (em -90° é o topo no SVG)
    const target = 360 * 5 + (270 - idx * sliceAngle - sliceAngle / 2);

    // Lock IMEDIATO (memória + DB) antes da animação. Antes, mysteryBox.open
    // só rodava dentro do setTimeout — se user navegasse durante os 3.6s do
    // spin, o cleanup do unmount cancelava o timer, persistência nunca
    // acontecia, e ao voltar `load()` via DB virgem e permitia girar de novo.
    setSpinning(true);
    setUsedTodaySpin(true);
    setBoxAvailable(false);
    await mysteryBox.open(profile.id, today);
    await walletDb.add(profile.id, slice.coins, slice.gems);
    /* v8 ignore next — refreshWallet falha só se DB indisponível; testado
       em mock mas guarda contra propagação no caminho de spin. */
    await refreshWallet().catch(() => undefined);

    rotation.value = withTiming(rotation.value + target, {
      duration: 3500,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

    // Timer só dispara o feedback visual no fim. Prêmio já está gravado;
    // se user sair, perde só o confetti — comportamento aceitável.
    spinTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setSpinning(false);
      showConfetti(1400);
      enqueueToast({
        kind: 'info',
        emoji: '🎰',
        title: 'Roda da Sorte!',
        subtitle: slice.label,
      });
    }, 3600);
  }

  async function openBox() {
    if (!profile || !boxAvailable) return;
    const opened = await mysteryBox.open(profile.id, today);
    if (!opened) return;
    const drops = [
      { coins: 30, gems: 0, label: '+30 🪙' },
      { coins: 75, gems: 0, label: '+75 🪙' },
      { coins: 0, gems: 2, label: '+2 💎' },
      { coins: 50, gems: 0, label: '+50 🪙' },
      { coins: 100, gems: 1, label: '+100 🪙 +1 💎' },
    ];
    const drop = drops[Math.floor(Math.random() * drops.length)];
    await walletDb.add(profile.id, drop.coins, drop.gems);
    await refreshWallet();
    setBoxAvailable(false);
    setUsedTodaySpin(true);
    showConfetti(1500);
    enqueueToast({ kind: 'info', emoji: '🎁', title: 'Caixa surpresa!', subtitle: drop.label });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="modal" title="Loja & Sorte" subtitle="gire 1× por dia" />

      <ScrollView contentContainerStyle={styles.body}>
        <StaggeredView index={0}>
          <View style={styles.walletWrap}>
            <WalletPills coins={wallet?.coins ?? 0} gems={wallet?.gems ?? 0} />
          </View>
        </StaggeredView>

        <StaggeredView index={1}>
          <View style={styles.sectionHeader}>
            <Icon name="sparkles" size={12} color={theme.colors.primary} strokeWidth={2.4} />
            <Text style={styles.sectionTitle}>Roda da Sorte</Text>
          </View>
          <Text style={styles.note}>1 giro grátis por dia. Sem opção paga.</Text>
        </StaggeredView>

        <View style={styles.wheelWrap}>
          {/* glow ring + wheel */}
          <View style={styles.wheelShadow}>
            <Animated.View style={spinStyle}>
              <Svg width={300} height={300} viewBox="0 0 200 200">
                <Defs>
                  <RadialGradient id="rim" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                    <Stop offset="92%" stopColor="#ffffff" stopOpacity="0" />
                    <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity="0.4" />
                  </RadialGradient>
                </Defs>
                {SLICES.map((s, i) => {
                  const a1 = (i * 360) / SLICES.length;
                  const a2 = ((i + 1) * 360) / SLICES.length;
                  const r = 96;
                  const x1 = 100 + r * Math.cos((a1 * Math.PI) / 180);
                  const y1 = 100 + r * Math.sin((a1 * Math.PI) / 180);
                  const x2 = 100 + r * Math.cos((a2 * Math.PI) / 180);
                  const y2 = 100 + r * Math.sin((a2 * Math.PI) / 180);
                  const labelAngle = (a1 + a2) / 2;
                  // posição do texto: mais perto da borda (66) — sempre horizontal
                  const lx = 100 + 62 * Math.cos((labelAngle * Math.PI) / 180);
                  const ly = 100 + 62 * Math.sin((labelAngle * Math.PI) / 180);
                  return (
                    <G key={s.id}>
                      <Path
                        d={`M 100 100 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                        fill={s.color}
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                      {/* texto sempre horizontal — sem rotation */}
                      <SvgText
                        x={lx}
                        y={ly}
                        fill="#fff"
                        fontSize="11"
                        fontWeight="800"
                        textAnchor="middle"
                        alignmentBaseline="central"
                      >
                        {s.label}
                      </SvgText>
                    </G>
                  );
                })}
                {/* anel decorativo */}
                <Circle cx="100" cy="100" r="98" fill="none" stroke="url(#rim)" strokeWidth="4" />
                {/* hub central */}
                <Circle cx="100" cy="100" r="14" fill={theme.colors.surface} stroke={theme.colors.primary} strokeWidth="3" />
                <Circle cx="100" cy="100" r="5" fill={theme.colors.primary} />
              </Svg>
            </Animated.View>
          </View>
          {/* pointer com glow pulsante */}
          <Animated.View style={[styles.pointerGlow, pointerStyle]} />
          <View style={styles.pointer} />
        </View>

        <Button
          label={usedTodaySpin ? 'Volta amanhã' : spinning ? 'Girando...' : 'Girar agora'}
          onPress={spin}
          disabled={spinning || usedTodaySpin}
        />

        <View style={{ height: theme.spacing.lg }} />
        <StaggeredView index={2}>
          <View style={styles.sectionHeader}>
            <Icon name="gift" size={12} color={theme.colors.primary} strokeWidth={2.4} />
            <Text style={styles.sectionTitle}>Caixa Surpresa</Text>
          </View>
          <Text style={styles.note}>1 por dia. Drop entre moedas, gemas, XP, acessórios.</Text>
        </StaggeredView>
        <View style={{ alignItems: 'center', paddingVertical: theme.spacing.md }}>
          <MysteryBoxCard available={boxAvailable} onOpen={openBox} />
        </View>

        <Text style={styles.disclaimer}>
          Wellness gamificado, sem pay-to-win. Nenhum item premium influencia em conteúdo de cuidado.
        </Text>
      </ScrollView>
      <ConfettiBurst visible={confetti} />
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    body: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    walletWrap: { alignItems: 'center', paddingVertical: theme.spacing.sm },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    note: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 13,
    },
    wheelWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.lg, position: 'relative' },
    wheelShadow: {
      ...makeShadow(theme.colors.primary, 0, 12, 40, 0.18, 8),
      borderRadius: 150,
    },
    pointer: {
      position: 'absolute',
      top: 8,
      width: 0,
      height: 0,
      borderLeftWidth: 14,
      borderRightWidth: 14,
      borderTopWidth: 26,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: theme.colors.primary,
      zIndex: 10,
    },
    pointerGlow: {
      position: 'absolute',
      top: 0,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.gold,
      opacity: 0.5,
      zIndex: 9,
    },
    disclaimer: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.lg,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      lineHeight: 16,
    },
  });
}
