import { Typography } from '@/components/ui';
/**
 * Tela Mutações — catálogo + state lock/unlock.
 *
 * Listagem das 7 mutações biológicas com 4 raridades. Locked items aparecem
 * obscurecidos com pista vaga. Unlocked mostram nome + descrição + data +
 * raridade. Empty state acolhedor pra users novos.
 */

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import {
  MUTATION_CATALOG,
  type Mutation,
  type MutationRarity,
  type UnlockedMutation,
} from '@/lib/dna';
import { dnaMutations } from '@/lib/db';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

const RARITY_ORDER: MutationRarity[] = ['legendary', 'epic', 'rare', 'common'];

function rarityLabel(r: MutationRarity): string {
  switch (r) {
    case 'legendary': return 'LENDÁRIA';
    case 'epic':      return 'ÉPICA';
    case 'rare':      return 'RARA';
    case 'common':    return 'COMUM';
  }
}

function rarityColor(r: MutationRarity, theme: Theme): string {
  switch (r) {
    case 'legendary': return theme.colors.gold;
    case 'epic':      return theme.colors.lilac;
    case 'rare':      return theme.colors.primary;
    case 'common':    return theme.colors.sky;
  }
}

export default function MutationsScreen() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const [unlocked, setUnlocked] = useState<UnlockedMutation[]>([]);
  const unlockedIds = new Set(unlocked.map(u => u.mutation_id));

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void (async () => {
        const list = await dnaMutations.listForUser(profile.id);
        setUnlocked(list);
      })();
    }, [profile?.id]),
  );

  // Agrupa por raridade
  const groups = RARITY_ORDER.map(r => ({
    rarity: r,
    items: MUTATION_CATALOG.filter(m => m.rarity === r),
  })).filter(g => g.items.length > 0);

  const totalUnlocked = unlocked.length;
  const totalAvailable = MUTATION_CATALOG.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <PressableScale
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Voltar"
            accessibilityRole="button"
          >
            <Icon name="arrow-left" size={22} color={theme.colors.text} strokeWidth={2.2} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Typography variant="body" accessibilityRole="header" style={styles.h1}>Mutações</Typography>
            <Typography variant="body" style={styles.subtitle}>
              {totalUnlocked} de {totalAvailable} desbloqueadas
            </Typography>
          </View>
        </View>

        {totalUnlocked === 0 && (
          <View style={styles.empty}>
            <Icon name="sparkle" size={36} color={theme.colors.primary} strokeWidth={1.6} />
            <Typography variant="body" style={styles.emptyTitle}>Ainda nada gravado no corpo dela.</Typography>
            <Typography variant="body" style={styles.emptyBody}>
              Marcos biológicos surgem com o tempo, conforme você cuida de você
              e ela acompanha. Sem corrida — cada criatura tem o próprio ritmo.
            </Typography>
          </View>
        )}

        {groups.map(g => (
          <View key={g.rarity} style={styles.group}>
            <View style={styles.groupHeader}>
              <View
                style={[
                  styles.rarityDot,
                  { backgroundColor: rarityColor(g.rarity, theme) },
                ]}
              />
              <Typography variant="body" style={[styles.rarityLabel, { color: rarityColor(g.rarity, theme) }]}>
                {rarityLabel(g.rarity)}
              </Typography>
              <View style={{ flex: 1 }} />
              <Typography variant="body" style={styles.rarityCount}>
                {g.items.filter(m => unlockedIds.has(m.id)).length}/{g.items.length}
              </Typography>
            </View>
            {g.items.map(m => (
              <MutationCard
                key={m.id}
                mutation={m}
                unlockedAt={unlocked.find(u => u.mutation_id === m.id)?.unlocked_at}
                isUnlocked={unlockedIds.has(m.id)}
              />
            ))}
          </View>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MutationCard({
  mutation,
  unlockedAt,
  isUnlocked,
}: {
  mutation: Mutation;
  unlockedAt: string | undefined;
  isUnlocked: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const color = rarityColor(mutation.rarity, theme);
  return (
    <View style={[styles.card, isUnlocked && { borderColor: color + '66' }]}>
      <View style={styles.cardHeader}>
        <Icon
          name={isUnlocked ? 'sparkle' : 'lock'}
          size={18}
          color={isUnlocked ? color : theme.colors.textSecondary}
          strokeWidth={2.2}
        />
        <Typography variant="body"
          style={[
            styles.cardName,
            !isUnlocked && styles.cardNameLocked,
          ]}
        >
          {isUnlocked ? mutation.name : '???'}
        </Typography>
      </View>
      <Typography variant="body" style={[styles.cardDesc, !isUnlocked && styles.cardDescLocked]}>
        {isUnlocked
          ? mutation.description
          : 'Algo ligado ao caminho dela. Continue cuidando de você — vai aparecer quando for hora.'}
      </Typography>
      {isUnlocked && unlockedAt && (
        <Typography variant="body" style={styles.cardDate}>
          desbloqueada em {new Date(unlockedAt).toLocaleDateString('pt-BR')}
        </Typography>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    scroll: { padding: theme.spacing.lg, gap: theme.spacing.md },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1, borderColor: theme.colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    h1: {
      ...theme.text.h1,
      color: theme.colors.text,
      fontSize: 28,
      letterSpacing: -0.5,
    },
    subtitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    empty: {
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyTitle: {
      ...theme.text.h2,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 22,
      textAlign: 'center',
    },
    emptyBody: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    group: { gap: theme.spacing.sm },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: theme.spacing.sm,
      paddingHorizontal: 2,
    },
    rarityDot: {
      width: 10, height: 10, borderRadius: 5,
    },
    rarityLabel: {
      ...theme.text.xs,
      fontWeight: '800',
      letterSpacing: 0.8,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 11,
    },
    rarityCount: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10.5,
    },
    card: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardName: {
      ...theme.text.bodyBold,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 18,
      letterSpacing: -0.2,
      flex: 1,
    },
    cardNameLocked: {
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    cardDesc: {
      ...theme.text.sm,
      color: theme.colors.text,
      lineHeight: 19,
    },
    cardDescLocked: {
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    cardDate: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10.5,
      marginTop: 4,
    },
  });
}
