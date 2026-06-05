import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { activeLimitedEvent, timeRemaining } from '@/lib/events';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

/**
 * Banner contextual quando há evento limitado ativo.
 * Countdown real, sem manipulação — usuário sabe exatamente quando termina.
 *
 * Premium: icon zap em circle gold, multiplier badge, tipografia editorial.
 */
export function LimitedEventBanner() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [event, setEvent] = useState(() => activeLimitedEvent());
  const [remaining, setRemaining] = useState(() => (event ? timeRemaining(event.end()) : null));

  useEffect(() => {
    const t = setInterval(() => {
      const ev = activeLimitedEvent();
      setEvent(ev);
      setRemaining(ev ? timeRemaining(ev.end()) : null);
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!event || !remaining) return null;

  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={`Evento limitado: ${event.title}`}>
      <View style={styles.iconWrap}>
        <Icon name="zap" size={18} color={theme.colors.gold} strokeWidth={2.2} fill={theme.colors.gold + '40'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.timerRow}>
          <Icon name="clock" size={10} color={theme.colors.textSecondary} strokeWidth={2.2} />
          <Text style={styles.body}>
            {remaining.hours}h {remaining.minutes}min
          </Text>
        </View>
      </View>
      <View style={styles.multiplierBadge}>
        <Text style={styles.multiplierText}>{event.multiplier}×</Text>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.gold + '18',
      borderColor: theme.colors.gold + '80',
      borderWidth: 1,
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      ...theme.shadow.sm,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.gold + '28',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.gold + '60',
    },
    title: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 17,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    body: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10.5,
      letterSpacing: 0.3,
    },
    multiplierBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.gold,
      borderWidth: 1,
      borderColor: theme.colors.gold,
    },
    multiplierText: {
      // Badge bg é `theme.colors.gold` (#F2C14E, claro fixo nos dois modos).
      // `theme.colors.text` no dark é creme (#FCF3E7) → creme-sobre-dourado
      // ~1.8:1 (falha WCAG AA). bgDark (#15110D) é escuro fixo: ~11:1 nos dois.
      color: theme.colors.bgDark,
      fontWeight: '800',
      fontSize: 13,
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.2,
    },
  });
}
