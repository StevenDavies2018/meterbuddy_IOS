import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppFlow } from '@/stores/app-flow';

export default function AccountScreen() {
  const router = useRouter();
  const {
    authEmail,
    authUserId,
    isAuthenticated,
    logout,
    deleteAccount,
    hasProAccess,
    purchasesReady,
    showProPaywall,
    restorePurchases,
    openCustomerCenter,
  } = useAppFlow();
  const [isDeleteArmed, setIsDeleteArmed] = useState(false);

  async function handleUnlockPro() {
    try {
      const unlocked = await showProPaywall();

      if (unlocked) {
        Alert.alert('MeterBuddy Pro unlocked', 'Your Pro access is now active on this account.');
      }
    } catch (error) {
      Alert.alert('Purchases unavailable', error instanceof Error ? error.message : 'RevenueCat is not ready yet.');
    }
  }

  async function handleRestorePurchases() {
    try {
      await restorePurchases();
      Alert.alert('Restore complete', 'Your App Store purchases have been refreshed for this account.');
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Unable to restore purchases right now.');
    }
  }

  async function handleOpenCustomerCenter() {
    try {
      await openCustomerCenter();
    } catch (error) {
      Alert.alert('Customer center unavailable', error instanceof Error ? error.message : 'RevenueCat is not ready yet.');
    }
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <ThemedText style={styles.title}>Account</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Manage the account tied to your readings, reminders, and MeterBuddy Pro access.
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.cardLabel}>Email</ThemedText>
            <ThemedText style={styles.cardValue}>
              {isAuthenticated ? authEmail ?? 'Signed in user' : 'Not signed in'}
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.cardLabel}>Account status</ThemedText>
            <ThemedText style={styles.cardValue}>{isAuthenticated ? 'Active' : 'Guest session'}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {isAuthenticated
                ? `Account id: ${authUserId}`
                : 'Create an account before saving readings if you want web access later.'}
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.cardLabel}>MeterBuddy Pro</ThemedText>
            <ThemedText style={styles.cardValue}>{hasProAccess ? 'Unlocked' : 'Not unlocked yet'}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {hasProAccess
                ? 'This account has Pro access, including priority processing on supported flows.'
                : 'Use this account to unlock MeterBuddy Pro and restore the purchase across devices.'}
            </ThemedText>
          </View>

          {Platform.OS === 'ios' ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hasProAccess ? 'Manage MeterBuddy Pro' : 'Unlock MeterBuddy Pro'}
                accessibilityHint="Opens purchase tools for MeterBuddy Pro."
                accessibilityState={{ disabled: !purchasesReady }}
                disabled={!purchasesReady}
                onPress={() => void handleUnlockPro()}>
                {({ pressed }) => (
                  <View style={[styles.proCard, pressed && styles.pressed, !purchasesReady && styles.disabledCard]}>
                      <ThemedText style={styles.proTitle}>{hasProAccess ? 'Manage MeterBuddy Pro' : 'Unlock MeterBuddy Pro'}</ThemedText>
                      <ThemedText style={styles.proBody}>
                        {hasProAccess
                          ? 'Open purchase tools for this account.'
                          : 'Show the lifetime unlock paywall for priority processing.'}
                      </ThemedText>
                    </View>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                accessibilityHint="Refreshes previous App Store purchases for this account."
                accessibilityState={{ disabled: !purchasesReady }}
                disabled={!purchasesReady}
                onPress={() => void handleRestorePurchases()}>
                {({ pressed }) => (
                  <View style={[styles.actionCard, pressed && styles.pressed, !purchasesReady && styles.disabledCard]}>
                    <ThemedText style={styles.actionTitle}>Restore purchases</ThemedText>
                    <ThemedText themeColor="textSecondary">Refresh previous App Store purchases for this account.</ThemedText>
                  </View>
                )}
              </Pressable>

              {hasProAccess ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Manage purchase"
                  accessibilityHint="Opens purchase and restore tools for this account."
                  accessibilityState={{ disabled: !purchasesReady }}
                  disabled={!purchasesReady}
                  onPress={() => void handleOpenCustomerCenter()}>
                  {({ pressed }) => (
                    <View style={[styles.actionCard, pressed && styles.pressed]}>
                      <ThemedText style={styles.actionTitle}>Manage purchase</ThemedText>
                      <ThemedText themeColor="textSecondary">Open purchase and restore tools for this account.</ThemedText>
                    </View>
                  )}
                </Pressable>
              ) : null}
            </>
          ) : null}

          {isAuthenticated ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                accessibilityHint="Signs out and returns to the login screen."
                onPress={() => {
                  void logout().then(() => {
                    router.replace('/sign-in');
                  });
                }}>
                {({ pressed }) => (
                  <View style={[styles.actionCard, pressed && styles.pressed]}>
                    <ThemedText style={styles.actionTitle}>Sign out</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      Use a different account or test a fresh setup flow.
                    </ThemedText>
                  </View>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isDeleteArmed ? 'Confirm permanent account deletion' : 'Delete account'}
                accessibilityHint={
                  isDeleteArmed
                    ? 'Permanently removes your account, readings, reminders, images, and associated access.'
                    : 'Arms account deletion. Tap again to permanently delete.'
                }
                onPress={() => {
                  if (!isDeleteArmed) {
                    setIsDeleteArmed(true);
                    return;
                  }

                  void deleteAccount();
                }}>
                {({ pressed }) => (
                  <View style={[styles.deleteCard, pressed && styles.pressed]}>
                    <ThemedText style={styles.deleteTitle}>
                      {isDeleteArmed ? 'Tap again to permanently delete account' : 'Delete account'}
                    </ThemedText>
                    <ThemedText style={styles.deleteBody}>
                      {isDeleteArmed
                        ? 'This removes your MeterBuddy account, saved readings, reminders, images, and associated access.'
                        : 'Permanently remove your account and data from MeterBuddy.'}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FD',
  },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    gap: 6,
  },
  title: {
    color: '#081F5C',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8F4',
    gap: 6,
  },
  cardLabel: {
    color: '#6A748E',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  cardValue: {
    color: '#081F5C',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  proCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#1756D1',
    gap: 6,
  },
  proTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  proBody: {
    color: '#EAF1FF',
    fontSize: 14,
    lineHeight: 20,
  },
  actionCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EEF2FB',
    gap: 6,
  },
  actionTitle: {
    color: '#1756D1',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  deleteCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F4CACA',
    gap: 6,
  },
  deleteTitle: {
    color: '#A12626',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  deleteBody: {
    color: '#7B3A3A',
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.86,
  },
  disabledCard: {
    opacity: 0.55,
  },
});
