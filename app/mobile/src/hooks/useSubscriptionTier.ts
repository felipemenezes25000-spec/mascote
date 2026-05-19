import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { BillingTierId } from '@/content/billing';
import { subscriptionService } from '@/services/subscription';
import { useStore } from '@/store';

export function useSubscriptionTier() {
  const profile = useStore(s => s.profile);
  const [tier, setTier] = useState<BillingTierId>('free');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profile) {
      setTier('free');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTier(await subscriptionService.getCurrentTier(profile.id));
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    tier,
    loading,
    isPremium: subscriptionService.isPremium(tier),
    refresh,
  };
}
