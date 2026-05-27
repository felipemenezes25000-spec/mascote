/**
 * FpsCounter — overlay simples mostrando FPS em DEV mode.
 *
 * Usa requestAnimationFrame pra contar frames numa janela móvel de 1s.
 * Útil pra detectar regressões de perf no preview (1 mascote 3D + 4 mini
 * personality swatches + auto-save tick).
 *
 * NÃO renderiza em release builds (gate __DEV__).
 *
 * Posicionamento: absolute top-right por padrão, pra não bloquear interação.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Typography } from '@/components/ui';
import { useTheme } from '@/lib/useTheme';

export interface FpsCounterProps {
  /** Top offset em px. Default 8. */
  top?: number;
  /** Right offset em px. Default 8. */
  right?: number;
}

export function FpsCounter({ top = 8, right = 8 }: FpsCounterProps) {
  if (!__DEV__) return null;
  return <FpsCounterImpl top={top} right={right} />;
}

function FpsCounterImpl({ top, right }: FpsCounterProps) {
  const theme = useTheme();
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let raf: number;
    let frames = 0;
    let lastTime = performance.now();

    const tick = (): void => {
      frames += 1;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Color hint: vermelho < 30, amarelo 30-50, verde ≥ 50.
  const color = fps < 30 ? '#FF6B6B' : fps < 50 ? '#FFD93D' : '#6BFF8C';

  return (
    <View
      style={[
        styles.box,
        {
          top,
          right,
          pointerEvents: 'none' as const,
          backgroundColor: theme.colors.bg + 'CC',
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Typography variant="mono" style={{ fontSize: 9, color, letterSpacing: 0.5 }}>
        {fps} FPS
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    zIndex: 1000,
  },
});
