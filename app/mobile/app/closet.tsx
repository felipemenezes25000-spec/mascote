import { router, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { MascotAmbient } from '@/components/MascotAmbient';
import { PressableScale } from '@/components/PressableScale';
import { SceneBackground } from '@/components/SceneBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { accessoryCatalog, checkUnlock as checkAccUnlock, getAccessory } from '@/content/accessories';
import { checkSceneUnlock, scenesCatalog } from '@/content/scenes';
import { Alert } from 'react-native';
import { inventory, userScenes, wallet as walletDb } from '@/lib/db';
import { entitlementService } from '@/services/subscription/EntitlementService';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const ACC_PRICES: Record<string, number> = {
  cap: 80,
  glasses: 120,
  bow: 100,
  scarf: 150,
  flower: 180,
  headphones: 220,
  crown: 300,
  star: 200,
  monocle: 220,
  mask: 240,
  cape: 280,
  leaf: 90,
  cookie: 160,
  horn: 500,
};

const SCENE_PRICES: Record<string, number> = {
  forest: 100,
  beach: 150,
  library: 250,
  cafe: 200,
  lunar: 280,
  mountain: 140,
  garden: 130,
  aurora: 350,
  temple: 320,
};

export default function Closet() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const wallet = useStore(s => s.wallet);
  const refreshWallet = useStore(s => s.refreshWallet);
  const { tier } = useSubscriptionTier();
  const [ownedAccIds, setOwnedAccIds] = useState<Set<string>>(new Set());
  const [equippedId, setEquippedId] = useState<string | null>(null);
  const [ownedSceneIds, setOwnedSceneIds] = useState<Set<string>>(new Set());
  const [activeSceneId, setActiveSceneId] = useState<string>('room');
  const [tab, setTab] = useState<'accessories' | 'scenes'>('accessories');

  useEffect(() => {
    if (!profile) return;
    void load();
  }, [profile?.id]);

  async function load() {
    if (!profile) return;
    const owned = await inventory.listOwned(profile.id);
    setOwnedAccIds(new Set(owned.map(o => o.accessory_id)));
    setEquippedId(owned.find(o => o.equipped)?.accessory_id ?? null);
    const scenes = await userScenes.listUnlocked(profile.id);
    setOwnedSceneIds(new Set(scenes.map(s => s.scene_id)));
    const active = await userScenes.getActive(profile.id);
    setActiveSceneId(active);
  }

  if (!profile || !mascot) return <Redirect href="/splash" />;

  async function equip(id: string) {
    if (!profile) return;
    if (equippedId === id) {
      await inventory.unequip(profile.id, id);
      setEquippedId(null);
      await load();
      return;
    }
    const meta = getAccessory(id);
    const owned = await inventory.listOwned(profile.id);
    const allOwned = owned
      .map(o => {
        const m = getAccessory(o.accessory_id);
        return m ? { id: m.id, slot: m.slot as string } : null;
      })
      .filter(Boolean) as Array<{ id: string; slot: string }>;
    await inventory.equip(profile.id, id, meta ? { current: meta.slot, allOwned } : undefined);
    setEquippedId(id);
    await load();
  }

  async function buyAccessory(id: string, price: number) {
    if (!profile) return;
    const meta = getAccessory(id);
    if (!meta) return;
    const canUnlock = checkAccUnlock(meta, accCtx);
    if (!canUnlock) {
      Alert.alert('Ainda bloqueado', meta.unlock.label);
      return;
    }
    if ((wallet?.coins ?? 0) < price) {
      Alert.alert('Moedas insuficientes', `Custa ${price} 🪙. Você tem ${wallet?.coins ?? 0}.`);
      return;
    }
    const spent = await walletDb.spend(profile.id, price, 0);
    if (!spent) {
      Alert.alert('Não foi possível', 'Saldo mudou. Tenta de novo.');
      return;
    }
    // Spend já saiu — se inventory.unlock falhar, devolve as moedas pra
    // evitar perda silenciosa do saldo (acontece se AsyncStorage corromper
    // a tabela de inventário entre os dois writes). Sem este try, o usuário
    // perdia coins sem o acessório.
    try {
      await inventory.unlock(profile.id, id);
    } catch (err) {
      await walletDb.add(profile.id, price, 0);
      await refreshWallet();
      Alert.alert('Não foi possível', 'Reverti a compra. Tenta de novo.');
      return;
    }
    await refreshWallet();
    await load();
    Alert.alert('Comprado!', 'Equipe quando quiser.');
  }

  async function buyScene(id: string, price: number) {
    if (!profile) return;
    if (!entitlementService.canAccessScene(tier, id)) {
      router.push({ pathname: '/paywall', params: { trigger: 'premium_feature' } });
      return;
    }
    const scene = scenesCatalog.find(s => s.id === id);
    if (!scene) return;
    const canUnlock = checkSceneUnlock(scene, {
      level: mascot?.level ?? 1,
      longestStreak: streak?.longest_streak ?? 0,
      currentStreak: streak?.current_streak ?? 0,
    });
    if (!canUnlock) {
      Alert.alert('Ainda bloqueado', scene.unlock.label);
      return;
    }
    if ((wallet?.coins ?? 0) < price) {
      Alert.alert('Moedas insuficientes', `Custa ${price} 🪙. Você tem ${wallet?.coins ?? 0}.`);
      return;
    }
    const spent = await walletDb.spend(profile.id, price, 0);
    if (!spent) {
      Alert.alert('Não foi possível', 'Saldo mudou. Tenta de novo.');
      return;
    }
    // Mesma razão de buyAccessory: refund se userScenes.unlock quebrar.
    try {
      await userScenes.unlock(profile.id, id);
    } catch (err) {
      await walletDb.add(profile.id, price, 0);
      await refreshWallet();
      Alert.alert('Não foi possível', 'Reverti a compra. Tenta de novo.');
      return;
    }
    await refreshWallet();
    await load();
    Alert.alert('Cenário comprado!', 'Toca em "Usar" pra ativar.');
  }

  async function activateScene(id: string) {
    if (!profile) return;
    if (!entitlementService.canAccessScene(tier, id)) {
      router.push({ pathname: '/paywall', params: { trigger: 'premium_feature' } });
      return;
    }
    await userScenes.setActive(profile.id, id);
    setActiveSceneId(id);
  }

  const accCtx = {
    level: mascot.level,
    currentStreak: streak?.current_streak ?? 0,
    longestStreak: streak?.longest_streak ?? 0,
  };
  const equipped = equippedId ? getAccessory(equippedId) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="modal" title="Guarda-roupa" subtitle="personalize seu mascote" />

      <View style={styles.preview}>
        <SceneBackground sceneId={activeSceneId} height={220}>
          <MascotAmbient size={170}>
            <Mascot
              personality={mascot.personality}
              phase={mascot.phase}
              mood="feliz"
              size={170}
              accessory={equipped ? { emoji: equipped.emoji, slot: equipped.slot } : null}
            />
          </MascotAmbient>
        </SceneBackground>
      </View>

      <View style={styles.tabs}>
        <PressableScale
          onPress={() => setTab('accessories')}
          style={[styles.tab, tab === 'accessories' && styles.tabActive]}
        >
          <Icon
            name="package"
            size={14}
            color={tab === 'accessories' ? '#fff' : theme.colors.textSecondary}
            strokeWidth={2.2}
          />
          <Text style={[styles.tabText, tab === 'accessories' && styles.tabTextActive]}>
            Acessórios
          </Text>
        </PressableScale>
        <PressableScale
          onPress={() => setTab('scenes')}
          style={[styles.tab, tab === 'scenes' && styles.tabActive]}
        >
          <Icon
            name="sparkles"
            size={14}
            color={tab === 'scenes' ? '#fff' : theme.colors.textSecondary}
            strokeWidth={2.2}
          />
          <Text style={[styles.tabText, tab === 'scenes' && styles.tabTextActive]}>
            Cenários
          </Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'accessories' ? (
          accessoryCatalog.map(acc => {
            const owned = ownedAccIds.has(acc.id);
            const equipable = owned;
            const canUnlock = checkAccUnlock(acc, accCtx);
            const isEquipped = equippedId === acc.id;
            return (
              <View key={acc.id} style={[styles.item, !owned && styles.itemLocked]}>
                <View style={styles.itemEmoji}>
                  {/* mostrar emoji desaturado + badge de lock pra dar preview */}
                  <Text style={{ fontSize: 30, opacity: owned ? 1 : 0.35 }}>{acc.emoji}</Text>
                  {!owned && (
                    <View style={styles.lockBadge}>
                      <Icon name="lock" size={11} color={theme.colors.textSecondary} strokeWidth={2.2} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{acc.name}</Text>
                  <Text style={styles.itemSub}>{acc.description}</Text>
                  {!owned && (
                    <View style={styles.hintRow}>
                      <Text style={styles.itemHint}>{acc.unlock.label}</Text>
                      {canUnlock && (
                        <View style={styles.readyBadge}>
                          <Icon name="check" size={9} color={theme.colors.success} strokeWidth={3} />
                          <Text style={styles.readyText}>pronto</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                {equipable ? (
                  <Button
                    variant={isEquipped ? 'secondary' : 'primary'}
                    label={isEquipped ? 'Tirar' : 'Equipar'}
                    onPress={() => equip(acc.id)}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    label={`${ACC_PRICES[acc.id] ?? 100} 🪙`}
                    onPress={() => buyAccessory(acc.id, ACC_PRICES[acc.id] ?? 100)}
                  />
                )}
              </View>
            );
          })
        ) : (
          scenesCatalog.map(sc => {
            const owned = ownedSceneIds.has(sc.id) || sc.isDefault;
            const canUnlock = checkSceneUnlock(sc, {
              level: mascot.level,
              longestStreak: streak?.longest_streak ?? 0,
              currentStreak: streak?.current_streak ?? 0,
            });
            const isActive = activeSceneId === sc.id;
            return (
              <View key={sc.id} style={[styles.item, !owned && styles.itemLocked]}>
                <View style={styles.itemEmoji}>
                  <Text style={{ fontSize: 30, opacity: owned ? 1 : 0.35 }}>{sc.emoji}</Text>
                  {!owned && (
                    <View style={styles.lockBadge}>
                      <Icon name="lock" size={11} color={theme.colors.textSecondary} strokeWidth={2.2} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{sc.name}</Text>
                  <Text style={styles.itemSub}>{sc.description}</Text>
                  {!owned && (
                    <View style={styles.hintRow}>
                      <Text style={styles.itemHint}>{sc.unlock.label}</Text>
                      {canUnlock && (
                        <View style={styles.readyBadge}>
                          <Icon name="check" size={9} color={theme.colors.success} strokeWidth={3} />
                          <Text style={styles.readyText}>pronto</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                {owned ? (
                  <Button
                    variant={isActive ? 'secondary' : 'primary'}
                    label={isActive ? 'Ativo' : 'Usar'}
                    onPress={() => activateScene(sc.id)}
                    disabled={isActive}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    label={`${SCENE_PRICES[sc.id] ?? 100} 🪙`}
                    onPress={() => buyScene(sc.id, SCENE_PRICES[sc.id] ?? 100)}
                  />
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  preview: { paddingHorizontal: theme.spacing.lg },
  tabs: {
    flexDirection: 'row',
    margin: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
  },
  tabActive: { backgroundColor: theme.colors.primary, ...theme.shadow.sm },
  tabText: {
    ...theme.text.bodyBold,
    color: theme.colors.textSecondary,
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.1,
  },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  itemLocked: { opacity: 0.78 },
  itemEmoji: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lockBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    color: theme.colors.text,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  itemSub: { ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 14 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  itemHint: {
    ...theme.text.xs,
    color: theme.colors.primary,
    fontWeight: '600',
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10.5,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.success + '20',
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
  },
  readyText: {
    fontSize: 9,
    color: theme.colors.success,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: 'JetBrainsMono_500Medium',
  },
});
}
