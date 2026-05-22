/**
 * Setup global pros testes.
 *
 * AsyncStorage e outras APIs do React Native precisam de mock pra rodar em
 * Node/JSDOM. Aqui mockamos in-memory simples — suficiente pra testar lógica
 * de banco. Componentes (View/Text/Pressable) viram React primitives que
 * @testing-library/react-native renderiza via react-test-renderer.
 */

import { createElement, forwardRef } from 'react';
import { vi } from 'vitest';

// ============= AsyncStorage in-memory =============
const store = new Map<string, string>();

const asyncStorageMock = {
  getItem: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
  setItem: vi.fn((k: string, v: string) => {
    store.set(k, v);
    return Promise.resolve();
  }),
  removeItem: vi.fn((k: string) => {
    store.delete(k);
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
  getAllKeys: vi.fn(() => Promise.resolve(Array.from(store.keys()))),
  multiGet: vi.fn((keys: string[]) =>
    Promise.resolve(keys.map(k => [k, store.get(k) ?? null]))
  ),
  multiSet: vi.fn((pairs: [string, string][]) => {
    for (const [k, v] of pairs) store.set(k, v);
    return Promise.resolve();
  }),
  multiRemove: vi.fn((keys: string[]) => {
    for (const k of keys) store.delete(k);
    return Promise.resolve();
  }),
  __reset: () => store.clear(),
};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: asyncStorageMock,
}));

vi.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: vi.fn(() => ({})),
  requireNativeModule: vi.fn(() => ({})),
}));

// ============= React Native mock (full enough p/ renderHook + render) =============
// O bundle real do RN tem código Flow que vitest não parseia. Em vez de carregar
// o bundle, exportamos componentes primitivos que react-test-renderer consegue
// processar — eles delegam pra createElement direto. children + props passam,
// é tudo que renderHook precisa.

function makeHostComponent(tagName: string) {
  // forwardRef pra propagar refs (alguns componentes do app passam ref).
  return forwardRef<unknown, Record<string, unknown>>((props, ref) =>
    createElement(tagName, { ...props, ref })
  );
}

vi.mock('react-native', () => {
  const View = makeHostComponent('rn-view');
  const Text = makeHostComponent('rn-text');
  const Pressable = makeHostComponent('rn-pressable');
  const ScrollView = makeHostComponent('rn-scrollview');
  const TextInput = makeHostComponent('rn-textinput');
  const Image = makeHostComponent('rn-image');
  const Switch = makeHostComponent('rn-switch');
  const TouchableOpacity = makeHostComponent('rn-touchable-opacity');
  const ActivityIndicator = makeHostComponent('rn-activity-indicator');
  const FlatList = makeHostComponent('rn-flatlist');
  const SafeAreaView = makeHostComponent('rn-safearea');
  const KeyboardAvoidingView = makeHostComponent('rn-kav');

  return {
    Platform: {
      OS: 'web',
      select: function select(opts: { web?: unknown; default?: unknown; ios?: unknown; android?: unknown }) {
        return opts.web ?? opts.default;
      },
    },
    StyleSheet: {
      create: function create(x: unknown) { return x; },
      flatten: (x: unknown) => x,
      absoluteFill: {},
      absoluteFillObject: {},
      hairlineWidth: 1,
      compose: (a: unknown, b: unknown) => [a, b],
    },
    PixelRatio: {
      getFontScale: () => 1,
      get: () => 1,
      roundToNearestPixel: (n: number) => Math.round(n),
      getPixelSizeForLayoutSize: (n: number) => n,
    },
    Dimensions: {
      get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
      addEventListener: () => ({ remove: () => undefined }),
    },
    Alert: { alert: vi.fn() },
    Linking: {
      openURL: vi.fn(() => Promise.resolve()),
      canOpenURL: vi.fn(() => Promise.resolve(true)),
    },
    Appearance: {
      getColorScheme: () => 'light',
      addChangeListener: () => ({ remove: () => undefined }),
    },
    useColorScheme: () => 'light',
    useWindowDimensions: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
    AppState: {
      currentState: 'active',
      addEventListener: () => ({ remove: () => undefined }),
    },
    findNodeHandle: () => null,
    UIManager: { measure: () => undefined, measureInWindow: () => undefined },
    // Components
    View,
    Text,
    Pressable,
    ScrollView,
    TextInput,
    Image,
    Switch,
    TouchableOpacity,
    TouchableWithoutFeedback: TouchableOpacity,
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    KeyboardAvoidingView,
    Modal: makeHostComponent('rn-modal'),
    Animated: {
      View,
      Text,
      Image,
      ScrollView,
      Value: class { constructor(public _v: number) {} setValue(v: number) { this._v = v; } },
      timing: () => ({ start: (cb?: () => void) => cb?.() }),
      spring: () => ({ start: (cb?: () => void) => cb?.() }),
      sequence: () => ({ start: (cb?: () => void) => cb?.() }),
      parallel: () => ({ start: (cb?: () => void) => cb?.() }),
      loop: () => ({ start: () => undefined, stop: () => undefined }),
      createAnimatedComponent: (c: unknown) => c,
    },
    Easing: {
      linear: (t: number) => t,
      ease: (t: number) => t,
      inOut: () => (t: number) => t,
      out: () => (t: number) => t,
      in: () => (t: number) => t,
      bezier: () => (t: number) => t,
      sin: (t: number) => t,
      back: () => (t: number) => t,
      bounce: (t: number) => t,
      circle: (t: number) => t,
      exp: (t: number) => t,
      quad: (t: number) => t,
      cubic: (t: number) => t,
      poly: () => (t: number) => t,
      elastic: () => (t: number) => t,
      step0: (t: number) => t,
      step1: (t: number) => t,
    },
    InteractionManager: {
      runAfterInteractions: (cb: () => void) => { cb(); return { cancel: () => undefined }; },
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: vi.fn(() => Promise.resolve(false)),
    },
  };
});

