import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';

const supportEmail = 'support@meterbuddy.ca';

export default function SettingsScreen() {
  const router = useRouter();

  function openFeedbackEmail() {
    const appVersion = Constants.expoConfig?.version ?? 'unknown';
    const buildNumber =
      Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.buildNumber
        : Constants.expoConfig?.android?.versionCode?.toString();
    const deviceName = Device.modelName ?? 'unknown device';
    const osVersion = `${Platform.OS} ${Device.osVersion ?? 'unknown'}`;
    const subject = encodeURIComponent('MeterBuddy feedback');
    const body = encodeURIComponent(
      [
        'Hi MeterBuddy team,',
        '',
        'I wanted to share this feedback:',
        '',
        '',
        '---',
        `App version: ${appVersion}`,
        `Build: ${buildNumber ?? 'unknown'}`,
        `Device: ${deviceName}`,
        `OS: ${osVersion}`,
      ].join('\n')
    );

    void Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <ThemedText style={styles.title}>Settings</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Preferences and app controls will live here as the product grows.
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Reminder timing</ThemedText>
            <ThemedText themeColor="textSecondary">
              MeterBuddy sets the next reading reminder for 28 days after each saved reading.
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>MeterBuddy Pro</ThemedText>
            <ThemedText themeColor="textSecondary">
              Free users use the standard processing queue. A lifetime Pro unlock enables priority
              processing on supported scans.
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Data and exports</ThemedText>
            <ThemedText themeColor="textSecondary">
              Exports and web dashboard tools are available on the MeterBuddy website.
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View walkthrough"
            accessibilityHint="Opens the MeterBuddy introduction screens."
            onPress={() => router.push('/onboarding?source=settings')}>
            {({ pressed }) => (
              <View style={[styles.secondaryActionCard, pressed && styles.pressed]}>
                <ThemedText style={styles.secondaryActionTitle}>View walkthrough</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Revisit the quick guide for scanning, confirming, and tracking meter readings.
                </ThemedText>
              </View>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send feedback"
            accessibilityHint="Opens your email app with MeterBuddy device details included."
            onPress={openFeedbackEmail}>
            {({ pressed }) => (
              <View style={[styles.feedbackCard, pressed && styles.pressed]}>
                <ThemedText style={styles.feedbackTitle}>Send feedback</ThemedText>
                <ThemedText style={styles.feedbackBody}>
                  Tell us what worked, what was confusing, or what you want improved next.
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
  cardTitle: {
    color: '#081F5C',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  feedbackCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#1756D1',
    gap: 6,
  },
  feedbackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  feedbackBody: {
    color: '#EAF1FF',
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryActionCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EEF2FB',
    gap: 6,
  },
  secondaryActionTitle: {
    color: '#1756D1',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.86,
  },
});
