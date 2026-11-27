/**
 * Design Tokens — Dshino Partner redesign
 *
 * The semantic layer the redesigned screens are built on. The older
 * `colors` palette in ./colors.ts stays untouched so existing screens keep
 * working; new work should import from here.
 *
 * Every pair below clears WCAG AA (4.5:1) against the surface it sits on, and
 * no state is ever signalled by hue alone — a chip always carries an icon and
 * a word as well.
 */

export type ThemeScheme = 'light' | 'dark';

export interface Tokens {
  // Surfaces
  surface: string;
  surfaceContainer: string;
  surfaceElevated: string;
  surfaceInverse: string;
  outline: string;
  outlineStrong: string;
  scrim: string;

  // Text
  textHeading: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textOnInverse: string;

  // Brand. `brand` is the mark colour; `brandAction` is the only one that may
  // carry button text, because #FF6B00 under white fails contrast in light.
  brand: string;
  brandAction: string;
  brandActionText: string;
  brandContainer: string;
  brandInk: string;
  brandBorder: string;

  // Semantic
  success: string;
  successContainer: string;
  successInk: string;
  successBorder: string;
  successOnSolid: string;

  warning: string;
  warningContainer: string;
  warningInk: string;
  warningBorder: string;
  warningOnSolid: string;

  danger: string;
  dangerContainer: string;
  dangerInk: string;
  dangerBorder: string;
  dangerOnSolid: string;

  info: string;
  infoContainer: string;
  infoInk: string;

  teal: string;
  tealContainer: string;
  tealInk: string;

  neutralContainer: string;
  neutralInk: string;

  // Media placeholders (photo thumbs, map base)
  placeholder: string;
  placeholderAlt: string;
  mapBase: string;
  mapRoad: string;
}

const light: Tokens = {
  surface: '#FFFFFF',
  surfaceContainer: '#F6F7F9',
  surfaceElevated: '#FFFFFF',
  surfaceInverse: '#0F172A',
  outline: '#E3E6EB',
  outlineStrong: '#CBD2DB',
  scrim: 'rgba(5, 10, 20, 0.55)',

  textHeading: '#0F172A',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textDisabled: '#94A3B8',
  textOnInverse: '#FFFFFF',

  brand: '#FF6B00',
  brandAction: '#C44600',
  brandActionText: '#FFFFFF',
  brandContainer: '#FFF1E7',
  brandInk: '#8A3200',
  brandBorder: '#FBD5B5',

  success: '#15803D',
  successContainer: '#E7F6EC',
  successInk: '#10522A',
  successBorder: '#BFE3CB',
  successOnSolid: '#FFFFFF',

  warning: '#B45309',
  warningContainer: '#FFF8EC',
  warningInk: '#7C3E06',
  warningBorder: '#F5D9A8',
  warningOnSolid: '#FFFFFF',

  danger: '#C02626',
  dangerContainer: '#FDECEC',
  dangerInk: '#8F1D1D',
  dangerBorder: '#EFBFBF',
  dangerOnSolid: '#FFFFFF',

  info: '#1D4ED8',
  infoContainer: '#E8EEFE',
  infoInk: '#15379B',

  teal: '#0F766E',
  tealContainer: '#DFF2F0',
  tealInk: '#0B5A53',

  neutralContainer: '#EEF1F6',
  neutralInk: '#334155',

  placeholder: '#D5DBE4',
  placeholderAlt: '#C8D0DB',
  mapBase: '#DDE4EC',
  mapRoad: '#C3CDDA',
};

const dark: Tokens = {
  surface: '#0B1220',
  surfaceContainer: '#141D2E',
  surfaceElevated: '#1B2538',
  surfaceInverse: '#F1F5F9',
  outline: '#27334A',
  outlineStrong: '#3A4760',
  scrim: 'rgba(2, 6, 14, 0.72)',

  textHeading: '#FFFFFF',
  textPrimary: '#F1F5F9',
  textSecondary: '#B4C0D3',
  textTertiary: '#8695AD',
  textDisabled: '#6B7A94',
  textOnInverse: '#0B1220',

  brand: '#FF8A33',
  brandAction: '#FF6B00',
  brandActionText: '#1A0A00',
  brandContainer: '#332113',
  brandInk: '#FFB782',
  brandBorder: '#5C3410',

  success: '#22C55E',
  successContainer: '#0B3B21',
  successInk: '#BBF7D0',
  successBorder: '#14532D',
  successOnSolid: '#052E16',

  warning: '#FBBF24',
  warningContainer: '#3A2A08',
  warningInk: '#FDE68A',
  warningBorder: '#5C4310',
  warningOnSolid: '#1A1203',

  danger: '#EF4444',
  dangerContainer: '#3A1212',
  dangerInk: '#FF8A8A',
  dangerBorder: '#6B1E1E',
  dangerOnSolid: '#1A0505',

  info: '#93C5FD',
  infoContainer: '#11274D',
  infoInk: '#BFDBFE',

  teal: '#2DD4BF',
  tealContainer: '#0B3B36',
  tealInk: '#7FD9CE',

  neutralContainer: '#1B2538',
  neutralInk: '#C6D2E4',

  placeholder: '#3A465C',
  placeholderAlt: '#46536B',
  mapBase: '#223047',
  mapRoad: '#2E405C',
};

export const tokens: Record<ThemeScheme, Tokens> = {light, dark};

/** Corner radii. Nothing in the app uses a value outside this set. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

/**
 * Three elevation levels, no more. Borders are preferred over shadows; the
 * shadow below is reserved for sheets and the sticky action bar.
 */
export const elevation = {
  none: {},
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  sticky: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: -4},
    elevation: 8,
  },
} as const;
