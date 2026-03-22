import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { authColors, fontFamily, radius, spacing } from '../theme';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        setError('Check your email to confirm your account');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + spacing.xl, paddingBottom: Math.max(insets.bottom + spacing.lg, 16) },
        ]}
      >
        <View style={styles.brandWrap}>
          <Image source={require('../../assets/images/speakeasy_logo.png')} style={styles.brandLogo} resizeMode="contain" />
          <Image source={require('../../assets/images/speakeasy_name.png')} style={styles.brandNameImage} resizeMode="contain" />
          <Text style={styles.tagline}>FIND YOUR VOICE</Text>
        </View>

        <View style={styles.form}>
          {error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.label}>EMAIL</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#A49D8D"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
            />
          </View>

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="......."
              placeholderTextColor="#A49D8D"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
              <Image
                source={require('../../assets/icons/eye_reveal_password_icon.png')}
                style={[styles.eyeIcon, showPassword && styles.eyeIconRevealed]}
                resizeMode="contain"
              />
            </Pressable>
          </View>

          <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSubmit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={authColors.ctaText} />
            ) : (
              <Text style={styles.buttonText}>{isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>
            )}
          </Pressable>

          <Pressable hitSlop={8} onPress={() => Alert.alert('Forgot password', 'Password reset flow will be wired next.')}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomMuted}>New here?</Text>
            <Pressable
              onPress={() => {
                setIsSignUp((v) => !v);
                setError(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.createLink}>{isSignUp ? 'Back to sign in' : 'Create an account'}</Text>
            </Pressable>
          </View>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: authColors.background },
  container: {
    flex: 1,
    backgroundColor: authColors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  brandWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
    transform: [{ translateY: 12 }],
  },
  brandLogo: {
    width: 170,
    height: 170,
    marginBottom: spacing.sm,
  },
  brandNameImage: {
    width: 270,
    height: 74,
    marginBottom: spacing.xs,
  },
  tagline: {
    color: '#9A9387',
    fontSize: 12,
    letterSpacing: 2.1,
    marginTop: spacing.xs,
    fontFamily: fontFamily.body,
  },
  form: {
    width: '100%',
  },
  error: {
    color: '#B24E4E',
    fontSize: 13,
    marginBottom: spacing.md,
    fontFamily: fontFamily.body,
  },
  label: {
    fontSize: 14,
    letterSpacing: 2.4,
    color: authColors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    fontWeight: '500',
    fontFamily: fontFamily.bodyMedium,
  },
  inputWrapper: {
    backgroundColor: authColors.inputBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: authColors.border,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  input: {
    color: '#6F695D',
    fontSize: 17,
    paddingVertical: 8,
    fontFamily: fontFamily.body,
  },
  passwordInput: {
    paddingRight: 36,
    fontSize: 19,
  },
  eyeBtn: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    marginTop: -11,
    padding: 4,
  },
  eyeIcon: {
    width: 20,
    height: 20,
    tintColor: '#8E856F',
  },
  eyeIconRevealed: {
    opacity: 0.55,
  },
  button: {
    backgroundColor: authColors.cta,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: authColors.ctaText,
    fontSize: 18,
    letterSpacing: 1.7,
    fontWeight: '600',
    fontFamily: fontFamily.bodySemiBold,
  },
  forgot: {
    color: '#685E4D',
    fontSize: 18,
    marginTop: spacing.xl,
    textAlign: 'center',
    fontFamily: fontFamily.body,
  },
  bottomRow: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bottomMuted: {
    color: '#9A9387',
    fontSize: 15,
    fontFamily: fontFamily.body,
  },
  createLink: {
    color: '#2D301C',
    fontSize: 17,
    fontWeight: '500',
    fontFamily: fontFamily.bodyMedium,
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
  },
});
