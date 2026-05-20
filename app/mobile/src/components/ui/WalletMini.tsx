/**
 * WalletMini — dois StatPills lado-a-lado: coins + gems.
 * Versão compacta para header da Home (a versão completa é WalletPills).
 */
import { View, StyleSheet } from 'react-native';
import { StatPill } from './StatPill';
import type { Wallet } from '@/types';

interface Props {
  wallet: Wallet;
  onPress?: () => void;
}

export function WalletMini({ wallet }: Props) {
  return (
    <View style={styles.wrap}>
      <StatPill icon="coins" tone="gold" label="" value={wallet.coins} />
      <StatPill icon="gem" tone="lilac" label="" value={wallet.gems} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});
