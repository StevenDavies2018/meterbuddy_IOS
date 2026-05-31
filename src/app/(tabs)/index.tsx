import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { METER_OPTIONS } from '@/models/meter-data';
import { formatReminderDate, getLatestReadingByType, getLatestResultByType } from '@/models/records';
import { MeterType, ReadingRecord } from '@/models/schema';
import { useAppFlow } from '@/stores/app-flow';

const logoImage = require('../../../assets/images/Logo.png');

const meterAccent: Record<MeterType, { tint: string; line: string; button: string; icon: string }> = {
  gas: { tint: '#EFF5FF', line: '#1756D1', button: '#1756D1', icon: 'Gas' },
  hydro: { tint: '#F4F7FF', line: '#4A67D6', button: '#4A67D6', icon: 'Hydro' },
  water: { tint: '#EEF9F5', line: '#0E8C6F', button: '#0E8C6F', icon: 'Water' },
};

export default function DashboardScreen() {
  const router = useRouter();
  const {
    readings,
    results,
    reminders,
    setSelectedMeterType,
    isBootstrapping,
    authEmail,
    isAuthenticated,
    hasCompletedOnboarding,
    lastError,
    clearError,
  } = useAppFlow();

  useEffect(() => {
    if (!isBootstrapping && !hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [hasCompletedOnboarding, isBootstrapping, router]);

  const recentReadings = [...readings]
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    .slice(0, 3);

  const firstName = authEmail?.split('@')[0]?.split(/[.+_-]/)[0] ?? 'there';
  const greetingName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  function startScan(meterType: MeterType) {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }

    setSelectedMeterType(meterType);
    router.push('/scan');
  }

  function pickPrimaryMeter() {
    const latest = recentReadings[0]?.meterType ?? 'gas';
    startScan(latest);
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText style={styles.greeting}>Hello, {greetingName}</ThemedText>
              <View style={styles.sublineRow}>
                <View style={styles.statusDot} />
                <ThemedText themeColor="textSecondary" style={styles.subline}>
                  {recentReadings.length > 0
                    ? `${recentReadings.length} recent reading${recentReadings.length === 1 ? '' : 's'} on file`
                    : 'No readings saved today'}
                </ThemedText>
              </View>
            </View>
            <Image source={logoImage} style={styles.logo} contentFit="contain" />
          </View>

          <Pressable onPress={pickPrimaryMeter}>
            {({ pressed }) => (
              <View style={[styles.scanHeroCard, pressed && styles.pressed]}>
                <View style={styles.scanIconWrap}>
                  <View style={styles.scanIconCore}>
                    <ThemedText style={styles.scanIconText}>◉</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.scanHeroTitle}>Scan Reading</ThemedText>
                <ThemedText style={styles.scanHeroSubtitle}>AI powered detection</ThemedText>
              </View>
            )}
          </Pressable>

          {!isAuthenticated && !isBootstrapping ? (
            <Pressable onPress={() => router.push('/sign-in')}>
              {({ pressed }) => (
                <View style={[styles.accountPromptCard, pressed && styles.pressed]}>
                  <View style={styles.accountPromptCopy}>
                    <ThemedText style={styles.accountPromptTitle}>Create your account</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      Sign in before your first saved reading so history syncs across devices.
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.accountPromptAction}>Continue</ThemedText>
                </View>
              )}
            </Pressable>
          ) : null}

          {lastError ? (
            <Pressable onPress={clearError}>
              {({ pressed }) => (
                <View style={[styles.errorCard, pressed && styles.pressed]}>
                  <ThemedText style={styles.errorTitle}>Something needs attention</ThemedText>
                  <ThemedText>{lastError}</ThemedText>
                </View>
              )}
            </Pressable>
          ) : null}

          <View style={styles.sectionRow}>
            <ThemedText style={styles.sectionTitle}>Meter Status</ThemedText>
            <ThemedText style={styles.sectionAction}>Tap to scan</ThemedText>
          </View>

          <View style={styles.statusGrid}>
            {METER_OPTIONS.map((meter) => {
              const reading = getLatestReadingByType(readings, meter.type);
              const result = getLatestResultByType(results, meter.type);
              const reminder = reminders.find((item) => item.meterType === meter.type);
              const accent = meterAccent[meter.type];

              return (
                <View key={meter.type} style={styles.statusCardPressable}>
                  <View style={[styles.statusCard, { backgroundColor: accent.tint }]}>
                    <View style={styles.statusCardTop}>
                      <View style={[styles.statusCardIcon, { backgroundColor: accent.line }]}>
                        <ThemedText style={styles.statusCardIconText}>{accent.icon}</ThemedText>
                      </View>
                      <ThemedText style={styles.statusCardChange}>
                        {result?.usageValue !== undefined ? `${result.usageValue} ${meter.defaultUnits}` : 'New'}
                      </ThemedText>
                    </View>

                    <ThemedText style={styles.statusCardLabel}>{meter.label.replace(' Meter', '')}</ThemedText>
                    <ThemedText style={styles.statusCardReading}>
                      {reading ? reading.confirmedValue : '--'}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.statusCardUnits}>
                      {reading ? `${reading.units} • ${formatReminderDate(reminder?.nextDueAt)}` : 'No reading saved yet'}
                    </ThemedText>

                    <View style={styles.statusThumbWrap}>
                      {reading ? (
                        isDisplayableImageUri(reading.imageUri) ? (
                          <Image source={{ uri: reading.imageUri }} style={styles.statusThumb} contentFit="cover" />
                        ) : (
                          <View style={styles.statusThumbPlaceholder}>
                            <ThemedText style={styles.statusThumbPlaceholderText}>Photo saved</ThemedText>
                          </View>
                        )
                      ) : (
                        <View style={styles.statusThumbPlaceholder}>
                          <ThemedText style={styles.statusThumbPlaceholderText}>No photo yet</ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.sectionRow}>
            <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
          </View>

          <View style={styles.activityList}>
            {recentReadings.length > 0 ? (
              recentReadings.map((reading) => (
                <View key={reading.id} style={styles.activityCard}>
                  <View style={styles.activityThumbWrap}>
                    {isDisplayableImageUri(reading.imageUri) ? (
                      <Image source={{ uri: reading.imageUri }} style={styles.activityThumb} contentFit="cover" />
                    ) : (
                      <View style={styles.activityThumbFallback}>
                        <ThemedText style={styles.activityThumbFallbackText}>Saved</ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={styles.activityCopy}>
                    <ThemedText style={styles.activityTitle}>{formatMeterName(reading.meterType)}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.activityMeta}>
                      {reading.confirmedValue} {reading.units}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.activityMeta}>
                      {formatRelativeDate(reading)}
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.activityChevron}>›</ThemedText>
                </View>
              ))
            ) : (
              <View style={styles.emptyActivityCard}>
                <ThemedText style={styles.emptyActivityTitle}>No saved readings yet</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Take your first meter photo and your recent activity will start showing up here.
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.footerNote}>
            <ThemedText style={styles.footerNoteTitle}>Billing cycles vary</ThemedText>
            <ThemedText themeColor="textSecondary">
              MeterBuddy reminds you after 28 days so you have time to capture a reading before the next bill closes.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function isDisplayableImageUri(value?: string | null) {
  if (!value) return false;
  return /^(file|content|https?|data):/i.test(value);
}

function formatMeterName(type: MeterType) {
  if (type === 'gas') return 'Gas Reading';
  if (type === 'hydro') return 'Hydro Reading';
  return 'Water Reading';
}

function formatRelativeDate(reading: ReadingRecord) {
  const date = new Date(reading.capturedAt);
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
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
    backgroundColor: '#F5F7FD',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  greeting: {
    color: '#081F5C',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  sublineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#19A75A',
  },
  subline: {
    fontSize: 14,
    lineHeight: 20,
  },
  logo: {
    width: 98,
    height: 46,
  },
  scanHeroCard: {
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 24,
    backgroundColor: '#1756D1',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1756D1',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  scanIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  scanIconCore: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanIconText: {
    color: '#1756D1',
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '800',
  },
  scanHeroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  scanHeroSubtitle: {
    color: '#DCE6FF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accountPromptCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: '#E3E8F4',
  },
  accountPromptCopy: {
    flex: 1,
    gap: 4,
  },
  accountPromptTitle: {
    color: '#081F5C',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  accountPromptAction: {
    color: '#1756D1',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  errorCard: {
    padding: 18,
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
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#081F5C',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  sectionAction: {
    color: '#1756D1',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusCardPressable: {
    width: '31%',
    minWidth: 108,
    flexGrow: 1,
  },
  statusCard: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
    minHeight: 214,
  },
  statusCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusCardIcon: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusCardIconText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  statusCardChange: {
    color: '#6A748E',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  statusCardLabel: {
    color: '#081F5C',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statusCardReading: {
    color: '#081F5C',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  statusCardUnits: {
    fontSize: 11,
    lineHeight: 16,
  },
  statusThumbWrap: {
    marginTop: 2,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    height: 72,
  },
  statusThumb: {
    width: '100%',
    height: '100%',
  },
  statusThumbPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statusThumbPlaceholderText: {
    color: '#6A748E',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  activityList: {
    gap: Spacing.two,
  },
  activityCard: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8F4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityThumbWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E9EEF9',
  },
  activityThumb: {
    width: '100%',
    height: '100%',
  },
  activityThumbFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9EEF9',
  },
  activityThumbFallbackText: {
    color: '#6A748E',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  activityCopy: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    color: '#081F5C',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  activityMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  activityChevron: {
    color: '#9CA7C2',
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },
  emptyActivityCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8F4',
    gap: 6,
  },
  emptyActivityTitle: {
    color: '#081F5C',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  footerNote: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EAF0FB',
    gap: 4,
  },
  footerNoteTitle: {
    color: '#081F5C',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.86,
  },
});
