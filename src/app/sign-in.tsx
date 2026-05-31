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

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string | string[] }>();
  const {
    createAccountWithPassword,
    loginWithPassword,
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
  const [mode, setMode] = useState<'create' | 'sign-in'>('create');
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
      router.replace('/');
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
            <Pressable onPress={() => setMode('create')} style={styles.modePressable}>
              {({ pressed }) => (
                <ThemedView
                  type={mode === 'create' ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.modeChip, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">Create account</ThemedText>
                </ThemedView>
              )}
            </Pressable>

            <Pressable onPress={() => setMode('sign-in')} style={styles.modePressable}>
              {({ pressed }) => (
                <ThemedView
                  type={mode === 'sign-in' ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.modeChip, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">Sign in</ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardIntro}>
              <ThemedText type="smallBold">
                {mode === 'create' ? 'Create your MeterBuddy account' : 'Sign in to MeterBuddy'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {mode === 'create'
                  ? 'Your account keeps meter history available on mobile and web, and gives us a durable place to restore your lifetime unlock later.'
                  : 'Use your email and password to access your saved readings, reminders, and synced account history.'}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">Email address</ThemedText>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="name@example.com"
              placeholderTextColor="#7b8088"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />

            <ThemedText type="smallBold" style={styles.fieldLabel}>
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
              <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.passwordToggle}>
                {({ pressed }) => (
                  <View style={[styles.passwordToggleChip, pressed && styles.pressed]}>
                    <ThemedText type="smallBold">{showPassword ? 'Hide' : 'Show'}</ThemedText>
                  </View>
                )}
              </Pressable>
            </View>

            {mode === 'create' ? (
              <>
                <ThemedText type="smallBold" style={styles.fieldLabel}>
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
                  <Pressable onPress={() => setShowConfirmPassword((current) => !current)} style={styles.passwordToggle}>
                    {({ pressed }) => (
                      <View style={[styles.passwordToggleChip, pressed && styles.pressed]}>
                        <ThemedText type="smallBold">{showConfirmPassword ? 'Hide' : 'Show'}</ThemedText>
                      </View>
                    )}
                  </Pressable>
                </View>
                <ThemedText themeColor="textSecondary">
                  You may be asked to confirm your email before your first password sign-in.
                </ThemedText>
              </>
            ) : (
              <ThemedText themeColor="textSecondary">
                Sign in with the password you created for your MeterBuddy account.
              </ThemedText>
            )}
          </ThemedView>

          {authNotice ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Account status</ThemedText>
              <ThemedText>{authNotice}</ThemedText>
              {isAuthenticated ? (
                <Pressable onPress={() => router.replace('/')}>
                  {({ pressed }) => (
                    <ThemedView type="backgroundSelected" style={[styles.inlineButton, pressed && styles.pressed]}>
                      <ThemedText type="smallBold">Continue to MeterBuddy</ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
              ) : null}
            </ThemedView>
          ) : null}

          {mode === 'create' && confirmPassword.length > 0 && confirmPassword !== password ? (
            <ThemedView type="backgroundSelected" style={styles.card}>
              <ThemedText type="smallBold">Password mismatch</ThemedText>
              <ThemedText>Your password and confirmation need to match before creating the account.</ThemedText>
            </ThemedView>
          ) : null}

          {lastError ? (
            <Pressable onPress={clearError}>
              {({ pressed }) => (
                <ThemedView type="backgroundSelected" style={[styles.button, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">Account error</ThemedText>
                  <ThemedText>{lastError}</ThemedText>
                </ThemedView>
              )}
            </Pressable>
          ) : null}

          <Pressable onPress={submit}>
            {({ pressed }) => (
              <ThemedView type="backgroundSelected" style={[styles.primaryButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.primaryButtonTitle}>
                  {isAuthenticating
                    ? mode === 'create'
                      ? 'Creating account...'
                      : 'Signing in...'
                    : mode === 'create'
                      ? 'Create account'
                      : 'Sign in'}
                </ThemedText>
                <ThemedText style={styles.primaryButtonBody}>
                  {mode === 'create'
                    ? 'Save your readings and keep your account synced across devices.'
                    : 'Open your saved readings and continue where you left off.'}
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>

          <Pressable onPress={handleBack}>
            {({ pressed }) => (
              <ThemedView type="backgroundElement" style={[styles.button, pressed && styles.pressed]}>
                <ThemedText type="smallBold">Back</ThemedText>
                <ThemedText>
                  {source === 'onboarding'
                    ? 'Return to the onboarding overview.'
                    : 'Return to the meter selection screen.'}
                </ThemedText>
              </ThemedView>
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
  },
  card: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
  },
  cardIntro: {
    gap: 4,
    marginBottom: Spacing.one,
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
    backgroundColor: '#E8EDF8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  button: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 22,
    gap: 4,
    alignItems: 'center',
  },
  primaryButtonTitle: {
    textAlign: 'center',
  },
  primaryButtonBody: {
    textAlign: 'center',
  },
  inlineButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 16,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
