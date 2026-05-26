/**
 * CompareModal — split antes/depois pro Atelie (opcionalmente comparar 3).
 *
 * Modal centrado mostrando 2 mascotes lado a lado por padrao:
 *  - "antes" usa initial customization (ou null = pure DNA)
 *  - "depois" usa draft atual
 *
 * Se `thirdCustomization` for passado, renderiza uma 3a coluna
 * (ex.: comparar com um look salvo). `thirdLabel` customiza o caption.
 *
 * Util pro usuario decidir se vale salvar ou pra colocar lado a lado
 * com um look antigo antes de sobrescrever.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
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
  /** Opcional: 3a coluna pra comparar com look salvo, snapshot, etc. */
  thirdCustomization?: MascotCustomization | null;
  /** Caption da 3a coluna. Default: "salvo". */
  thirdLabel?: string;
}

export function CompareModal({
  visible,
  onClose,
  mascot,
  beforeCustomization,
  afterCustomization,
  thirdCustomization,
  thirdLabel = 'salvo',
}: CompareModalProps) {
  const theme = useTheme();
  // Com 3 colunas reduzimos o tamanho pra caber sem scroll horizontal
  // em maioria dos devices. 2 colunas mantem o tamanho original.
  const hasThird = thirdCustomization !== undefined;
  const previewSize = hasThird ? 110 : 140;

  return (
    <ModalShell visible={visible} onClose={onClose} title="Antes & Depois">
      <ScrollView
        horizontal
        contentContainerStyle={styles.row}
        showsHorizontalScrollIndicator={false}
      >
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

        {hasThird ? (
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
                  borderStyle: 'dashed',
                },
              ]}
            >
              <MascotRenderer
                personality={mascot.personality}
                phase={mascot.phase}
                mood={mascot.mood}
                size={previewSize}
                customization={thirdCustomization ?? null}
                reduceMotion
              />
            </View>
            <Typography variant="caption" tone="secondary">
              {thirdLabel}
            </Typography>
          </View>
        ) : null}
      </ScrollView>

      <Typography variant="caption" tone="secondary" align="center">
        Mesma DNA — só muda a camada de customização.
      </Typography>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 4,
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
