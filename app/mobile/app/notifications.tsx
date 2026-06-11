import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { notifications as notifDb } from '@/lib/db';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { InAppNotification } from '@/types';

import { Typography } from '@/components/ui';
const kindIcon: Record<InAppNotification['kind'], IconName> = {
  reminder: 'clock',
  streak_at_risk: 'flame',
  evolution: 'sparkles',
  level_up: 'star',
  mission_new: 'target',
  weekly_report: 'bar-chart',
  birthday: 'gift',
  seasonal: 'sparkle',
  safety: 'heart',
  journey: 'trophy',
};

const kindColor: Record<InAppNotification['kind'], 'primary' | 'error' | 'gold' | 'sage' | 'sky'> = {
  reminder: 'sky',
  streak_at_risk: 'error',
  evolution: 'primary',
  level_up: 'gold',
  mission_new: 'primary',
  weekly_report: 'sage',
  birthday: 'primary',
  seasonal: 'gold',
  safety: 'error',
  journey: 'gold',
};

export default function NotificationsScreen() {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const profile = useStore(s => s.profile);
  const [list, setList] = useState<InAppNotification[]>([]);

  useEffect(() => {
    if (!profile) return;
    void load();
  }, [profile?.id]);

  async function load() {
    if (!profile) return;
    const rows = await notifDb.list(profile.id);
    setList(rows);
  }

  async function markAllRead() {
    if (!profile) return;
    await notifDb.markAllRead(profile.id);
    await load();
  }

  async function tap(n: InAppNotification) {
    await notifDb.markRead(n.id);
    if (n.kind === 'weekly_report') {
      router.replace('/weekly-report');
      return;
    }
    // Deep-link safe: se a tela foi aberta direto (sem back stack), cai pro home.
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  if (!profile) return <Redirect href="/splash" />;

  const colorFor = (k: InAppNotification['kind']) => {
    const tone = kindColor[k];
    if (tone === 'primary') return theme.colors.primary;
    if (tone === 'error') return theme.colors.error;
    if (tone === 'gold') return theme.colors.gold;
    if (tone === 'sage') return theme.colors.sage;
    return theme.colors.sky;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        variant="modal"
        title="Avisos"
        subtitle={list.length > 0 ? `${list.filter(n => !n.read_at).length} não lidos` : undefined}
        rightSlot={
          list.length > 0 ? (
            <PressableScale
              onPress={markAllRead}
              hitSlop={10}
              style={styles.markBtn}
              accessibilityRole="button"
              accessibilityLabel="Marcar todos os avisos como lidos"
            >
              <Icon name="check" size={12} color={theme.colors.primary} strokeWidth={2.4} />
              <Typography variant="body" style={styles.markRead}>Tudo</Typography>
            </PressableScale>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Icon name="bell" size={32} color={theme.colors.textDim} strokeWidth={1.6} />
            </View>
            <Typography variant="body" style={styles.emptyText}>Sem avisos por aqui</Typography>
            <Typography variant="body" style={styles.emptySub}>
              Se você ativar avisos, eu te chamo com carinho para novidades e lembretes leves.
            </Typography>
          </View>
        ) : (
          list.map((n, i) => {
            const color = colorFor(n.kind);
            return (
              <StaggeredView key={n.id} index={Math.min(i, 12)} step={40}>
                <PressableScale
                  onPress={() => tap(n)}
                  style={[styles.item, !n.read_at && styles.itemUnread]}
                  accessibilityRole="button"
                  accessibilityLabel={`${!n.read_at ? 'Não lido. ' : ''}${n.title}. ${n.body}`}
                >
                  <View style={[styles.iconWrap, { backgroundColor: color + '18', borderColor: color + '30' }]}>
                    <Icon name={kindIcon[n.kind]} size={18} color={color} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Typography variant="body" style={styles.title}>{n.title}</Typography>
                    <Typography variant="body" style={styles.body}>{n.body}</Typography>
                    <Typography variant="body" style={styles.time}>{formatTime(n.created_at)}</Typography>
                  </View>
                  {!n.read_at && <View style={styles.dot} />}
                </PressableScale>
              </StaggeredView>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const ms = now.getTime() - then.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return then.toLocaleDateString('pt-BR');
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    markBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: theme.colors.primaryTint,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    markRead: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
    },
    scroll: { padding: theme.spacing.lg, gap: theme.spacing.sm },
    empty: { alignItems: 'center', paddingVertical: theme.spacing.xl * 1.5, gap: theme.spacing.sm },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
    },
    emptyText: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 22,
      letterSpacing: -0.3,
    },
    emptySub: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.lg,
      lineHeight: 20,
    },
    item: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'flex-start',
      ...theme.shadow.sm,
    },
    itemUnread: {
      backgroundColor: theme.colors.primary + '08',
      borderColor: theme.colors.primary + '50',
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    title: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 17,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    body: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
    time: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      marginTop: 6,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
      letterSpacing: 0.3,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      marginTop: 6,
    },
  });
}
