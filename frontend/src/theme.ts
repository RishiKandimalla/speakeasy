export const colors = {
  background: '#06070A',
  surface: '#0F1117',
  card: '#141925',
  cardElevated: '#1B2231',
  border: '#293248',
  text: '#F6F8FC',
  textSecondary: '#C3C9D8',
  textMuted: '#8E97AB',
  primary: '#B9CCA3',       // brand Primary #B9CCA3
  primaryPressed: '#A3BA8A',
  primaryMuted: '#D4E2C7',
  danger: '#FF7D9A',
  warning: '#F6E7A0',       // brand Secondary yellow #F6E7A0
  info: '#C9C0DE',          // brand Secondary lavender #C9C0DE
  overlay: 'rgba(6,7,10,0.62)',
} as const;

export const authColors = {
  background: '#FFFAE0',    // brand Background #FFFAE0
  text: '#263103',          // dark olive from brand
  textMuted: '#757D5C',     // muted olive
  border: 'rgba(38, 49, 3, 0.18)',
  inputBackground: 'rgba(255, 255, 255, 0.55)',
  cta: '#757D5C',           // brand Secondary #757D5C
  ctaPressed: '#636950',
  ctaText: '#FFFAE0',
  link: '#4A5240',
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
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontFamily = {
  display: 'Corben_400Regular',      // brand Primary Font
  body: 'Jost_400Regular',           // brand Secondary Font
  bodyMedium: 'Jost_500Medium',
  bodySemiBold: 'Jost_600SemiBold',
  playfair: 'Corben_400Regular',     // replace Playfair usages with Corben
  playfairSemiBold: 'Corben_700Bold',
  mono: 'Courier',
} as const;

export const typography = {
  title: {
    fontSize: 28,
    fontFamily: fontFamily.display,
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 20,
    fontFamily: fontFamily.display,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 16,
    fontFamily: fontFamily.body,
    lineHeight: 23,
  },
  caption: {
    fontSize: 13,
    fontFamily: fontFamily.bodyMedium,
    letterSpacing: 0.3,
  },
  metric: {
    fontSize: 34,
    fontFamily: fontFamily.display,
    letterSpacing: 0.2,
  },
} as const;