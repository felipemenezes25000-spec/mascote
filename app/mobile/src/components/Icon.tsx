/**
 * Sistema de ícones inline (SVG) — substitui emojis por linework consistente.
 *
 * Inspirado em Lucide (viewBox 24, stroke 2, linecap/linejoin round). Cada
 * ícone é um conjunto de paths/circles. Adicione novo ícone aqui pra usar em
 * toda a UI; o `name` é tipado, então erros de digitação quebram em compile.
 */

import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type IconName =
  // Navigation
  | 'home'
  | 'message-circle'
  | 'sparkles'
  | 'bar-chart'
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron-right'
  | 'chevron-down'
  | 'x'
  | 'plus'
  | 'minus'
  | 'check'
  // Gamification
  | 'flame'
  | 'star'
  | 'trophy'
  | 'target'
  | 'zap'
  | 'gift'
  | 'coins'
  | 'gem'
  | 'package'
  | 'crown'
  // Habits
  | 'droplet'
  | 'moon'
  | 'dumbbell'
  | 'wind'
  | 'heart'
  | 'book'
  | 'pencil'
  | 'tree'
  | 'sun'
  // UI
  | 'bell'
  | 'settings'
  | 'user'
  | 'share'
  | 'info'
  | 'help-circle'
  | 'alert-triangle'
  | 'shield'
  | 'sparkle'
  | 'clock'
  | 'calendar'
  | 'lock'
  | 'unlock';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export function Icon({ name, size = 24, color = 'currentColor', strokeWidth = 2, fill = 'none' }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    // ─── Navigation ─────────────────────────────────────────────
    case 'home':
      return (
        <Svg {...common}>
          <Path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2h-3v-7h-8v7H5a2 2 0 0 1-2-2V9.5z" />
        </Svg>
      );
    case 'message-circle':
      return (
        <Svg {...common}>
          <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </Svg>
      );
    case 'sparkles':
      return (
        <Svg {...common}>
          <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          <Path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
          <Path d="M5 4l.5 1.5L7 6l-1.5.5L5 8l-.5-1.5L3 6l1.5-.5L5 4z" />
        </Svg>
      );
    case 'bar-chart':
      return (
        <Svg {...common}>
          <Line x1="12" y1="20" x2="12" y2="10" />
          <Line x1="18" y1="20" x2="18" y2="4" />
          <Line x1="6" y1="20" x2="6" y2="16" />
        </Svg>
      );
    case 'arrow-left':
      return (
        <Svg {...common}>
          <Line x1="19" y1="12" x2="5" y2="12" />
          <Polyline points="12 19 5 12 12 5" />
        </Svg>
      );
    case 'arrow-right':
      return (
        <Svg {...common}>
          <Line x1="5" y1="12" x2="19" y2="12" />
          <Polyline points="12 5 19 12 12 19" />
        </Svg>
      );
    case 'chevron-right':
      return (
        <Svg {...common}>
          <Polyline points="9 18 15 12 9 6" />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg {...common}>
          <Polyline points="6 9 12 15 18 9" />
        </Svg>
      );
    case 'x':
      return (
        <Svg {...common}>
          <Line x1="18" y1="6" x2="6" y2="18" />
          <Line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...common}>
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      );
    case 'minus':
      return (
        <Svg {...common}>
          <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...common}>
          <Polyline points="20 6 9 17 4 12" />
        </Svg>
      );
    // ─── Gamification ───────────────────────────────────────────
    case 'flame':
      return (
        <Svg {...common}>
          <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </Svg>
      );
    case 'star':
      return (
        <Svg {...common}>
          <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </Svg>
      );
    case 'trophy':
      return (
        <Svg {...common}>
          <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <Path d="M4 22h16" />
          <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <Path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
        </Svg>
      );
    case 'target':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="10" />
          <Circle cx="12" cy="12" r="6" />
          <Circle cx="12" cy="12" r="2" />
        </Svg>
      );
    case 'zap':
      return (
        <Svg {...common}>
          <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </Svg>
      );
    case 'gift':
      return (
        <Svg {...common}>
          <Polyline points="20 12 20 22 4 22 4 12" />
          <Rect x="2" y="7" width="20" height="5" />
          <Line x1="12" y1="22" x2="12" y2="7" />
          <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </Svg>
      );
    case 'coins':
      return (
        <Svg {...common}>
          <Circle cx="8" cy="8" r="6" />
          <Path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
          <Path d="M7 6h1v4" />
          <Path d="M16.71 13.88L17.4 14.59 18.83 13.16" />
        </Svg>
      );
    case 'gem':
      return (
        <Svg {...common}>
          <Polyline points="6 3 18 3 22 9 12 22 2 9 6 3" />
          <Path d="M11 3L8 9l4 13 4-13-3-6" />
          <Line x1="2" y1="9" x2="22" y2="9" />
        </Svg>
      );
    case 'package':
      return (
        <Svg {...common}>
          <Line x1="16.5" y1="9.4" x2="7.55" y2="4.21" />
          <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <Polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <Line x1="12" y1="22.08" x2="12" y2="12" />
        </Svg>
      );
    case 'crown':
      return (
        <Svg {...common}>
          <Path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM2 20h20" />
        </Svg>
      );
    // ─── Habits ─────────────────────────────────────────────────
    case 'droplet':
      return (
        <Svg {...common}>
          <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
        </Svg>
      );
    case 'moon':
      return (
        <Svg {...common}>
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </Svg>
      );
    case 'dumbbell':
      return (
        <Svg {...common}>
          <Path d="M6.5 6.5L17.5 17.5" />
          <Path d="M21 21l-1-1" />
          <Path d="M3 3l1 1" />
          <Path d="M18 22l4-4" />
          <Path d="M2 6l4-4" />
          <Path d="M3 10l7-7" />
          <Path d="M14 21l7-7" />
        </Svg>
      );
    case 'wind':
      return (
        <Svg {...common}>
          <Path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </Svg>
      );
    case 'heart':
      return (
        <Svg {...common}>
          <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </Svg>
      );
    case 'book':
      return (
        <Svg {...common}>
          <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </Svg>
      );
    case 'pencil':
      return (
        <Svg {...common}>
          <Path d="M12 20h9" />
          <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </Svg>
      );
    case 'tree':
      return (
        <Svg {...common}>
          <Path d="M12 2l5 7h-3l4 6h-3l3 5H6l3-5H6l4-6H7l5-7z" />
          <Line x1="12" y1="20" x2="12" y2="22" />
        </Svg>
      );
    case 'sun':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="4" />
          <Line x1="12" y1="2" x2="12" y2="4" />
          <Line x1="12" y1="20" x2="12" y2="22" />
          <Line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
          <Line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
          <Line x1="2" y1="12" x2="4" y2="12" />
          <Line x1="20" y1="12" x2="22" y2="12" />
          <Line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
          <Line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
        </Svg>
      );
    // ─── UI ─────────────────────────────────────────────────────
    case 'bell':
      return (
        <Svg {...common}>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Svg>
      );
    case 'user':
      return (
        <Svg {...common}>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle cx="12" cy="7" r="4" />
        </Svg>
      );
    case 'share':
      return (
        <Svg {...common}>
          <Circle cx="18" cy="5" r="3" />
          <Circle cx="6" cy="12" r="3" />
          <Circle cx="18" cy="19" r="3" />
          <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </Svg>
      );
    case 'info':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="16" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12.01" y2="8" />
        </Svg>
      );
    case 'help-circle':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="10" />
          <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <Line x1="12" y1="17" x2="12.01" y2="17" />
        </Svg>
      );
    case 'alert-triangle':
      return (
        <Svg {...common}>
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <Line x1="12" y1="9" x2="12" y2="13" />
          <Line x1="12" y1="17" x2="12.01" y2="17" />
        </Svg>
      );
    case 'shield':
      return (
        <Svg {...common}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg {...common}>
          <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
        </Svg>
      );
    case 'clock':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="10" />
          <Polyline points="12 6 12 12 16 14" />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg {...common}>
          <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <Line x1="16" y1="2" x2="16" y2="6" />
          <Line x1="8" y1="2" x2="8" y2="6" />
          <Line x1="3" y1="10" x2="21" y2="10" />
        </Svg>
      );
    case 'lock':
      return (
        <Svg {...common}>
          <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Svg>
      );
    case 'unlock':
      return (
        <Svg {...common}>
          <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <Path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </Svg>
      );
  }
}
