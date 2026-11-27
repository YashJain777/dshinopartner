/**
 * Icon — the one icon set in the app.
 *
 * Single stroke weight (1.75), 24px grid, no emoji anywhere. Each entry is the
 * same geometry used in the design canvas, so a screen never drifts from its
 * artboard.
 */

import React from 'react';
import Svg, {Path, Circle, Rect} from 'react-native-svg';
import {IconName, IconProps} from './Icon.types';

type Renderer = (stroke: string, filled: boolean) => React.ReactNode;

const P = (d: string, key?: string) => <Path d={d} key={key} />;

const PATHS: Record<IconName, Renderer> = {
  check: () => P('M4 12.5l5 5L20 6.5'),
  close: () => (
    <>
      {P('M6 6l12 12', 'a')}
      {P('M18 6L6 18', 'b')}
    </>
  ),
  chevronRight: () => P('M9 6l6 6-6 6'),
  chevronLeft: () => P('M15 6l-6 6 6 6'),
  chevronDown: () => P('M6 9l6 6 6-6'),
  arrowRight: () => (
    <>
      {P('M5 12h13', 'a')}
      {P('M13 6l6 6-6 6', 'b')}
    </>
  ),
  arrowUp: () => (
    <>
      {P('M12 20V5', 'a')}
      {P('M6 11l6-6 6 6', 'b')}
    </>
  ),
  arrowDown: () => (
    <>
      {P('M12 4v15', 'a')}
      {P('M6 13l6 6 6-6', 'b')}
    </>
  ),
  plus: () => (
    <>
      {P('M12 6v12', 'a')}
      {P('M6 12h12', 'b')}
    </>
  ),
  pin: () => (
    <>
      {P('M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z', 'a')}
      <Circle cx={12} cy={10} r={2.5} key="b" />
    </>
  ),
  pinCheck: () => (
    <>
      {P('M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z', 'a')}
      {P('M9 10l2 2 4-4', 'b')}
    </>
  ),
  pinOff: () => (
    <>
      {P('M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z', 'a')}
      {P('M9.5 9.5l5 5', 'b')}
      {P('M14.5 9.5l-5 5', 'c')}
    </>
  ),
  navigation: () => P('M3 11l18-8-8 18-2-8z'),
  camera: () => (
    <>
      {P('M4 8h3l1.5-2h7L17 8h3v11H4z', 'a')}
      <Circle cx={12} cy={13} r={3.2} key="b" />
    </>
  ),
  image: () => (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} key="a" />
      {P('M3 15l5-4 4 3 3-2 6 5', 'b')}
    </>
  ),
  lock: () => (
    <>
      <Rect x={5} y={11} width={14} height={9} rx={2} key="a" />
      {P('M8 11V8a4 4 0 0 1 8 0v3', 'b')}
    </>
  ),
  clipboard: () => (
    <>
      {P('M9 4h6v3H9z', 'a')}
      {P('M15 5h3v15H6V5h3', 'b')}
    </>
  ),
  wrench: () => P('M14.7 6.3a4 4 0 0 1-5 5L5 16v3h3l4.7-4.7a4 4 0 0 1 5-5l-2.2-2.2z'),
  bell: () => (
    <>
      {P('M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z', 'a')}
      {P('M10 18a2 2 0 0 0 4 0', 'b')}
    </>
  ),
  home: () => P('M4 11l8-6 8 6v9H4z'),
  briefcase: () => (
    <>
      <Rect x={3} y={7} width={18} height={13} rx={2} key="a" />
      {P('M9 7V5h6v2', 'b')}
    </>
  ),
  wallet: () => (
    <>
      <Rect x={3} y={6} width={18} height={12} rx={2} key="a" />
      <Circle cx={16} cy={12} r={1.6} key="b" />
    </>
  ),
  barChart: () => (
    <>
      {P('M5 19V11', 'a')}
      {P('M12 19V5', 'b')}
      {P('M19 19v-6', 'c')}
    </>
  ),
  user: () => (
    <>
      <Circle cx={12} cy={9} r={3.4} key="a" />
      {P('M5 20a7 7 0 0 1 14 0', 'b')}
    </>
  ),
  userOff: () => (
    <>
      <Circle cx={12} cy={8.5} r={3.2} key="a" />
      {P('M5 20a7 7 0 0 1 11-5.7', 'b')}
      {P('M16 17l5 4', 'c')}
      {P('M21 17l-5 4', 'd')}
    </>
  ),
  userCheck: () => (
    <>
      <Circle cx={12} cy={7} r={3} key="a" />
      {P('M4 20a5 5 0 0 1 8-4', 'b')}
      {P('M14 17l2 2 4-4', 'c')}
    </>
  ),
  phone: () =>
    P(
      'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2.2 2A15 15 0 0 1 3 6.2 2 2 0 0 1 5 4z',
    ),
  mail: () => (
    <>
      {P('M4 6h16v12H4z', 'a')}
      {P('M4 7l8 6 8-6', 'b')}
    </>
  ),
  alert: () => (
    <>
      {P('M12 3l9 16H3z', 'a')}
      {P('M12 9v4', 'b')}
      {P('M12 16.5v.5', 'c')}
    </>
  ),
  info: () => (
    <>
      <Circle cx={12} cy={12} r={8.5} key="a" />
      {P('M12 11v5.5', 'b')}
      {P('M12 7.6v.4', 'c')}
    </>
  ),
  clock: () => (
    <>
      <Circle cx={12} cy={12} r={8.5} key="a" />
      {P('M12 7.5V12l3 2', 'b')}
    </>
  ),
  clockAlarm: () => (
    <>
      <Circle cx={12} cy={13} r={8} key="a" />
      {P('M12 9v4.4l2.8 1.8', 'b')}
      {P('M9 2.5h6', 'c')}
    </>
  ),
  star: () =>
    P('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'),
  box: () => (
    <>
      {P('M4 8l8-4 8 4z', 'a')}
      {P('M4 8v8l8 4 8-4V8', 'b')}
    </>
  ),
  calendar: () => (
    <>
      <Rect x={3} y={5} width={18} height={16} rx={3} key="a" />
      {P('M3 10h18', 'b')}
      {P('M8 3v4', 'c')}
      {P('M16 3v4', 'd')}
    </>
  ),
  pause: () => (
    <>
      <Rect x={6} y={5} width={4} height={14} rx={1} key="a" />
      <Rect x={14} y={5} width={4} height={14} rx={1} key="b" />
    </>
  ),
  truck: () => (
    <>
      <Rect x={3} y={8} width={13} height={9} rx={1.5} key="a" />
      {P('M16 11h3l2 3v3h-5z', 'b')}
      <Circle cx={7} cy={18} r={1.6} key="c" />
      <Circle cx={18} cy={18} r={1.6} key="d" />
    </>
  ),
  shield: () => (
    <>
      {P('M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z', 'a')}
      {P('M9 12l2 2 4-4', 'b')}
    </>
  ),
  document: () => (
    <>
      {P('M5 4h14v16H5z', 'a')}
      {P('M8 9h8', 'b')}
      {P('M8 13h8', 'c')}
      {P('M8 17h5', 'd')}
    </>
  ),
  settings: () => (
    <>
      <Circle cx={12} cy={12} r={3} key="a" />
      {P('M12 3v2.5', 'b')}
      {P('M12 18.5V21', 'c')}
      {P('M3 12h2.5', 'd')}
      {P('M18.5 12H21', 'e')}
    </>
  ),
  send: () => P('M3 11l18-8-8 18-2-8z'),
  flash: () => P('M13 3L5 14h6l-1 7 8-11h-6z'),
  car: () => (
    <>
      {P('M4 16v-3l2-5h12l2 5v3', 'a')}
      {P('M3 16h18v3H3z', 'b')}
      <Circle cx={7.5} cy={19} r={1.6} key="c" />
      <Circle cx={16.5} cy={19} r={1.6} key="d" />
    </>
  ),
  carOff: () => (
    <>
      {P('M4 16v-3l2-5h12l2 5v3', 'a')}
      {P('M3 16h18v3H3z', 'b')}
      {P('M5 5l14 14', 'c')}
    </>
  ),
  map: () => (
    <>
      {P('M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z', 'a')}
      {P('M9 4v14', 'b')}
      {P('M15 6v14', 'c')}
    </>
  ),
  edit: () => P('M4 20h4L19 9l-4-4L4 16z'),
  chat: () => P('M5 5h14v10H9l-4 4z'),
  bank: () => (
    <>
      {P('M4 7h16v12H4z', 'a')}
      {P('M4 11h16', 'b')}
      {P('M8 15h4', 'c')}
    </>
  ),
  idCard: () => (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2.5} key="a" />
      <Circle cx={9} cy={11} r={2.2} key="b" />
      {P('M14 10h4', 'c')}
      {P('M14 14h4', 'd')}
    </>
  ),
  bottle: () => (
    <>
      {P('M9 3h6v3l2 3v12H7V9l2-3z', 'a')}
      {P('M7 13h10', 'b')}
    </>
  ),
  cloth: () => (
    <>
      <Rect x={4} y={5} width={16} height={14} rx={2} key="a" />
      {P('M8 5v14', 'b')}
    </>
  ),
  brush: () => (
    <>
      {P('M5 14h14v5H5z', 'a')}
      {P('M8 14V5', 'b')}
      {P('M12 14V5', 'c')}
      {P('M16 14V5', 'd')}
    </>
  ),
  tyre: () => (
    <>
      <Circle cx={12} cy={12} r={7.5} key="a" />
      <Circle cx={12} cy={12} r={2.5} key="b" />
    </>
  ),
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = '#334155',
  strokeWidth = 1.75,
  filled = false,
  style,
  accessibilityLabel,
}) => {
  const render = PATHS[name];
  if (!render) {
    return null;
  }

  const a11y = accessibilityLabel
    ? {accessibilityRole: 'image' as const, accessibilityLabel}
    : {accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const};

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...a11y}>
      {render(color, filled)}
    </Svg>
  );
};
