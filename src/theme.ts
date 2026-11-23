// Design tokens for the "Clean & modern" look: light mode, one indigo accent.
export const colors = {
  accent: '#4F46E5',
  accentSoft: '#EEF2FF',
  text: '#111827',
  secondaryText: '#6B7280',
  background: '#F5F5F7',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  success: '#16A34A',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
  infoSoft: '#EEF2FF',
  onAccent: '#FFFFFF',
  placeholder: '#9CA3AF',
  // Dark, full-bleed screens (camera, photo viewer).
  media: '#000000',
  onMedia: '#FFFFFF',
  onMediaMuted: 'rgba(255,255,255,0.75)',
  mediaOverlay: 'rgba(0,0,0,0.55)',
  mediaDanger: '#FF6B6B',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 8, md: 12, lg: 16 } as const;

export const typography = {
  largeTitle: { fontSize: 32, fontWeight: '800' as const },
  title: { fontSize: 24, fontWeight: '700' as const },
  heading: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  callout: { fontSize: 17, fontWeight: '600' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
};

/** Minimum tap target height in points. */
export const MIN_TAP = 44;
