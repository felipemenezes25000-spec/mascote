/**
 * HomeSkeleton — placeholder cinematográfico durante hydration + font load.
 *
 * Substitui o ActivityIndicator genérico do root layout por uma "fantasia" da
 * Home real: header, hero, bars, daily reward, mission, quick actions e chips.
 * Sensação premium = perceived performance: o user já entende a estrutura
 * antes do conteúdo real aparecer.
 *
 * O `Skeleton` shimmer já está no projeto — aqui só compomos a topologia.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { useTheme } from '@/lib/useTheme';

export function HomeSkeleton() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Skeleton width={38} height={38} radius={19} />
            <View style={{ gap: 6 }}>
              <Skeleton width={80} height={10} radius={4} />
              <Skeleton width={120} height={24} radius={6} />
            </View>
          </View>
          <View style={styles.headerActions}>
            <Skeleton width={70} height={28} radius={14} />
            <Skeleton width={42} height={42} radius={21} />
          </View>
        </View>

        {/* Hero */}
        <View style={styles.section}>
          <Skeleton width="100%" height={320} radius={theme.radius.xl} />
        </View>

        {/* Bars row */}
        <View style={[styles.section, styles.row]}>
          <Skeleton width="100%" height={70} radius={theme.radius.lg} style={{ flex: 1 } as any} />
          <Skeleton width="100%" height={70} radius={theme.radius.lg} style={{ flex: 1 } as any} />
        </View>

        {/* Daily reward */}
        <View style={styles.section}>
          <Skeleton width="100%" height={90} radius={theme.radius.lg} />
        </View>

        {/* Combo + event */}
        <View style={[styles.section, styles.row]}>
          <Skeleton width="100%" height={140} radius={theme.radius.lg} style={{ flex: 1 } as any} />
          <Skeleton width="100%" height={140} radius={theme.radius.lg} style={{ flex: 1 } as any} />
        </View>

        {/* Mission card */}
        <View style={styles.section}>
          <Skeleton width="100%" height={140} radius={theme.radius.lg} />
        </View>

        {/* Quick actions */}
        <View style={[styles.section, styles.row]}>
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={68} radius={theme.radius.lg} style={{ flex: 1 } as any} />
          ))}
        </View>

        {/* Habit chips */}
        <View style={styles.section}>
          <Skeleton width={140} height={22} radius={6} />
          <View style={[styles.chips]}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} width={92} height={36} radius={999} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 16, gap: 16, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { paddingHorizontal: 22, gap: 10 },
  row: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
});
