import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { notifications } from '@/lib/db';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

interface Props {
  profileId: string;
  refreshKey?: number;
}

export function NotificationBell({ profileId, refreshKey }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const [unread, setUnread] = useState(0);
  // Guard contra "setState after unmount" — header pode desmontar rápido em
  // navegação entre tabs enquanto o read do AsyncStorage ainda está pending.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [profileId, refreshKey]);

  async function refresh() {
    const count = await notifications.unreadCount(profileId);
    if (mountedRef.current) setUnread(count);
  }

  return (
    <PressableScale
      onPress={() => router.push('/notifications')}
      style={styles.btn}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Notificações${unread > 0 ? `, ${unread} não lida(s)` : ''}`}
    >
      <Icon name="bell" size={18} color={theme.colors.text} strokeWidth={2} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    btn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.sm,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      backgroundColor: theme.colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.bg,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      fontFamily: 'PlusJakartaSans_700Bold',
    },
  });
}
