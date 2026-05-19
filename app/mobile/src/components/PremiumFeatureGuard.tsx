/**
 * Guard de features premium — wrapper declarativo.
 */

import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { BillingTierId } from '@/content/billing';
import { entitlementService } from '@/services/subscription/EntitlementService';
import { useTheme } from '@/lib/useTheme';

interface Props {
  tier: BillingTierId;
  feature: 'scene' | 'chat' | 'report' | 'evolution' | 'mutation' | 'legendary';
  sceneId?: string;
  mutationRarity?: string;
  children: ReactNode;
  onLockedPress?: () => void;
}

export function PremiumFeatureGuard({ tier, feature, sceneId, mutationRarity, children, onLockedPress }: Props) {
  const theme = useTheme();
  let allowed = true;

  if (feature === 'scene' && sceneId) {
    allowed = entitlementService.canAccessScene(tier, sceneId);
  } else if (feature === 'report') {
    allowed = entitlementService.canViewFullWeeklyReport(tier);
  } else if (feature === 'evolution') {
    allowed = tier !== 'free';
  } else if (feature === 'mutation' && mutationRarity) {
    allowed = entitlementService.canAccessPremiumMutation(tier, mutationRarity);
  } else if (feature === 'legendary') {
    allowed = entitlementService.canAccessLegendaryForm(tier);
  }

  if (allowed) return <>{children}</>;

  return (
    <View style={[styles.wrap, { borderColor: theme.colors.border }]}>
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
        Recurso Plus
      </Text>
      <Pressable
        onPress={() => {
          onLockedPress?.();
          router.push({ pathname: '/paywall', params: { trigger: 'premium_feature' } });
        }}
        accessibilityRole="button"
      >
        <Text style={[styles.link, { color: theme.colors.primary }]}>Conhecer Plus →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  text: { fontSize: 14 },
  link: { fontWeight: '700', fontSize: 14 },
});
