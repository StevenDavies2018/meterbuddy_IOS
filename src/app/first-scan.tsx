import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { METER_OPTIONS } from '@/models/meter-data';
import { useAppFlow } from '@/stores/app-flow';

export default function FirstScanScreen() {
  const router = useRouter();
  const { setSelectedMeterType, markFirstScanPromptComplete, authEmail } = useAppFlow();

  function startFirstScan(meterType: (typeof METER_OPTIONS)[number]['type']) {
    markFirstScanPromptComplete();
    setSelectedMeterType(meterType);
    router.replace('/scan');
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <ThemedText type="subtitle">Ready for your first scan</ThemedText>
            <ThemedText themeColor="textSecondary">
              {authEmail
                ? `Your account is ready for ${authEmail}. Pick the meter you want to scan first.`
                : 'Your account is ready. Pick the meter you want to scan first.'}
            </ThemedText>
          </View>

          {METER_OPTIONS.map((meter) => (
            <Pressable key={meter.type} onPress={() => startFirstScan(meter.type)}>
              {({ pressed }) => (
                <ThemedView type="backgroundElement" style={[styles.card, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">{meter.label}</ThemedText>
                  <ThemedText>{meter.shortPrompt}</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    MeterBuddy will open the camera next and guide you through confirmation before save.
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          ))}

          <Pressable
            onPress={() => {
              markFirstScanPromptComplete();
              router.replace('/');
            }}>
            {({ pressed }) => (
              <ThemedView type="backgroundSelected" style={[styles.button, pressed && styles.pressed]}>
                <ThemedText type="smallBold">Skip for now</ThemedText>
                <ThemedText>Go to the app home and come back when you are ready to scan a meter.</ThemedText>
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
  },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    gap: Spacing.one,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
  },
  button: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.82,
  },
});
