# RevenueCat — integração futura

Snippet de referência para quando `react-native-purchases` estiver no `package.json` e o app tiver rebuild EAS (não funciona em Expo Go).

## Inicialização (`app/_layout.tsx`)

```ts
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';
import {
  getRevenueCatConfig,
  revenueCatUnavailableMessage,
} from '@/services/subscription/RevenueCatBillingProvider';

export async function initRevenueCat(userId: string | undefined): Promise<void> {
  const config = getRevenueCatConfig();

  if (!config.ready) {
    logger.dev('[billing] RevenueCat skip init', {
      reason: revenueCatUnavailableMessage(config),
      readiness: config.readiness,
    });
    return;
  }

  // import Purchases from 'react-native-purchases';
  // const apiKey =
  //   Platform.OS === 'ios'
  //     ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
  //     : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  // ...
}

// useEffect(() => { void initRevenueCat(profile?.id); }, [profile?.id]);
```

## `purchase()` em `RevenueCatBillingProvider.ts`

Substitua o body de `purchase()` pelo fluxo `getOfferings` → `purchasePackage` → `localSubscriptionRepo.setTier`, com tratamento de `userCancelled`.
