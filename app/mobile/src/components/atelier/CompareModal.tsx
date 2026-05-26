/**
 * CompareModal — split antes/depois pro Ateliê.
 *
 * Modal centrado mostrando 2 mascotes lado a lado:
 *  - "Antes" usa initial customization (ou null = pure DNA)
 *  - "Depois" usa draft atual
 *
 * Útil pro usuário decidir se vale salvar.
 */

import { StyleSheet, View } from 'react-native';
import { MascotRenderer } from '@/components/MascotRenderer';
import { ModalShell } from '@/components/ui/ModalShell';
import { Typography } from '@/components/ui';
import { useTheme } from '@/lib/useTheme';
import type { Mascot, MascotCustomization } from '@/types';

export interface CompareModalProps {
  visible: boolean;
  onClose: () => void;
  mascot: Mascot;
  beforeCustomization: MascotCustomization | null;
  afterCustomization: MascotCustomization | null;
}

export function CompareModal({
  visible,
  onClose,
  mascot,
  beforeCustomization,
  afterCustomization,
}: CompareModalProps) {
  const theme = useTheme();
  const previewSize = 140;

  return (
    <ModalShell visible={visible} onClose={onClose} title="Antes & Depois">
      <View style={styles.row}>
        <View style={styles.column}>
          <View
            style={[
              styles.previewSurface,
              {
                width: previewSize + 32,
                height: previewSize + 32,
                backgroundColor: theme.colors.bg,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <MascotRenderer
              personality={mascot.personality}
              phase={mascot.phase}
              mood={mascot.mood}
              size={previewSize}
              customization={beforeCustomization}
              reduceMotion
            />
          </View>
          <Typography variant="caption" tone="secondary">
            antes
          </Typography>
        </View>

        <View style={styles.column}>
          <View
            style={[
              styles.previewSurface,
              {
                width: previewSize + 32,
                height: previewSize + 32,
                backgroundColor: theme.colors.bg,
                borderColor: theme.colors.primary,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <MascotRenderer
              personality={mascot.personality}
              phase={mascot.phase}
              mood={mascot.mood}
              size={previewSize}
              customization={afterCustomization}
              reduceMotion
            />
          </View>
          <Typography variant="caption" tone="brand" style={{ fontWeight: '700' }}>
            depois
          </Typography>
        </View>
      </View>

      <Typography variant="caption" tone="secondary" align="center">
        Os dois mascotes têm o mesmo DNA — só muda a camada de customização.
      </Typography>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  column: {
    alignItems: 'center',
    gap: 6,
  },
  previewSurface: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
