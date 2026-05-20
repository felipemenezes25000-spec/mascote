/**
 * Mascot3DLazy — wrapper lazy + Suspense pro Mascot3D.
 *
 * Por que existe: Mascot3D depende do Three (~300kb) + R3F (~200kb). Em telas
 * que não usam mascote (paywall, onboarding antes de criar mascote) era um
 * pé pesado no bundle inicial.
 *
 * Com `React.lazy`, o `import('./Mascot3D')` só vira parte do bundle quando
 * algum componente realmente o renderiza. No web, o `Suspense` mostra um
 * placeholder transparente; no nativo o lazy ainda economiza memória de
 * inicialização (chunks paralelizados).
 *
 * O fallback usa o size pra evitar layout shift.
 */
import { lazy, Suspense, type ComponentProps } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const Mascot3D = lazy(() =>
  import('./Mascot3D').then(m => ({ default: m.Mascot3D })),
);

type Mascot3DProps = ComponentProps<typeof Mascot3D>;

interface Props extends Mascot3DProps {
  size: number;
}

export function Mascot3DLazy(props: Props) {
  return (
    <Suspense fallback={<Placeholder size={props.size} />}>
      <Mascot3D {...props} />
    </Suspense>
  );
}

function Placeholder({ size }: { size: number }) {
  return (
    <View style={[styles.placeholder, { width: size, height: size }]}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