// ============= react-native-reanimated mock =============
vi.mock('react-native-reanimated', () => {
  // Reanimated tem worklets que vitest não compila. Mock leve: hooks viram
  // identity, sharedValue retorna objeto com .value mutável.
  const View = makeHostComponent('rea-view');
  const Text = makeHostComponent('rea-text');
  const ScrollView = makeHostComponent('rea-scrollview');
  return {
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    View,
    Text,
    ScrollView,
    useSharedValue: function useSharedValue(initial: unknown) { return { value: initial }; },
    useAnimatedStyle: (fn: () => Record<string, unknown>) => {
      try { return fn(); } catch { return {}; }
    },
    useDerivedValue: function useDerivedValue(fn: () => unknown) {
      try { return { value: fn() }; } catch { return { value: undefined }; }
    },
    useAnimatedProps: (fn: () => Record<string, unknown>) => {
      try { return fn(); } catch { return {}; }
    },
    withTiming: (v: unknown) => v,
    withSpring: (v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (...vs: unknown[]) => vs[vs.length - 1],
    withDelay: (_ms: number, v: unknown) => v,
    cancelAnimation: () => undefined,
    runOnJS: function runOnJS(fn: unknown) { return fn; },
    runOnUI: function runOnUI(fn: unknown) { return fn; },
    Easing: {
      linear: (t: number) => t, ease: (t: number) => t,
      inOut: () => (t: number) => t, out: () => (t: number) => t, in: () => (t: number) => t,
      bezier: () => (t: number) => t, sin: (t: number) => t,
      back: () => (t: number) => t, bounce: (t: number) => t,
      circle: (t: number) => t, exp: (t: number) => t, quad: (t: number) => t,
      cubic: (t: number) => t, poly: () => (t: number) => t, elastic: () => (t: number) => t,
      step0: (t: number) => t, step1: (t: number) => t,
    },
    interpolate: (input: number, _inputRange: number[], outputRange: number[]) =>
      outputRange[0] ?? input,
    interpolateColor: (_v: number, _r: number[], colors: string[]) => colors[0],
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    // Entering/Exiting animations — alguns componentes (StaggeredView, etc) usam
    // FadeInDown.duration(420).delay(x).springify() como builder chain.
    FadeIn: makeEntering(),
    FadeInDown: makeEntering(),
    FadeInUp: makeEntering(),
    FadeOut: makeEntering(),
    SlideInDown: makeEntering(),
    SlideInUp: makeEntering(),
    SlideOutDown: makeEntering(),
    SlideOutUp: makeEntering(),
    ZoomIn: makeEntering(),
    ZoomOut: makeEntering(),
    Layout: makeEntering(),
  };
});

// Helper: cria um builder chain pra Gesture do react-native-gesture-handler.
function makeGestureBuilder(): Record<string, (...a: unknown[]) => unknown> {
  const b: Record<string, (...a: unknown[]) => unknown> = {};
  const methods = [
    'onUpdate', 'onEnd', 'onStart', 'onChange', 'onFinalize',
    'onTouchesDown', 'onTouchesMove', 'onTouchesUp', 'onBegin',
    'activeOffsetX', 'activeOffsetY', 'failOffsetX', 'failOffsetY',
    'minPointers', 'maxPointers', 'maxDuration', 'minDuration',
    'enabled', 'minDistance', 'minVelocity', 'numberOfTaps',
    'direction', 'minVelocityX', 'minVelocityY', 'simultaneousWithExternalGesture',
    'requireExternalGestureToFail', 'shouldCancelWhenOutside', 'manualActivation',
  ];
  for (const m of methods) b[m] = () => b;
  return b;
}

// Helper: cria um builder chain pra entering animations do Reanimated.
// Reanimated tem uma API extensa; pra evitar falha "X is not a function" a
// cada call site novo, retornamos um Proxy que aceita qualquer método.
function makeEntering() {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, _prop) {
        return () => proxy;
      },
    },
  );
  return proxy;
}

