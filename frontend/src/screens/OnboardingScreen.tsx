import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AuthStackParamList } from '../navigation/types';
import { authColors, fontFamily, radius, spacing } from '../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: Math.max(insets.bottom + spacing.xl, 24),
        },
      ]}
    >
      <View />

      <View style={styles.brandWrap}>
        <Image source={require('../../assets/images/speakeasy_logo.png')} style={styles.logo} resizeMode="contain" />
        <Image source={require('../../assets/images/speakeasy_name.png')} style={styles.wordmark} resizeMode="contain" />
      </View>

      <View>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.ctaLabel}>GET STARTED</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('SignIn')} hitSlop={8}>
          <Text style={styles.subLink}>Already a Member? Log-in!</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Pressable hitSlop={8}>
          <Text style={styles.legal}>Terms &amp; Conditions</Text>
        </Pressable>
        <Text style={styles.dot}>·</Text>
        <Pressable hitSlop={8}>
          <Text style={styles.legal}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authColors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  brandWrap: {
    alignItems: 'center',
  },
  logo: {
    width: 270,
    height: 270,
    marginBottom: spacing.md,
  },
  wordmark: {
    width: 330,
    height: 96,
  },
  cta: {
    backgroundColor: authColors.cta,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  ctaPressed: {
    backgroundColor: authColors.ctaPressed,
  },
  ctaLabel: {
    color: authColors.ctaText,
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '600',
    fontFamily: fontFamily.bodySemiBold,
  },
  subLink: {
    textAlign: 'center',
    marginTop: spacing.lg,
    color: '#6C6659',
    fontSize: 16,
    fontFamily: fontFamily.body,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legal: {
    color: '#9C9586',
    textDecorationLine: 'underline',
    fontSize: 13,
    fontFamily: fontFamily.body,
  },
  dot: {
    color: '#9C9586',
    fontSize: 14,
    marginHorizontal: 2,
  },
});
