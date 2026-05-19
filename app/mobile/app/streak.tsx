import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { streaks as streaksDb, wallet as walletDb } from '@/lib/db';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

const FREEZE_COST = 50; // moedas

export default function StreakScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const profile = useStore(s => s.profile);
  const streak = useStore(s => s.streak);
  const wallet = useStore(s => s.wallet);
  const refreshStreak = useStore(s => s.refreshStreak);
  const refreshWallet = useStore(s => s.refreshWallet);
  const current = streak?.current_streak ?? 0;
  const longest = streak?.longest_streak ?? 0;
  const grace = streak?.grace_days_left ?? 2;

  async function buyFreeze() {
    if (!profile || !streak) return;
    if ((wallet?.coins ?? 0) < FREEZE_COST) {
      Alert.alert('Sem moedas', `Precisa de ${FREEZE_COST} moedas pra comprar um freeze. Você tem ${wallet?.coins ?? 0}.`);
      return;
    }
    const spent = await walletDb.spend(profile.id, FREEZE_COST, 0);
    if (!spent) return;
    await streaksDb.upsert({
      ...streak,
      grace_days_left: Math.min(5, streak.grace_days_left + 1),
    });
    await refreshStreak();
    await refreshWallet();
    Alert.alert('Freeze adicionado', `Agora você tem ${Math.min(5, streak.grace_days_left + 1)} folgas.`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="back" title="Streak" subtitle="sua constância" />
      <ScrollView contentContainerStyle={styles.container}>
        <StaggeredView index={0}>
          <View style={styles.heroWrap}>
            <View style={styles.flameWrap}>
              <Icon name="flame" size={56} color={theme.colors.error} strokeWidth={1.6} fill={theme.colors.error + '40'} />
            </View>
            <Text style={styles.bigNumber}>{current}</Text>
            <Text style={styles.subtitle}>{current === 1 ? 'dia' : 'dias'} seguidos cuidando de você</Text>
          </View>
        </StaggeredView>

        <StaggeredView index={1}>
          <View style={styles.statRow}>
            <Card variant="elevated" padding="md" style={styles.statCard}>
              <Icon name="trophy" size={14} color={theme.colors.gold} strokeWidth={2.2} />
              <Text style={styles.statValue}>{longest}</Text>
              <Text style={styles.statLabel}>recorde</Text>
            </Card>
            <Card variant="elevated" padding="md" style={styles.statCard}>
              <Icon name="shield" size={14} color={theme.colors.sky} strokeWidth={2.2} />
              <Text style={styles.statValue}>{grace}</Text>
              <Text style={styles.statLabel}>folgas disponíveis</Text>
            </Card>
          </View>
        </StaggeredView>

        <StaggeredView index={2}>
          <Card variant="elevated" padding="md" style={styles.freezeCard}>
            <View style={styles.freezeHeader}>
              <View style={styles.freezeIconWrap}>
                <Icon name="shield" size={18} color={theme.colors.sky} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.freezeTitle}>Streak Freeze</Text>
                <Text style={styles.freezeBody}>
                  Compra uma folga extra (até 5 simultâneas). Custa {FREEZE_COST} moedas e te protege em dia ruim.
                </Text>
              </View>
            </View>
            <View style={styles.freezeRow}>
              <View style={styles.balanceRow}>
                <Icon name="coins" size={12} color={theme.colors.primaryDeep} strokeWidth={2.4} />
                <Text style={styles.freezeBalance}>Você tem {wallet?.coins ?? 0}</Text>
              </View>
              <Button
                label={
                  grace >= 5
                    ? 'Limite atingido'
                    : (wallet?.coins ?? 0) < FREEZE_COST
                      ? `Faltam ${FREEZE_COST - (wallet?.coins ?? 0)} 🪙`
                      : `Comprar (${FREEZE_COST})`
                }
                onPress={buyFreeze}
                disabled={grace >= 5 || (wallet?.coins ?? 0) < FREEZE_COST}
              />
            </View>
          </Card>
        </StaggeredView>

        <StaggeredView index={3}>
          <Card variant="flat" padding="md" style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Icon name="info" size={14} color={theme.colors.textSecondary} strokeWidth={2.2} />
              <Text style={styles.infoTitle}>Como funciona</Text>
            </View>
            <Text style={styles.infoBody}>
              · Cada check-in conta um dia.{'\n'}
              · Pulou um dia? Você gasta uma folga e a sequência continua.{'\n'}
              · A cada 14 dias seguidos, ganha +1 folga (até 5).{'\n'}
              · Sem culpa: o Mascote descansa, não morre.
            </Text>
          </Card>
        </StaggeredView>

        <StaggeredView index={4}>
          <Card variant="flat" padding="md" style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Icon name="target" size={14} color={theme.colors.primary} strokeWidth={2.2} />
              <Text style={styles.infoTitle}>Próximos marcos</Text>
            </View>
            {[7, 14, 30, 60, 100].filter(m => m > current).slice(0, 3).map(m => (
              <View key={m} style={styles.milestoneRow}>
                <View style={styles.milestoneBadge}>
                  <Text style={styles.milestoneN}>{m}d</Text>
                </View>
                <Text style={styles.milestoneText}>{milestoneCopy(m)}</Text>
              </View>
            ))}
          </Card>
        </StaggeredView>
      </ScrollView>
    </SafeAreaView>
  );
}

function milestoneCopy(m: number) {
  switch (m) {
    case 7: return 'uma semana inteira · cenário Floresta';
    case 14: return 'duas semanas · acessório cachecol';
    case 30: return 'um mês · fones premium';
    case 60: return 'dois meses · forma rara em análise';
    case 100: return 'cem dias · marco lendário';
    default: return '';
  }
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { padding: theme.spacing.lg, gap: theme.spacing.md },
    heroWrap: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    flameWrap: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: theme.colors.error + '15',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
    },
    bigNumber: {
      fontSize: 80,
      fontWeight: '800',
      color: theme.colors.text,
      lineHeight: 84,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: -2,
      marginTop: theme.spacing.sm,
    },
    subtitle: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 15,
    },
    statRow: { flexDirection: 'row', gap: theme.spacing.md },
    statCard: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: {
      ...theme.text.h2,
      color: theme.colors.text,
      fontSize: 26,
      lineHeight: 28,
      letterSpacing: -0.4,
    },
    statLabel: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    freezeCard: { gap: theme.spacing.sm },
    freezeHeader: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
    freezeIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.sky + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    freezeTitle: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 19,
      lineHeight: 22,
      letterSpacing: -0.2,
    },
    freezeBody: { ...theme.text.sm, color: theme.colors.textSecondary, lineHeight: 20, marginTop: 2 },
    freezeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flex: 1,
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    freezeBalance: {
      color: theme.colors.text,
      fontWeight: '700',
      fontSize: 12,
      fontFamily: 'PlusJakartaSans_700Bold',
    },
    infoCard: { gap: theme.spacing.sm },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoTitle: {
      color: theme.colors.text,
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 14,
      letterSpacing: 0.1,
    },
    infoBody: { ...theme.text.sm, color: theme.colors.textSecondary, lineHeight: 22 },
    milestoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: 8,
    },
    milestoneBadge: {
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    milestoneN: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 11,
      letterSpacing: 0.4,
    },
    milestoneText: { ...theme.text.sm, color: theme.colors.textSecondary, flex: 1 },
  });
}
