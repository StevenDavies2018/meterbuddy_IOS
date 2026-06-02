import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppFlow } from '@/stores/app-flow';

const logoImage = require('../../assets/images/Logo.png');
const loginImage = require('../../assets/images/Onboard-Login.png');
const accentBlue = '#1756D1';
const accentBlueSoft = '#EAF1FF';
const inkBlue = '#081F5C';
const borderBlue = '#C8D9FF';
const errorTint = '#FFF1F1';
const errorBorder = '#F4CACA';
const errorText = '#8F1D1D';

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string | string[] }>();
  const {
    createAccountWithPassword,
    loginWithPassword,
    sendPasswordReset,
    isAuthenticating,
    authNotice,
    lastError,
    clearError,
    isAuthenticated,
  } = useAppFlow();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mode, setMode] = useState<'create' | 'sign-in'>('sign-in');
  const source = Array.isArray(params.source) ? params.source[0] : params.source;

  function handleBack() {
    if (source === 'onboarding') {
      router.replace('/onboarding');
      return;
    }

    router.replace('/');
  }

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      return;
    }

    if (mode === 'create' && password !== confirmPassword) {
      return;
    }

    try {
      if (mode === 'create') {
        await createAccountWithPassword(normalizedEmail, password);
        return;
      }

      await loginWithPassword(normalizedEmail, password);
      router.replace('/scan');
    } catch {
      // Shared error state is rendered in the UI.
    }
  }

  async function handlePasswordReset() {
    try {
      await sendPasswordReset(email);
    } catch {
      // Shared error state is rendered in the UI.
    }
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.logoBadge}>
              <Image source={logoImage} style={styles.logo} contentFit="contain" />
            </View>
            <ThemedText type="subtitle" style={styles.title}>
              {mode === 'create' ? 'Create account' : 'Sign in'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {source === 'onboarding'
                ? 'Create your MeterBuddy account so your scans are saved to the cloud and ready for the web dashboard later.'
                : 'Use your MeterBuddy account to sync readings, reminders, and future lifetime purchases across devices.'}
            </ThemedText>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.illustrationCard}>
              <Image source={loginImage} style={styles.illustration} contentFit="contain" />
            </View>
          </View>

          <View style={styles.modeRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create account mode"
              accessibilityState={{ selected: mode === 'create' }}
              onPress={() => setMode('create')}
              style={styles.modePressable}>
              {({ pressed }) => (
                <View style={[styles.modeChip, mode === 'create' ? styles.modeChipActive : styles.modeChipInactive, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={mode === 'create' ? styles.modeChipTextActive : styles.modeChipTextInactive}>
                    Create account
                  </ThemedText>
                </View>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in mode"
              accessibilityState={{ selected: mode === 'sign-in' }}
              onPress={() => setMode('sign-in')}
              style={styles.modePressable}>
              {({ pressed }) => (
                <View style={[styles.modeChip, mode === 'sign-in' ? styles.modeChipActive : styles.modeChipInactive, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={mode === 'sign-in' ? styles.modeChipTextActive : styles.modeChipTextInactive}>
                    Sign in
                  </ThemedText>
                </View>
              )}
            </Pressable>
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardIntro}>
              <ThemedText type="smallBold" style={styles.formTitle}>
                {mode === 'create' ? 'Create your MeterBuddy account' : 'Sign in to MeterBuddy'}
              </ThemedText>
              <ThemedText style={styles.formBody}>
                {mode === 'create'
                  ? 'Your account keeps meter history available on mobile and web, and gives us a durable place to restore your lifetime unlock later.'
                  : 'Use your email and password to access your saved readings, reminders, and synced account history.'}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={styles.formLabel}>Email address</ThemedText>
            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="name@example.com"
              placeholderTextColor="#7b8088"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />

            <ThemedText type="smallBold" style={[styles.fieldLabel, styles.formLabel]}>
              Password
            </ThemedText>
            <View style={styles.passwordRow}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={mode === 'create' ? 'new-password' : 'password'}
                textContentType={mode === 'create' ? 'newPassword' : 'password'}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor="#7b8088"
                value={password}
                onChangeText={setPassword}
                style={[styles.input, styles.passwordInput]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityHint="Toggles whether the password field is visible."
                onPress={() => setShowPassword((current) => !current)}
                style={styles.passwordToggle}>
                {({ pressed }) => (
                  <View style={[styles.passwordToggleChip, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.passwordToggleText}>
                      {showPassword ? 'Hide' : 'Show'}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            </View>

            {mode === 'create' ? (
              <>
                <ThemedText type="smallBold" style={[styles.fieldLabel, styles.formLabel]}>
                  Confirm password
                </ThemedText>
                <View style={styles.passwordRow}>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#7b8088"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={[styles.input, styles.passwordInput]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    accessibilityHint="Toggles whether the confirm password field is visible."
                    onPress={() => setShowConfirmPassword((current) => !current)}
                    style={styles.passwordToggle}>
                    {({ pressed }) => (
                      <View style={[styles.passwordToggleChip, pressed && styles.pressed]}>
                        <ThemedText type="smallBold" style={styles.passwordToggleText}>
                          {showConfirmPassword ? 'Hide' : 'Show'}
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                </View>
                <ThemedText style={styles.formBody}>
                  You may be asked to confirm your email before your first password sign-in.
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={styles.formBody}>
                  Sign in with the password you created for your MeterBuddy account.
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset password"
                  accessibilityHint="Sends a password reset email to the email address entered above."
                  disabled={isAuthenticating}
                  onPress={() => void handlePasswordReset()}>
                  {({ pressed }) => (
                    <View style={[styles.resetPasswordButton, pressed && styles.pressed, isAuthenticating && styles.disabledButton]}>
                      <ThemedText type="smallBold" style={styles.resetPasswordText}>
                        Forgot password?
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              </>
            )}
          </ThemedView>

          {authNotice ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Account status</ThemedText>
              <ThemedText>{authNotice}</ThemedText>
              {isAuthenticated ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start first scan"
                  onPress={() => router.replace('/scan')}>
                  {({ pressed }) => (
                    <View style={[styles.inlineButton, pressed && styles.pressed]}>
                      <ThemedText type="smallBold" style={styles.primaryButtonText}>Start first scan</ThemedText>
                    </View>
                  )}
                </Pressable>
              ) : null}
            </ThemedView>
          ) : null}

          {mode === 'create' && confirmPassword.length > 0 && confirmPassword !== password ? (
            <View style={styles.errorCard}>
              <ThemedText type="smallBold" style={styles.errorTitle}>Password mismatch</ThemedText>
              <ThemedText style={styles.errorBody}>Your password and confirmation need to match before creating the account.</ThemedText>
            </View>
          ) : null}

          {lastError ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss account error"
              accessibilityHint="Clears the current account error message."
              onPress={clearError}>
              {({ pressed }) => (
                <View style={[styles.errorCard, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={styles.errorTitle}>Account error</ThemedText>
                  <ThemedText style={styles.errorBody}>{lastError}</ThemedText>
                </View>
              )}
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode === 'create' ? 'Create account' : 'Sign in'}
            accessibilityState={{ disabled: isAuthenticating }}
            onPress={submit}>
            {({ pressed }) => (
              <View style={[styles.primaryButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={[styles.primaryButtonTitle, styles.primaryButtonText]}>
                  {isAuthenticating
                    ? mode === 'create'
                      ? 'Creating account...'
                      : 'Signing in...'
                    : mode === 'create'
                      ? 'Create account'
                      : 'Sign in'}
                </ThemedText>
                <ThemedText style={[styles.primaryButtonBody, styles.primaryButtonText]}>
                  {mode === 'create'
                    ? 'Save your readings and keep your account synced across devices.'
                    : 'Open your saved readings and continue where you left off.'}
                </ThemedText>
              </View>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={handleBack}>
            {({ pressed }) => (
              <View style={[styles.secondaryButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.secondaryButtonTitle}>Back</ThemedText>
                <ThemedText style={styles.secondaryButtonBody}>
                  {source === 'onboarding'
                    ? 'Return to the onboarding overview.'
                    : 'Return to the meter selection screen.'}
                </ThemedText>
              </View>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
    backgroundColor: '#F4F5FB',
  },
  hero: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#C7D2F6',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  logo: {
    width: 164,
    height: 64,
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    color: '#081F5C',
    fontSize: 44,
    lineHeight: 48,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 18,
    lineHeight: 28,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#EEF1FB',
    shadowColor: '#C7D2F6',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  illustrationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    overflow: 'hidden',
  },
  illustration: {
    width: '100%',
    aspectRatio: 1,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modePressable: {
    flex: 1,
  },
  modeChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
  },
  modeChipActive: {
    backgroundColor: accentBlue,
    borderColor: accentBlue,
    shadowColor: accentBlue,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  modeChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: borderBlue,
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
  modeChipTextInactive: {
    color: inkBlue,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
    backgroundColor: accentBlue,
    borderWidth: 1,
    borderColor: accentBlue,
  },
  cardIntro: {
    gap: 4,
    marginBottom: Spacing.one,
  },
  formTitle: {
    color: '#FFFFFF',
  },
  formBody: {
    color: '#EAF1FF',
  },
  formLabel: {
    color: '#FFFFFF',
  },
  fieldLabel: {
    marginTop: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderColor: '#B8BDC6',
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 18,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  passwordInput: {
    flex: 1,
  },
  passwordToggle: {
    alignSelf: 'stretch',
  },
  passwordToggleChip: {
    minWidth: 68,
    flex: 1,
    borderRadius: 16,
    backgroundColor: accentBlueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  passwordToggleText: {
    color: accentBlue,
  },
  resetPasswordButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  resetPasswordText: {
    color: accentBlue,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
    backgroundColor: errorTint,
    borderWidth: 1,
    borderColor: errorBorder,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 22,
    gap: 4,
    alignItems: 'center',
    backgroundColor: accentBlue,
    shadowColor: accentBlue,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryButtonTitle: {
    textAlign: 'center',
  },
  primaryButtonBody: {
    textAlign: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  inlineButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: accentBlue,
  },
  pressed: {
    opacity: 0.82,
  },
  secondaryButton: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: borderBlue,
  },
  secondaryButtonTitle: {
    color: inkBlue,
  },
  secondaryButtonBody: {
    color: '#405071',
  },
  errorTitle: {
    color: errorText,
  },
  errorBody: {
    color: '#5F2626',
  },
});
