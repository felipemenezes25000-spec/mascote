import { Typography } from '@/components/ui';
/**
 * HomeMissionCard — missão do dia + entrada para mystery box.
 * Empty state quando ainda não há missão.
 */
import { View, StyleSheet } from 'react-native';
import { useStyles } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/themes';
import { MissionCard } from '@/components/MissionCard';
import { MysteryBoxCard } from '@/components/MysteryBoxCard';
import type { Mission } from '@/types';

interface Props {
  mission: Mission | null;
  onPressMission: () => void;
  boxAvailable: boolean;
  onOpenBox: () => void;
}

export function HomeMissionCard({ mission, onPressMission, boxAvailable, onOpenBox }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.section, styles.missionRow]}>
      <View style={{ flex: 1 }}>
        {mission ? (
          <MissionCard
            title={mission.title}
            description={mission.description}
            xp={mission.xp_reward}
            completed={mission.status === 'completed'}
            onPress={onPressMission}
          />
        ) : (
          <View style={styles.missionEmpty} accessibilityRole="text">
            <Typography variant="bodyBold">{t('home.mission.empty_title')}</Typography>
            <Typography variant="mono" tone="secondary">
              {t('home.mission.empty_body')}
            </Typography>
          </View>
        )}
      </View>
      <MysteryBoxCard available={boxAvailable} onOpen={onOpenBox} />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    section: { gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
    missionRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'stretch' },
    missionEmpty: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      justifyContent: 'center',
      gap: 4,
      minHeight: 88,
    },
  });
}
