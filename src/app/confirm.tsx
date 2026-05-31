import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getMeterOption } from '@/models/meter-data';
import { useAppFlow } from '@/stores/app-flow';

export default function ConfirmScreen() {
  const router = useRouter();
  const { selectedMeterType, captureDraft, confirmDraftReading, isSaving, lastError, clearError } = useAppFlow();
  const meter = getMeterOption(selectedMeterType);
  const [confirmedValue, setConfirmedValue] = useState('');

  useEffect(() => {
    setConfirmedValue(captureDraft?.aiReadingValue ?? '');
  }, [captureDraft?.aiReadingValue]);

  async function saveReading() {
    try {
      await confirmDraftReading(confirmedValue);
      router.replace('/results');
    } catch {
      // Error state is surfaced from the shared store.
    }
  }

  const previewUri = isDisplayableImageUri(captureDraft?.imageUri) ? captureDraft?.imageUri : null;

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <ScrollView contentContainerStyle={styles.content}>
            {!captureDraft ? (
              <View style={styles.card}>
                <ThemedText type="smallBold">No capture ready</ThemedText>
                <ThemedText themeColor="textSecondary">
                  The scan draft is missing or expired. Go back and take the picture again.
                </ThemedText>
              </View>
            ) : null}

            {captureDraft ? (
              <>
                <ThemedText type="subtitle">Confirm reading</ThemedText>
                <ThemedText themeColor="textSecondary">
                  AI suggests the value. The person confirms it. That confirmed value is what gets saved.
                </ThemedText>

                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{meter.label}</ThemedText>
                  {previewUri ? <Image source={{ uri: previewUri }} style={styles.previewImage} contentFit="cover" /> : null}
                  <ThemedText themeColor="textSecondary">
                    Captured at: {captureDraft?.capturedAt ?? 'Pending'}
                  </ThemedText>
                </ThemedView>

                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">AI interpretation</ThemedText>
                  <ThemedText>
                    {captureDraft?.aiReadingValue ? `${captureDraft.aiReadingValue} ${captureDraft.units ?? meter.defaultUnits}` : 'No reading detected'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    Confidence: {Math.round((captureDraft?.aiConfidence ?? 0) * 100)}%
                  </ThemedText>
                  {captureDraft?.analysisNotes ? (
                    <ThemedText themeColor="textSecondary">{captureDraft.analysisNotes}</ThemedText>
                  ) : null}
                  {captureDraft?.serialNumber ? (
                    <ThemedText themeColor="textSecondary">Serial number: {captureDraft.serialNumber}</ThemedText>
                  ) : null}
                </ThemedView>

                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">Confirmed reading</ThemedText>
                  <TextInput
                    value={confirmedValue}
                    onChangeText={setConfirmedValue}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="Enter confirmed reading"
                    placeholderTextColor="#7b8088"
                  />
                  <ThemedText themeColor="textSecondary">
                    The confirmed value is what gets written to Supabase.
                  </ThemedText>
                </ThemedView>

                {lastError ? (
                  <Pressable onPress={clearError}>
                    {({ pressed }) => (
                      <ThemedView type="backgroundElement" style={[styles.card, pressed && styles.pressed]}>
                        <ThemedText type="smallBold">Save error</ThemedText>
                        <ThemedText>{lastError}</ThemedText>
                      </ThemedView>
                    )}
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          <View style={styles.bottomArea}>
            <View style={styles.bottomActions}>
              <Pressable onPress={() => router.replace('/scan')} style={styles.bottomActionPressable}>
                {({ pressed }) => (
                  <ThemedView type="backgroundElement" style={[styles.bottomActionCard, pressed && styles.pressed]}>
                    <ThemedText type="smallBold">Back to scan</ThemedText>
                    <ThemedText>Retake or scan a different meter.</ThemedText>
                  </ThemedView>
                )}
              </Pressable>

              <Pressable onPress={saveReading} disabled={!captureDraft || isSaving} style={styles.bottomActionPressable}>
                {({ pressed }) => (
                  <ThemedView
                    type="backgroundSelected"
                    style={[
                      styles.bottomActionCard,
                      styles.primaryActionCard,
                      pressed && styles.pressed,
                      (!captureDraft || isSaving) && styles.disabled,
                    ]}>
                    <ThemedText type="smallBold">{isSaving ? 'Saving...' : 'Confirm and save'}</ThemedText>
                    <ThemedText>Save this confirmed reading and update history.</ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </View>

            <AppBottomNav active="dashboard" />
          </View>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

function isDisplayableImageUri(value?: string | null) {
  if (!value) return false;
  return /^(file|content|https?|data):/i.test(value);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + 172,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
  },
  primaryActionCard: {
    backgroundColor: '#E0E1E6',
  },
  bottomArea: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bottomActionPressable: {
    flex: 1,
  },
  bottomActionCard: {
    padding: Spacing.three,
    borderRadius: 22,
    gap: Spacing.one,
    minHeight: 92,
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
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
});
