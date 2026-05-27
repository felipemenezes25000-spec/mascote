import { Typography } from '@/components/ui';
/**
 * HomeHeader — 2 linhas: saudação + sino; nome + recursos.
 * Em telas estreitas usa saudação compacta para evitar truncamento.
 */
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationBell } from '@/components/NotificationBell';
import { WalletPills } from '@/components/WalletPills';
import { greetingForCompact } from '@/features/home/helpers';
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
  const { width } = useWindowDimensions();
  // V2 fix: bumped threshold de 380 para 412 — iPhone 14 (390) e Pixel 5 (393)
  // truncavam "BOA MADRUGADA" no header. Cobre todos os populares e ainda usa
  // saudação completa em tablets (>= 768).
  const narrow = width < 412;
  const displayGreet = narrow ? greetingForCompact(new Date().getHours()) : greet;
  const firstName = profile.display_name?.split(' ')[0] ?? 'Você';

  return (
    <View style={styles.wrap}>
      <View style={styles.row1}>
        <View style={styles.row1Left}>
          {showBrand && <BrandLogo size={34} shadow={false} />}
          <Typography variant="mono" tone="dim" style={styles.kicker} numberOfLines={1}>
            {displayGreet}
          </Typography>
        </View>
        <NotificationBell profileId={profile.id} refreshKey={notifKey} />
      </View>
      <View style={styles.row2}>
        <Typography
          accessibilityRole="header"
          variant="title"
          numberOfLines={1}
          style={styles.greeting}
        >
          {firstName}
        </Typography>
        <WalletPills
          coins={wallet?.coins ?? 0}
          gems={wallet?.gems ?? 0}
          streakDays={streak?.current_streak}
        />
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    row1: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    row1Left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    row2: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    kicker: { fontWeight: '700', letterSpacing: 1.2, flex: 1 },
    greeting: {
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.4,
      flex: 1,
      minWidth: 0,
    },
  });
}
