import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getMeterOption } from '@/models/meter-data';
import { formatReminderDate, formatUsageValue, getLatestReadingByType, getLatestResultByType } from '@/models/records';
import { useAppFlow } from '@/stores/app-flow';

export default function ResultsScreen() {
  const { selectedMeterType, readings, results, reminders } = useAppFlow();
  const meter = getMeterOption(selectedMeterType);
  const latestReading = getLatestReadingByType(readings, meter.type);
  const latestResult = getLatestResultByType(results, meter.type);
  const reminder = reminders.find((item) => item.meterType === meter.type);

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Saved result</ThemedText>
          <ThemedText themeColor="textSecondary">
            The current reading is compared against the previous reading and the result is stored for the selected meter type.
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{meter.label} reading</ThemedText>
            <ThemedText>
              {latestReading ? `${latestReading.confirmedValue} ${latestReading.units}` : 'Pending'}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Timestamp: {latestReading?.capturedAt ?? 'Pending'}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Usage comparison</ThemedText>
            <ThemedText>{formatUsageValue(latestResult?.usageValue, meter.defaultUnits)}</ThemedText>
            <ThemedText themeColor="textSecondary">
              Computed from current reading minus previous confirmed reading.
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Next reminder</ThemedText>
            <ThemedText>{formatReminderDate(reminder?.nextDueAt)}</ThemedText>
            <ThemedText themeColor="textSecondary">
              This reminder is scheduled early so the user has time to capture the next reading before the bill cycle ends.
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
  },
});
