/**
 * ConfirmDialog — modal de confirmação com 2 botões (cancelar/confirmar).
 * Use para destructive actions (apagar, sair, cancelar assinatura).
 */
import { View, StyleSheet } from 'react-native';
import { ModalShell } from './ModalShell';
import { Button } from '@/components/Button';
import { Typography } from './Typography';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <ModalShell visible={visible} onClose={onCancel} title={title}>
      {message ? <Typography tone="secondary">{message}</Typography> : null}
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button label={cancelLabel} variant="ghost" onPress={onCancel} />
        </View>
        <View style={styles.action}>
          <Button
            label={confirmLabel}
            variant={destructive ? 'secondary' : 'primary'}
            onPress={onConfirm}
          />
        </View>
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  action: { flex: 1 },
});
