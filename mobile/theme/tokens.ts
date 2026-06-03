// PaperTrail Design Tokens
// Art direction: secure digital filing cabinet → clean, trustworthy, minimal
// Palette: deep charcoal surfaces, warm paper-cream accents, amber primary
// Typography: System UI for clarity; no decorative fonts needed in a utility app
// Density: balanced — comfortable for document-heavy lists

export const Colors = {
  // Backgrounds / Surfaces
  bg:              '#0F0F12',   // deepest background
  surface:         '#16161A',   // card surface
  surface2:        '#1C1C21',   // elevated card
  surfaceOffset:   '#222228',   // input background, table rows
  surfaceDynamic:  '#2A2A32',   // pressed state, hover
  divider:         '#2E2E38',
  border:          '#38383F',

  // Text
  text:            '#EEEAE3',   // primary — warm off-white (paper tone)
  textMuted:       '#8A8A96',   // secondary
  textFaint:       '#52525C',   // tertiary / placeholders
  textInverse:     '#0F0F12',

  // Primary Accent — Amber (document warmth)
  primary:         '#E8A020',
  primaryHover:    '#C8831A',
  primaryActive:   '#A86012',
  primaryHighlight:'#3A2E18',

  // Semantic
  success:         '#4D9E5A',
  successHighlight:'#1A2E1E',
  warning:         '#D97B2A',
  warningHighlight:'#2E1E10',
  error:           '#D04B4B',
  errorHighlight:  '#2E1212',
  info:            '#4A8FC4',
  infoHighlight:   '#102030',

  // Category chip colors (document types)
  catReceipt:      '#4A8FC4',   // blue
  catContract:     '#9B6DD4',   // purple
  catID:           '#4D9E5A',   // green
  catWarranty:     '#E8A020',   // amber
  catMedical:      '#D04B4B',   // red
  catTax:          '#D97B2A',   // orange
  catOther:        '#8A8A96',   // muted
} as const;

export const Typography = {
  // Font families
  fontBody:   'System',
  fontMono:   'monospace',

  // Sizes (minimum 12px floor)
  xs:    12,
  sm:    13,
  base:  15,
  md:    15,
  lg:    18,
  xl:    22,
  xxl:   28,
  hero:  36,

  // Weights
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,

  // Line heights
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.65,
} as const;

export const Spacing = {
  px:   1,
  '0':  0,
  '1':  4,
  '2':  8,
  '3':  12,
  '4':  16,
  '5':  20,
  '6':  24,
  '8':  32,
  '10': 40,
  '12': 48,
  '16': 64,
  '20': 80,
} as const;

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// Touch target floor
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TOUCH = 44;
