/**
 * tokens.ts — PaperTrail design token system
 *
 * Philosophy: deep charcoal surfaces + warm amber accent + cream text.
 * Feels like a premium filing cabinet — dark, authoritative, trustworthy.
 *
 * Updated in Phase 2:
 * - Added C.amberDim (amber at low opacity for selected chips/backgrounds)
 * - Added C.success (OCR success indicator)
 * - Added C.ink4 (border-level surface)
 */

import { Platform } from 'react-native';

// ─── Colors ──────────────────────────────────────────────────────────────────

export const C = {
  // Surfaces (darkest → lightest)
  ink1:    '#0F0F12',   // page background
  ink2:    '#16161B',   // card background
  ink3:    '#1E1E26',   // raised card / input background
  ink4:    '#2A2A35',   // border / divider

  // Text
  cream:   '#F0EDE4',   // primary text
  ash:     '#9896A0',   // secondary / muted text
  faint:   '#4A4855',   // placeholder / decorative

  // Accent
  amber:    '#E8A020',  // primary accent — CTAs, active states
  amberDim: 'rgba(232, 160, 32, 0.15)', // amber bg for selected chips

  // Semantic
  success: '#5BA85A',   // OCR done, saved
  danger:  '#C0392B',   // delete, error
  warning: '#D68910',   // expiry warning

  // Category palette
  category: {
    receipt:  '#E8A020', // amber
    contract: '#5B8DB8', // steel blue
    id:       '#7B68B5', // purple
    warranty: '#5BA85A', // green
    medical:  '#C0616B', // rose
    tax:      '#4FA8A0', // teal
    other:    '#808080', // gray
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
// Minimum 12px floor. Scale: 12, 13, 14, 16, 18, 22, 28, 36

export const T = {
  xs:   12,  // tiny labels, badges, metadata
  sm:   13,  // secondary text, descriptions
  base: 14,  // buttons, UI chrome
  md:   16,  // body text
  lg:   18,  // section headings
  xl:   22,  // screen titles
  '2xl': 28, // hero text
  '3xl': 36, // display (Phase 10 onboarding only)
} as const;

// ─── Spacing (4px base) ───────────────────────────────────────────────────────

export const S = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const R = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   20,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
    },
    android: { elevation: 5 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.32,
      shadowRadius: 20,
    },
    android: { elevation: 10 },
    default: {},
  }),
} as const;

// ─── Animation durations ─────────────────────────────────────────────────────

export const duration = {
  fast:   150,
  normal: 250,
  slow:   400,
} as const;
