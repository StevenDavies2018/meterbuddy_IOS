import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
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
              MeterBuddy currently schedules reminders 28 days after each saved reading.
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>AI scan limits</ThemedText>
            <ThemedText themeColor="textSecondary">
              We’ll surface your pooled monthly AI scan allowance here once the gating rules are wired into the app.
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Data and exports</ThemedText>
            <ThemedText themeColor="textSecondary">
              Export, web dashboard access, and premium comparisons will be managed from this area later.
            </ThemedText>
          </View>
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
});
