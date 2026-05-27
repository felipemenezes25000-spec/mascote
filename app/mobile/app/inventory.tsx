import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { accessoryCatalog } from '@/content/accessories';
import { scenesCatalog } from '@/content/scenes';
import { achievementCatalog } from '@/content/achievements';
import { achievements as achievementsDb, inventory, userScenes } from '@/lib/db';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

import { Typography } from '@/components/ui';
export default function Inventory() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const profile = useStore(s => s.profile);
  const [ownedAcc, setOwnedAcc] = useState<Set<string>>(new Set());
  const [ownedScenes, setOwnedScenes] = useState<Set<string>>(new Set());
  const [ownedAch, setOwnedAch] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;
    void load();
  }, [profile?.id]);

  async function load() {
    if (!profile) return;
    const a = await inventory.listOwned(profile.id);
    setOwnedAcc(new Set(a.map(x => x.accessory_id)));
    const s = await userScenes.listUnlocked(profile.id);
    setOwnedScenes(new Set(s.map(x => x.scene_id)));
    const ach = await achievementsDb.listUnlocked(profile.id);
    setOwnedAch(new Set(ach.map(x => x.achievement_id)));
  }

  if (!profile) return <Redirect href='/splash' />;

  const totalUnlocked = ownedAcc.size + ownedScenes.size + ownedAch.size;
  const totalAll = accessoryCatalog.length + scenesCatalog.length + achievementCatalog.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="back" title="Coleção" subtitle={`${totalUnlocked} de ${totalAll} itens`} />
      <ScrollView contentContainerStyle={styles.container}>
        <StaggeredView index={0}>
          <Typography variant="body" style={styles.h1}>Tudo que você ganhou</Typography>
        </StaggeredView>

        {totalUnlocked === 0 && (
          <EmptyState
            emoji="🎁"
            title="Coleção vazia por enquanto"
            body="Acessórios, cenários e conquistas aparecem aqui quando você evoluir com hábitos e missões."
          />
        )}

        <StaggeredView index={1}>
          <Section
            theme={theme}
            title="Acessórios"
            count={ownedAcc.size}
            total={accessoryCatalog.length}
            items={accessoryCatalog.map(a => ({ emoji: a.emoji, label: a.name, unlocked: ownedAcc.has(a.id) }))}
          />
        </StaggeredView>
        <StaggeredView index={2}>
          <Section
            theme={theme}
            title="Cenários"
            count={ownedScenes.size}
            total={scenesCatalog.length}
            items={scenesCatalog.map(s => ({ emoji: s.emoji, label: s.name, unlocked: ownedScenes.has(s.id) || !!s.isDefault }))}
          />
        </StaggeredView>
        <StaggeredView index={3}>
          <Section
            theme={theme}
            title="Conquistas"
            count={ownedAch.size}
            total={achievementCatalog.length}
            items={achievementCatalog.map(a => ({ emoji: a.emoji, label: a.title, unlocked: ownedAch.has(a.id) }))}
          />
        </StaggeredView>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  theme,
  title,
  count,
  total,
  items,
}: {
  theme: Theme;
  title: string;
  count: number;
  total: number;
  items: { emoji: string; label: string; unlocked: boolean }[];
}) {
  const s = makeSectionStyles(theme);
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={s.sectionHeader}>
        <Typography variant="body" style={s.sectionTitle}>{title}</Typography>
        <View style={s.countBadge}>
          <Typography variant="body" style={s.countText}>{count}/{total}</Typography>
        </View>
      </View>
      <View style={s.grid}>
        {items.map((it, i) => (
          <View key={i} style={[s.cell, !it.unlocked && s.cellLocked]}>
            {it.unlocked ? (
              <Typography variant="body" style={s.cellEmoji}>{it.emoji}</Typography>
            ) : (
              <Icon name="lock" size={18} color={theme.colors.textDim} strokeWidth={2} />
            )}
            <Typography variant="body" style={s.cellLabel} numberOfLines={1}>
              {it.label}
            </Typography>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    h1: {
      ...theme.text.h1,
      color: theme.colors.text,
      fontSize: 32,
      letterSpacing: -0.6,
      lineHeight: 36,
    },
  });
}

function makeSectionStyles(theme: Theme) {
  return StyleSheet.create({
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    countBadge: {
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    countText: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 10,
      fontFamily: 'JetBrainsMono_500Medium',
      letterSpacing: 0.5,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    cell: {
      width: '30%',
      backgroundColor: theme.colors.surface,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      gap: 6,
      ...theme.shadow.sm,
    },
    cellLocked: { opacity: 0.5 },
    cellEmoji: { fontSize: 26 },
    cellLabel: {
      ...theme.text.xs,
      color: theme.colors.text,
      textAlign: 'center',
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 11,
    },
  });
}
