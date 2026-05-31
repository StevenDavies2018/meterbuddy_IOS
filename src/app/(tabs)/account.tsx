import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppFlow } from '@/stores/app-flow';

export default function AccountScreen() {
  const { authEmail, authUserId, isAuthenticated, logout, deleteAccount } = useAppFlow();
  const [isDeleteArmed, setIsDeleteArmed] = useState(false);

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <ThemedText style={styles.title}>Account</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Manage the account tied to your readings, reminders, and future lifetime unlock.
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
            <ThemedText style={styles.cardLabel}>Lifetime unlock</ThemedText>
            <ThemedText style={styles.cardValue}>Not unlocked yet</ThemedText>
            <ThemedText themeColor="textSecondary">
              We’ll use this account to restore your one-time purchase across devices later.
            </ThemedText>
          </View>

          {isAuthenticated ? (
            <>
              <Pressable
                onPress={() => {
                  void logout();
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
});
