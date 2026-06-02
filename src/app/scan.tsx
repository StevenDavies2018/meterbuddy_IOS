import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';

import { AppBottomNav } from '@/components/app-bottom-nav';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getMeterOption, METER_OPTIONS } from '@/models/meter-data';
import { getLatestReadingByType } from '@/models/records';
import { useAppFlow } from '@/stores/app-flow';

const meterAccent = {
  gas: { tint: '#EFF5FF', chip: '#1756D1' },
  hydro: { tint: '#F4F7FF', chip: '#4A67D6' },
  water: { tint: '#EEF9F5', chip: '#0E8C6F' },
} as const;
const logoImage = require('../../assets/images/Logo.png');

const checklistItems = [
  'Choose the meter you are about to scan.',
  'Center the cumulative readout and keep glare off the display.',
  'Hold steady so the digits are sharp and easy to confirm.',
  'Review the AI suggestion before saving the reading.',
  'Caution - When taking a photo please do not touch any part of the meter.',
];

export default function ScanScreen() {
  const router = useRouter();
  const {
    selectedMeterType,
    readings,
    beginCaptureDraft,
    isAnalyzingCapture,
    lastError,
    clearError,
    setSelectedMeterType,
    hasProAccess,
  } = useAppFlow();
  const meter = getMeterOption(selectedMeterType);
  const previousReading = getLatestReadingByType(readings, meter.type);
  const accent = meterAccent[meter.type];
  const hasPriorityProcessing = hasProAccess;
  const queuedCaptureRef = useRef<{
    meterType: typeof meter.type;
    imageUri: string;
    imageBase64: string;
    capturedAt: string;
    mimeType?: string | null;
  } | null>(null);
  const [hasQueuedCapture, setHasQueuedCapture] = useState(false);
  const [processingCountdown, setProcessingCountdown] = useState(15);

  useEffect(() => {
    if (!hasQueuedCapture || hasPriorityProcessing) {
      return;
    }

    if (processingCountdown <= 0) {
      const captureToProcess = queuedCaptureRef.current;

      queuedCaptureRef.current = null;
      setHasQueuedCapture(false);
      setProcessingCountdown(15);

      if (!captureToProcess) {
        return;
      }

      beginCaptureDraft(captureToProcess)
        .then(() => {
          router.push('/confirm');
        })
        .catch(() => {
          router.push('/confirm');
        });

      return;
    }

    const timer = setTimeout(() => {
      setProcessingCountdown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [beginCaptureDraft, hasPriorityProcessing, hasQueuedCapture, processingCountdown, router]);

  async function launchCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.uri || !result.assets[0]?.base64) {
      return;
    }

    const capture = {
      meterType: meter.type,
      imageUri: result.assets[0].uri,
      imageBase64: result.assets[0].base64,
      capturedAt: new Date().toISOString(),
      mimeType: result.assets[0].mimeType,
    };

    if (hasPriorityProcessing) {
      await beginCaptureDraft(capture);
      router.push('/confirm');
      return;
    }

    queuedCaptureRef.current = capture;
    setProcessingCountdown(15);
    setHasQueuedCapture(true);
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroCopy}>
                  <ThemedText style={styles.title}>Scan Meter</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                    Pick which utility you are scanning, then capture a clean photo of the current readout.
                  </ThemedText>
                </View>
                <Image source={logoImage} style={styles.logo} contentFit="contain" />
              </View>
            </View>

            <View style={styles.selectorRow}>
              {METER_OPTIONS.map((option) => {
                const selected = option.type === meter.type;
                const optionAccent = meterAccent[option.type];

                return (
                  <Pressable
                    key={option.type}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${option.label}`}
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedMeterType(option.type)}
                    style={styles.selectorPressable}>
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.selectorChip,
                          selected
                            ? { backgroundColor: optionAccent.chip, borderColor: optionAccent.chip }
                            : { backgroundColor: '#FFFFFF', borderColor: '#DDE4F1' },
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText style={[styles.selectorText, selected && styles.selectorTextSelected]}>
                          {option.label.replace(' Meter', '')}
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.scanCard, { backgroundColor: accent.tint }]}>
              <View style={styles.scanCardHeader}>
                <View>
                  <ThemedText style={styles.scanCardEyebrow}>{meter.label}</ThemedText>
                  <ThemedText style={styles.scanCardTitle}>Ready to capture</ThemedText>
                </View>
                <View style={[styles.scanBadge, { backgroundColor: accent.chip }]}>
                  <ThemedText style={styles.scanBadgeText}>Camera</ThemedText>
                </View>
              </View>

              <View style={styles.readingPanel}>
                <ThemedText style={styles.panelLabel}>Previous confirmed reading</ThemedText>
                <ThemedText style={styles.panelValue}>
                  {previousReading
                    ? `${previousReading.confirmedValue} ${previousReading.units}`
                    : `No previous ${meter.label.toLowerCase()} reading`}
                </ThemedText>
              </View>

              <View style={styles.checklistPanel}>
                <ThemedText style={styles.panelLabel}>Capture checklist</ThemedText>
                <View style={styles.checklistList}>
                  {checklistItems.map((item, index) => (
                    item.startsWith('Caution') ? (
                      <View key={item} style={styles.warningItem}>
                        <View style={styles.warningBadge}>
                          <ThemedText style={styles.warningBadgeText}>!</ThemedText>
                        </View>
                        <ThemedText style={styles.warningText}>{item}</ThemedText>
                      </View>
                    ) : (
                      <View key={item} style={styles.checklistItem}>
                        <View style={[styles.checkmark, { backgroundColor: accent.chip }]}>
                          <ThemedText style={styles.checkmarkText}>{index + 1}</ThemedText>
                        </View>
                        <ThemedText style={styles.checklistText}>{item}</ThemedText>
                      </View>
                    )
                  ))}
                </View>
              </View>
            </View>

            {lastError ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss last error"
                accessibilityHint="Clears the current error message."
                onPress={clearError}>
                {({ pressed }) => (
                  <View style={[styles.errorCard, pressed && styles.pressed]}>
                    <ThemedText style={styles.errorTitle}>Last error</ThemedText>
                    <ThemedText>{lastError}</ThemedText>
                  </View>
                )}
              </Pressable>
            ) : null}

            {hasQueuedCapture ? (
              <View style={styles.processingCard}>
                <ThemedText style={styles.processingTitle}>Standard processing queue</ThemedText>
                <ThemedText style={styles.processingBody}>
                  Priority processing is not enabled on this account, so this scan is in the standard processing queue.
                </ThemedText>
                <View style={styles.processingTimerBadge}>
                  <ThemedText style={styles.processingTimerText}>{processingCountdown}s</ThemedText>
                </View>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                hasQueuedCapture ? 'Scan queued for processing' : isAnalyzingCapture ? 'Reading meter' : `Take picture of ${meter.label}`
              }
              accessibilityHint="Opens the device camera to capture a meter reading."
              accessibilityState={{ disabled: isAnalyzingCapture || hasQueuedCapture }}
              onPress={launchCamera}
              disabled={isAnalyzingCapture || hasQueuedCapture}>
              {({ pressed }) => (
                <View
                  style={[
                    styles.captureButton,
                    { backgroundColor: accent.chip },
                    pressed && styles.pressed,
                    isAnalyzingCapture && styles.captureButtonDisabled,
                    hasQueuedCapture && styles.captureButtonDisabled,
                  ]}>
                  <ThemedText style={styles.captureButtonTitle}>
                    {hasQueuedCapture ? 'Queued for processing' : isAnalyzingCapture ? 'Reading meter...' : 'Take picture'}
                  </ThemedText>
                  <ThemedText style={styles.captureButtonBody}>
                    {hasQueuedCapture
                      ? 'Your scan is in the standard processing queue. The confirm screen will open automatically.'
                      : isAnalyzingCapture
                      ? 'Sending the captured photo to AI so the confirm screen opens with a suggested reading.'
                      : 'Open the device camera and capture a real image for AI reading and Supabase upload.'}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          </ScrollView>

          <AppBottomNav active="dashboard" />
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FD',
  },
  page: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    gap: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  logo: {
    width: 132,
    height: 42,
  },
  title: {
    color: '#081F5C',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  selectorPressable: {
    flex: 1,
  },
  selectorChip: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  selectorText: {
    color: '#081F5C',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  selectorTextSelected: {
    color: '#FFFFFF',
  },
  scanCard: {
    borderRadius: 24,
    padding: 18,
    gap: Spacing.two,
  },
  scanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  scanCardEyebrow: {
    color: '#6A748E',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  scanCardTitle: {
    color: '#081F5C',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
  },
  scanBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scanBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  readingPanel: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  checklistPanel: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  panelLabel: {
    color: '#6A748E',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  panelValue: {
    color: '#081F5C',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  checklistList: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '800',
  },
  checklistText: {
    flex: 1,
    color: '#11182F',
    fontSize: 15,
    lineHeight: 22,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFF5E8',
    borderWidth: 1,
    borderColor: '#F4D2A1',
  },
  warningBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E68A1F',
    marginTop: 1,
  },
  warningBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '800',
  },
  warningText: {
    flex: 1,
    color: '#8A4F10',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  errorCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F4CACA',
    gap: 4,
  },
  errorTitle: {
    color: '#8F1D1D',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  processingCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#C8D9FF',
    gap: 10,
  },
  processingTitle: {
    color: '#081F5C',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  processingBody: {
    color: '#405071',
    fontSize: 14,
    lineHeight: 20,
  },
  processingTimerBadge: {
    alignSelf: 'flex-start',
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1756D1',
  },
  processingTimerText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  captureButton: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#081F5C',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  captureButtonTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  captureButtonBody: {
    color: '#EAF1FF',
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
  captureButtonDisabled: {
    opacity: 0.72,
  },
});
