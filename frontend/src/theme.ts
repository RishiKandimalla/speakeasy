/**
 * Speakeasy dark theme — grey + pastel jade green.
 */
export const colors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  card: '#1E1E1E',
  cardElevated: '#252525',
  border: '#333333',
  text: '#F5F5F5',
  textSecondary: '#B0B0B0',
  textMuted: '#707070',
  primary: '#7ECBA1',
  primaryPressed: '#5BA37A',
  primaryMuted: '#A8E6C3',
  danger: '#E57373',
  overlay: 'rgba(0,0,0,0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '700' as const },
  headline: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  metric: { fontSize: 28, fontWeight: '700' as const },
} as const;
