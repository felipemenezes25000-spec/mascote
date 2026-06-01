/**
 * ModalShell — wrapper genérico para Modal RN com:
 *  - backdrop dimmed (theme.colors.overlay)
 *  - card centralizado
 *  - botão fechar no topo
 *  - safe-area
 *
 * Substitui Modal customizado em ad-hoc por componente reusável.
 */
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Icon } from '@/components/Icon';
import { Typography } from './Typography';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Bottom sheet style — desliza de baixo, full-width. Default: false (centered card). */
  bottomSheet?: boolean;
}

export function ModalShell({ visible, onClose, title, children, bottomSheet }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      transparent
      animationType={bottomSheet ? 'slide' : 'fade'}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar modal"
        onPress={onClose}
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
      />
      <SafeAreaView style={[styles.safe, bottomSheet && styles.safeBottom, { pointerEvents: 'box-none' }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl },
            bottomSheet && styles.cardSheet,
          ]}
        >
          <View style={styles.header}>
            <Typography variant="heading" style={{ flex: 1 }}>{title ?? ''}</Typography>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar" accessibilityRole="button">
              <Icon name="x" size={20} color={theme.colors.textSecondary} strokeWidth={2.2} />
            </Pressable>
          </View>
          {children}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * BottomSheet é um alias do `ModalShell` com `bottomSheet=true`.
 * Mantém API discoverable (não precisa lembrar da prop).
 */
export function BottomSheet(props: Omit<Props, 'bottomSheet'>) {
  return <ModalShell {...props} bottomSheet />;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject },
    safe: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
    safeBottom: { justifyContent: 'flex-end', padding: 0 },
    card: {
      width: '100%',
      maxWidth: 480,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      ...theme.shadow.md,
    },
    cardSheet: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      maxWidth: 600,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  });
}
