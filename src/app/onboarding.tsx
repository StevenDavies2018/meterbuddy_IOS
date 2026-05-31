import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAppFlow } from '@/stores/app-flow';

const scanImage = require('../../assets/images/onboarding-scan.png');
const confirmImage = require('../../assets/images/onboarding-confirm.png');
const reminderImage = require('../../assets/images/onboarding-reminder.png');
const logoImage = require('../../assets/images/Logo.png');

const steps = [
  {
    title: 'Take a clear photo',
    body: 'Capture the full cumulative meter readout so MeterBuddy can send it to AI and suggest the most likely value.',
    image: scanImage,
    cta: 'Continue',
  },
  {
    title: 'Confirm before save',
    body: 'Review every AI suggestion before it is saved. You can confirm it as-is or correct it before it becomes part of your record.',
    image: confirmImage,
    cta: 'Continue',
  },
  {
    title: 'Track the next cycle',
    body: 'After each save, MeterBuddy schedules a 28-day reminder and compares the next reading to your previous one so you can spot changes over time.',
    image: reminderImage,
    cta: 'Get Started',
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAppFlow();
  const [stepIndex, setStepIndex] = useState(0);

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  function finish() {
    completeOnboarding();
    router.replace('/sign-in?source=onboarding');
  }

  function advance() {
    if (isLastStep) {
      finish();
      return;
    }

    setStepIndex((current) => current + 1);
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.topRow}>
            <View style={styles.logoWrap}>
              <Image source={logoImage} style={styles.logo} contentFit="contain" />
            </View>

            <Pressable onPress={finish}>
              {({ pressed }) => (
                <ThemedText style={[isLastStep ? styles.skipDark : styles.skip, pressed && styles.pressedText]}>
                  {isLastStep ? 'SKIP' : 'Skip'}
                </ThemedText>
              )}
            </Pressable>
          </View>

          <View style={[styles.heroCard, isLastStep && styles.heroCardDetailed]}>
            <View style={[styles.imageFrame, isLastStep && styles.imageFrameDetailed]}>
              <Image source={step.image} style={styles.heroImage} contentFit="contain" />
            </View>
          </View>

          <View style={styles.copyBlock}>
            <ThemedText type="subtitle" style={styles.title}>
              {step.title}
            </ThemedText>
            <ThemedText style={styles.body}>{step.body}</ThemedText>
          </View>

          {isLastStep ? (
            <View style={styles.metricCard}>
              <View style={styles.metricIconWrap}>
                <ThemedText style={styles.metricIcon}>⏰</ThemedText>
              </View>
              <View style={styles.metricColumn}>
                <ThemedText style={styles.metricLabel}>NEXT READING DUE</ThemedText>
                <ThemedText style={styles.metricValue}>28 days from now</ThemedText>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricColumn}>
                <ThemedText style={styles.metricLabel}>AI CONFIDENCE</ThemedText>
                <ThemedText style={styles.metricValueSuccess}>High</ThemedText>
              </View>
            </View>
          ) : null}

          <View style={styles.dotsRow}>
            {steps.map((_, index) => (
              <View key={index} style={[styles.dot, index === stepIndex && styles.dotActive]} />
            ))}
          </View>

          <Pressable onPress={advance}>
            {({ pressed }) => (
              <View style={[styles.primaryButton, pressed && styles.pressedButton]}>
                <ThemedText style={styles.primaryButtonText}>{step.cta} →</ThemedText>
              </View>
            )}
          </Pressable>

          {!isLastStep ? (
            <Pressable onPress={finish}>
              {({ pressed }) => (
                <ThemedText style={[styles.bottomSkip, pressed && styles.pressedText]}>Skip onboarding</ThemedText>
              )}
            </Pressable>
          ) : null}
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
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 36,
    backgroundColor: '#F4F5FB',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    minHeight: 72,
  },
  logoWrap: {
    justifyContent: 'center',
    paddingTop: 2,
  },
  logo: {
    width: 164,
    height: 64,
  },
  skip: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1756D1',
  },
  skipDark: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#262B3D',
    letterSpacing: 0.6,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#EEF1FB',
    shadowColor: '#C7D2F6',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    marginBottom: 28,
  },
  heroCardDetailed: {
    borderWidth: 1,
    borderColor: '#D5DCEE',
  },
  imageFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    overflow: 'hidden',
    aspectRatio: 1,
  },
  imageFrameDetailed: {
    borderRadius: 4,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  copyBlock: {
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    fontSize: 46,
    lineHeight: 50,
    color: '#081F5C',
  },
  body: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 34,
    color: '#454B61',
    paddingHorizontal: 18,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DADDEA',
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 26,
    gap: 18,
  },
  metricIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#FFF7E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 26,
    color: '#F1A100',
  },
  metricColumn: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    color: '#6B7186',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: '#11182F',
  },
  metricValueSuccess: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#159957',
  },
  metricDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#DADDEA',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#C7CCDB',
  },
  dotActive: {
    width: 34,
    backgroundColor: '#1756D1',
  },
  primaryButton: {
    backgroundColor: '#1756D1',
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: '#1756D1',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  bottomSkip: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 17,
    lineHeight: 24,
    color: '#7B8BAE',
  },
  pressedButton: {
    opacity: 0.88,
  },
  pressedText: {
    opacity: 0.7,
  },
});
