/**
 * HomeHeader — saudação + brand + wallet pills + bell.
 * Mantém compacto e legível: trunca nome em telas estreitas (<360px).
 */
import { View, StyleSheet } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationBell } from '@/components/NotificationBell';
import { WalletPills } from '@/components/WalletPills';
import { Typography } from '@/components/ui';
import type { Profile, Streak, Wallet } from '@/types';

interface Props {
  profile: Profile;
  wallet: Wallet | null;
  streak: Streak | null;
  notifKey?: number;
  greet: string;
  showBrand: boolean;
}

export function HomeHeader({ profile, wallet, streak, notifKey, greet, showBrand }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.headerRow}>
      <View style={styles.brandRow}>
        {showBrand && <BrandLogo size={38} shadow={false} />}
        <View style={styles.nameBlock}>
          <Typography variant="mono" tone="dim" style={styles.kicker} numberOfLines={1}>
            {greet}
          </Typography>
          <Typography
            accessibilityRole="header"
            variant="title"
            numberOfLines={1}
            style={styles.greeting}
          >
            {profile.display_name?.split(' ')[0] ?? 'Você'}
          </Typography>
        </View>
      </View>
      <View style={styles.headerActions}>
        <WalletPills
          coins={wallet?.coins ?? 0}
          gems={wallet?.gems ?? 0}
          streakDays={streak?.current_streak}
        />
        <NotificationBell profileId={profile.id} refreshKey={notifKey} />
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1, minWidth: 0 },
    nameBlock: { flex: 1, minWidth: 0 },
    kicker: { fontWeight: '700', letterSpacing: 1.6, marginBottom: 2 },
    greeting: { fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  });
}
