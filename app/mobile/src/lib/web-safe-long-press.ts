/**
 * RN-Web renderiza <button> aninhados quando Pressable tem onPress + onLongPress.
 * No web usamos pointer events + context menu; no nativo, onLongPress normal.
 */
import { useCallback, useRef } from 'react';
import { Platform, type GestureResponderEvent, type PressableProps } from 'react-native';

export type WebSafeLongPressProps = Partial<
  Pick<PressableProps, 'onLongPress' | 'delayLongPress' | 'onPointerDown' | 'onPointerUp' | 'onPointerLeave' | 'onPointerCancel'>
> & {
  onContextMenu?: (e: { preventDefault: () => void }) => void;
};

export function useWebSafeLongPress(
  onLongPress?: (() => void) | ((event: GestureResponderEvent) => void),
  delayMs = 500,
): WebSafeLongPressProps {
  const invoke = () => {
    if (!onLongPress) return;
    if (onLongPress.length === 0) {
      (onLongPress as () => void)();
    } else {
      (onLongPress as (event: GestureResponderEvent) => void)({} as GestureResponderEvent);
    }
  };
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  if (!onLongPress) return {};

  if (Platform.OS !== 'web') {
    return { onLongPress: onLongPress as PressableProps['onLongPress'], delayLongPress: delayMs };
  }

  return {
    onContextMenu: (e: { preventDefault: () => void }) => {
      e.preventDefault();
      invoke();
    },
    onPointerDown: () => {
      clear();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        invoke();
      }, delayMs);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