// ============= react-native-svg mock =============
vi.mock('react-native-svg', () => {
  const tags = [
    'Svg', 'Circle', 'Rect', 'Path', 'Ellipse', 'G', 'Line', 'Polygon', 'Polyline',
    'Text', 'TSpan', 'TextPath', 'Defs', 'Use', 'Symbol', 'LinearGradient',
    'RadialGradient', 'Stop', 'ClipPath', 'Mask', 'Pattern', 'Image', 'ForeignObject',
  ];
  const out: Record<string, unknown> = {};
  for (const tag of tags) out[tag] = makeHostComponent(`svg-${tag.toLowerCase()}`);
  out.default = out.Svg;
  return out;
});

// ============= react-native-gesture-handler mock =============
vi.mock('react-native-gesture-handler', () => {
  const View = makeHostComponent('gh-view');
  return {
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    State: { BEGAN: 0, ACTIVE: 1, END: 2, CANCELLED: 3, FAILED: 4, UNDETERMINED: 5 },
    Directions: { LEFT: 1, RIGHT: 2, UP: 4, DOWN: 8 },
    gestureHandlerRootHOC: function gestureHandlerRootHOC(c: unknown) { return c; },
    Swipeable: View,
    DrawerLayout: View,
    Gesture: {
      Pan: () => makeGestureBuilder(),
      Tap: () => makeGestureBuilder(),
      LongPress: () => makeGestureBuilder(),
      Fling: () => makeGestureBuilder(),
      Race: () => makeGestureBuilder(),
      Simultaneous: () => makeGestureBuilder(),
      Exclusive: () => makeGestureBuilder(),
    },
    GestureDetector: View,
  };
});

// ============= react-native-safe-area-context mock =============
vi.mock('react-native-safe-area-context', () => {
  const View = makeHostComponent('safe-view');
  return {
    SafeAreaProvider: View,
    SafeAreaView: View,
    SafeAreaInsetsContext: { Consumer: View, Provider: View },
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  };
});

// ============= expo-linear-gradient mock =============
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: makeHostComponent('linear-gradient'),
}));

// ============= expo-router mock =============
vi.mock('expo-router', () => {
  const View = makeHostComponent('router-view');
  return {
    router: {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      canGoBack: () => true,
    },
    Stack: Object.assign(View, { Screen: View }),
    Tabs: Object.assign(View, { Screen: View }),
    Slot: View,
    Link: View,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    useLocalSearchParams: () => ({}),
    useGlobalSearchParams: () => ({}),
    usePathname: () => '/',
    useSegments: () => [],
    useFocusEffect: (cb: () => void) => { cb(); },
    useNavigation: () => ({ navigate: vi.fn(), goBack: vi.fn() }),
  };
});

// ============= expo-secure-store =============
const secureStoreMock = new Map<string, string>();
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn((k: string) => Promise.resolve(secureStoreMock.get(k) ?? null)),
  setItemAsync: vi.fn((k: string, v: string) => {
    secureStoreMock.set(k, v);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((k: string) => {
    secureStoreMock.delete(k);
    return Promise.resolve();
  }),
}));

// ============= expo-clipboard =============
vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(() => Promise.resolve(true)),
  getStringAsync: vi.fn(() => Promise.resolve('')),
}));

// ============= expo-haptics =============
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(() => Promise.resolve()),
  notificationAsync: vi.fn(() => Promise.resolve()),
  selectionAsync: vi.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// ============= expo-blur =============
vi.mock('expo-blur', () => ({
  BlurView: makeHostComponent('blur-view'),
}));

// ============= BrandLogo asset =============
// PNG não é parseável pelo oxc do vitest; o módulo brandLogoAsset isola
// o require() e mockamos aqui pra devolver um id numérico — mesmo formato
// que Metro retorna em runtime nativo.
vi.mock('@/components/brandLogoAsset', () => ({
  LOGO_SOURCE: 1,
}));

// ============= Mascot3D (R3F + three) =============
// Mascot3D usa @react-three/fiber/native + three; ambos têm source não-TS que
// o transformer oxc do vitest não digere (token `typeof` em runtime modules).
// Como WebGL não existe em jsdom, mockamos o componente — testes de lógica do
// wrapper Mascot.tsx (que decide 2D vs 3D) continuam exercitando a árvore.
vi.mock('@/components/Mascot3D', () => ({
  Mascot3D: makeHostComponent('mascot-3d'),
}));

// expose helpers pra tests
(globalThis as any).__asyncStorageReset = () => store.clear();
(globalThis as any).__secureStoreReset = () => secureStoreMock.clear();
// __DEV__: componentes React (ErrorBoundary, etc) referenciam o literal e
// quebram com ReferenceError se undefined. Setamos `true` aqui — o logger
// agora aplica NODE_ENV=production como override absoluto (vê src/lib/logger.ts).
(globalThis as { __DEV__?: boolean }).__DEV__ = true;
