export const colors = {
  background: '#06070A',
  surface: '#0F1117',
  card: '#141925',
  cardElevated: '#1B2231',
  border: '#293248',
  text: '#F6F8FC',
  textSecondary: '#C3C9D8',
  textMuted: '#8E97AB',
  primary: '#45E3A4',
  primaryPressed: '#2EC98C',
  primaryMuted: '#82F1C7',
  danger: '#FF7D9A',
  warning: '#FFBF6A',
  info: '#79B8FF',
  overlay: 'rgba(6,7,10,0.62)',
} as const;

export const authColors = {
  background: '#FCFBF3',
  text: '#273218',
  textMuted: '#8A8477',
  border: '#D8D2C6',
  inputBackground: '#FFFEFA',
  cta: '#667052',
  ctaPressed: '#586247',
  ctaText: '#FCFBF3',
  link: '#7B7D6A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const fontFamily = {
  display: 'Jost_600SemiBold',
  body: 'Jost_400Regular',
  bodyMedium: 'Jost_500Medium',
  bodySemiBold: 'Jost_600SemiBold',
  mono: 'Courier',
} as const;

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
    fontFamily: fontFamily.display,
  },
  headline: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
    fontFamily: fontFamily.display,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 23,
    fontFamily: fontFamily.body,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
    fontFamily: fontFamily.body,
  },
  metric: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
    fontFamily: fontFamily.display,
  },
} as const;
