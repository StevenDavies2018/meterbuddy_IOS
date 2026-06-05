import { createContext, ReactNode, startTransition, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { supabase } from '@/lib/supabase';
import { getMeterOption } from '@/models/meter-data';
import { CaptureDraft, MeterType, ReadingRecord, ReminderRecord, ResultRecord } from '@/models/schema';
import {
  createAccount,
  ensureAnonymousSession,
  extractMeterReading,
  fetchMeterRecords,
  requestAccountDeletion,
  requestPasswordReset,
  saveConfirmedReading,
  signInWithPassword,
  signOut,
  uploadMeterImage,
} from '@/lib/meter-service';

const REVENUECAT_PAYWALL_ENTITLEMENT = 'meterbuddy Pro';
const REVENUECAT_PRO_ENTITLEMENT = 'meterbuddy_pro';
const REVENUECAT_LEGACY_PRO_ENTITLEMENT = 'lifetime_unlock';
const REVENUECAT_PRO_ENTITLEMENTS = [
  REVENUECAT_PAYWALL_ENTITLEMENT,
  REVENUECAT_PRO_ENTITLEMENT,
  REVENUECAT_LEGACY_PRO_ENTITLEMENT,
] as const;
const revenueCatAppleApiKey =
  process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? 'appl_FdExZKNWDfyvzSdWwdXMqkGxHVQ';

type AppFlowContextValue = {
  selectedMeterType: MeterType;
  readings: ReadingRecord[];
  results: ResultRecord[];
  reminders: ReminderRecord[];
  captureDraft: CaptureDraft | null;
  isBootstrapping: boolean;
  isSaving: boolean;
  isAnalyzingCapture: boolean;
  isAuthenticating: boolean;
  hasCompletedOnboarding: boolean;
  authUserId: string | null;
  authEmail: string | null;
  isAuthenticated: boolean;
  purchasesReady: boolean;
  hasProAccess: boolean;
  lastError: string | null;
  authNotice: string | null;
  setSelectedMeterType: (meterType: MeterType) => void;
  beginCaptureDraft: (draft: {
    meterType: MeterType;
    imageUri: string;
    imageBase64: string;
    capturedAt: string;
    mimeType?: string | null;
  }) => Promise<void>;
  clearError: () => void;
  completeOnboarding: () => void;
  createAccountWithPassword: (email: string, password: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  confirmDraftReading: (confirmedValue?: string) => Promise<void>;
  showProPaywall: () => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  openCustomerCenter: () => Promise<void>;
};

const AppFlowContext = createContext<AppFlowContextValue | null>(null);

export function AppFlowProvider({ children }: { children: ReactNode }) {
  const onboardingStorageKey = 'meterbuddy.onboardingCompleted';
  const isWeb = Platform.OS === 'web';
  const [selectedMeterType, setSelectedMeterType] = useState<MeterType>('gas');
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [captureDraft, setCaptureDraft] = useState<CaptureDraft | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingCapture, setIsAnalyzingCapture] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [purchasesReady, setPurchasesReady] = useState(Boolean(revenueCatAppleApiKey));
  const [hasProAccess, setHasProAccess] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const captureUploadPayloadRef = useRef<{ imageBase64?: string; mimeType?: string | null } | null>(null);
  const revenueCatConfiguredRef = useRef(false);
  const revenueCatConfigurePromiseRef = useRef<Promise<void> | null>(null);

  async function ensureRevenueCatConfigured() {
    if (Platform.OS !== 'ios') {
      throw new Error('Purchases are only available in the iOS build.');
    }

    if (!revenueCatAppleApiKey) {
      setPurchasesReady(false);
      setHasProAccess(false);
      throw new Error('RevenueCat is not configured for this build.');
    }

    if (revenueCatConfiguredRef.current) {
      return;
    }

    if (revenueCatConfigurePromiseRef.current) {
      await revenueCatConfigurePromiseRef.current;
      return;
    }

    revenueCatConfigurePromiseRef.current = (async () => {
      try {
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        const configured = await Purchases.isConfigured();

        if (!configured) {
          Purchases.configure({
            apiKey: revenueCatAppleApiKey,
          });
        }

        Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          setHasProAccess(hasRevenueCatProAccess(customerInfo));
        });

        if (authUserId) {
          const { customerInfo } = await Purchases.logIn(authUserId);
          setHasProAccess(hasRevenueCatProAccess(customerInfo));
        }

        const customerInfo = await Purchases.getCustomerInfo();

        revenueCatConfiguredRef.current = true;
        setPurchasesReady(true);
        setHasProAccess(hasRevenueCatProAccess(customerInfo));
      } catch (error) {
        revenueCatConfiguredRef.current = false;
        revenueCatConfigurePromiseRef.current = null;
        console.error('RevenueCat configuration failed', error);
        setPurchasesReady(false);
        setHasProAccess(false);
        throw error;
      }
    })();

    await revenueCatConfigurePromiseRef.current;
  }

  useEffect(() => {
    if (!revenueCatConfiguredRef.current) {
      return;
    }

    let cancelled = false;

    const identityPromise = authUserId ? Purchases.logIn(authUserId).then(({ customerInfo }) => customerInfo) : Purchases.logOut();

    identityPromise
      .then((customerInfo) => {
        if (!cancelled) {
          setHasProAccess(hasRevenueCatProAccess(customerInfo));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('RevenueCat identity sync failed', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  useEffect(() => {
    let cancelled = false;

    async function syncSessionState() {
      try {
        const onboardingFlag = await readPersistentFlag(onboardingStorageKey, isWeb);

        if (cancelled) return;

        startTransition(() => {
          setHasCompletedOnboarding(onboardingFlag === 'true');
        });

        const session = await ensureAnonymousSession();

        if (cancelled) return;

        if (!session?.user) {
          startTransition(() => {
            setAuthUserId(null);
            setAuthEmail(null);
            setReadings([]);
            setResults([]);
            setReminders([]);
            setLastError(null);
            setAuthNotice(null);
          });
          return;
        }

        const remote = await fetchMeterRecords(session.user.id);

        if (cancelled) return;

        startTransition(() => {
          setAuthUserId(session.user.id);
          setAuthEmail(session.user.email ?? null);
          setReadings(dedupeReadings(remote.readings));
          setResults(dedupeResults(remote.results));
          setReminders(dedupeReminders(remote.reminders));
          setLastError(null);
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Supabase bootstrap failed', error);
        setLastError(getErrorMessage(error, 'Failed to connect to Supabase.'));
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    syncSessionState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;

      startTransition(() => {
        setAuthUserId(session?.user?.id ?? null);
        setAuthEmail(session?.user?.email ?? null);
      });

      if (!session?.user) {
        startTransition(() => {
          setReadings([]);
          setResults([]);
          setReminders([]);
        });
        return;
      }

      fetchMeterRecords(session.user.id)
        .then((remote) => {
          if (cancelled) return;
          startTransition(() => {
            setReadings(dedupeReadings(remote.readings));
            setResults(dedupeResults(remote.results));
            setReminders(dedupeReminders(remote.reminders));
          });
        })
        .catch((error) => {
          if (cancelled) return;
          console.error('Supabase account refresh failed', error);
          setLastError(getErrorMessage(error, 'Failed to refresh account data.'));
        });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isWeb, onboardingStorageKey]);

  async function beginCaptureDraft(draft: {
    meterType: MeterType;
    imageUri: string;
    imageBase64: string;
    capturedAt: string;
    mimeType?: string | null;
  }) {
    const meter = getMeterOption(draft.meterType);

    setIsAnalyzingCapture(true);
    setLastError(null);

    try {
      const analysis = await extractMeterReading({
        meterType: draft.meterType,
        imageBase64: draft.imageBase64,
        mimeType: draft.mimeType,
      });

      startTransition(() => {
        captureUploadPayloadRef.current = {
          imageBase64: draft.imageBase64,
          mimeType: draft.mimeType,
        };
        setCaptureDraft({
          meterType: draft.meterType,
          imageUri: draft.imageUri,
          capturedAt: draft.capturedAt,
          aiReadingValue: analysis.readingValue,
          aiConfidence: analysis.confidence,
          units: analysis.units ?? meter.defaultUnits,
          serialNumber: analysis.serialNumber ?? undefined,
          isReadable: analysis.isReadable,
          analysisNotes: analysis.notes,
          debugOutput: analysis.debugOutput,
        });
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'AI reading failed. You can still enter the reading manually.';
      console.error('beginCaptureDraft failed', error);

      startTransition(() => {
        captureUploadPayloadRef.current = {
          imageBase64: draft.imageBase64,
          mimeType: draft.mimeType,
        };
        setLastError(message);
        setCaptureDraft({
          meterType: draft.meterType,
          imageUri: draft.imageUri,
          capturedAt: draft.capturedAt,
          aiReadingValue: '',
          aiConfidence: 0,
          units: meter.defaultUnits,
          isReadable: false,
          analysisNotes: 'AI could not read this image. Enter the reading manually or retake the photo.',
          debugOutput: message,
        });
      });
    } finally {
      setIsAnalyzingCapture(false);
    }
  }

  function clearError() {
    setLastError(null);
  }

  function completeOnboarding() {
    void writePersistentFlag(onboardingStorageKey, 'true', isWeb);
    setHasCompletedOnboarding(true);
  }

  async function createAccountWithPassword(email: string, password: string) {
    setIsAuthenticating(true);
    setLastError(null);
    setAuthNotice(null);

    try {
      const response = await createAccount(email, password);

      if (response.session?.user) {
        const remote = await fetchMeterRecords(response.session.user.id);
        startTransition(() => {
          setAuthUserId(response.session?.user?.id ?? null);
          setAuthEmail(response.session?.user?.email ?? null);
          setReadings(dedupeReadings(remote.readings));
          setResults(dedupeResults(remote.results));
          setReminders(dedupeReminders(remote.reminders));
          setAuthNotice('Account created. You are now signed in.');
        });
        return;
      }

      setAuthNotice('Account created. Check your email to confirm it, then sign in with your password.');
    } catch (error) {
      setLastError(getErrorMessage(error, 'Failed to create account.'));
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function loginWithPassword(email: string, password: string) {
    setIsAuthenticating(true);
    setLastError(null);
    setAuthNotice(null);

    try {
      await signInWithPassword(email, password);
      const session = await ensureAnonymousSession();
      const remote = await fetchMeterRecords(session?.user?.id);

      startTransition(() => {
        setAuthUserId(session?.user?.id ?? null);
        setAuthEmail(session?.user?.email ?? null);
        setReadings(dedupeReadings(remote.readings));
        setResults(dedupeResults(remote.results));
        setReminders(dedupeReminders(remote.reminders));
        setAuthNotice(null);
      });
    } catch (error) {
      setLastError(getErrorMessage(error, 'Failed to sign in.'));
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function sendPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      const error = new Error('Enter your email address before requesting a password reset.');
      setLastError(error.message);
      throw error;
    }

    setIsAuthenticating(true);
    setLastError(null);
    setAuthNotice(null);

    try {
      await requestPasswordReset(normalizedEmail);
      setAuthNotice('Password reset email sent. Check your inbox for the reset link.');
    } catch (error) {
      setLastError(getErrorMessage(error, 'Failed to send password reset email.'));
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function logout() {
    setLastError(null);
    await signOut();
    if (revenueCatConfiguredRef.current) {
      try {
        const customerInfo = await Purchases.logOut();
        setHasProAccess(hasRevenueCatProAccess(customerInfo));
      } catch (error) {
        console.error('RevenueCat logout failed', error);
      }
    }
    startTransition(() => {
      captureUploadPayloadRef.current = null;
      setAuthUserId(null);
      setAuthEmail(null);
      setReadings([]);
      setResults([]);
      setReminders([]);
      setCaptureDraft(null);
      setAuthNotice(null);
    });
  }

  async function deleteAccount() {
    setLastError(null);
    setAuthNotice(null);

    await requestAccountDeletion();
    await signOut();

    startTransition(() => {
      captureUploadPayloadRef.current = null;
      setAuthUserId(null);
      setAuthEmail(null);
      setReadings([]);
      setResults([]);
      setReminders([]);
      setCaptureDraft(null);
      setAuthNotice('Your account has been deleted.');
    });
  }

  async function confirmDraftReading(confirmedValue?: string) {
    if (!captureDraft) return;
    if (!authUserId) {
      const error = new Error('Sign in before saving a reading.');
      setLastError(error.message);
      throw error;
    }

    const finalConfirmedValue = confirmedValue?.trim() || captureDraft.aiReadingValue?.trim() || '';

    if (!finalConfirmedValue) {
      const error = new Error('Enter the meter reading before saving.');
      setLastError(error.message);
      throw error;
    }

    setIsSaving(true);
    setLastError(null);

    try {
      const meter = getMeterOption(captureDraft.meterType);
      const imagePath = await uploadMeterImage({
        meterType: captureDraft.meterType,
        imageUri: captureDraft.imageUri,
        imageBase64: captureUploadPayloadRef.current?.imageBase64,
        mimeType: captureUploadPayloadRef.current?.mimeType,
      });

      const saved = await saveConfirmedReading({
        meterType: captureDraft.meterType,
        imagePath,
        capturedAt: captureDraft.capturedAt,
        aiReadingValue: captureDraft.aiReadingValue?.trim() || finalConfirmedValue,
        aiConfidence: captureDraft.aiConfidence ?? 0,
        confirmedValue: finalConfirmedValue,
        units: captureDraft.units ?? meter.defaultUnits,
      });

      startTransition(() => {
        captureUploadPayloadRef.current = null;
        setReadings((current) => dedupeReadings([saved.reading, ...current]));
        setResults((current) =>
          dedupeResults([saved.result, ...current.filter((item) => item.meterType !== saved.result.meterType)])
        );
        setReminders((current) =>
          dedupeReminders([saved.reminder, ...current.filter((item) => item.meterType !== saved.reminder.meterType)])
        );
        setCaptureDraft(null);
      });
    } catch (error) {
      setLastError(getErrorMessage(error, 'Failed to save the reading.'));
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function showProPaywall() {
    await ensureRevenueCatConfigured();

    const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: REVENUECAT_PAYWALL_ENTITLEMENT,
      displayCloseButton: true,
    });
    console.log('RevenueCat paywall result', paywallResult);

    if (paywallResult === PAYWALL_RESULT.ERROR) {
      throw new Error('The purchase screen closed because the App Store purchase failed. Check your Apple ID, sandbox account, and in-app purchase status.');
    }

    const customerInfo = await Purchases.getCustomerInfo();
    const entitlementActive = hasRevenueCatProAccess(customerInfo);
    setHasProAccess(entitlementActive);

    return entitlementActive || paywallResult === 'PURCHASED' || paywallResult === 'RESTORED';
  }

  async function restorePurchases() {
    await ensureRevenueCatConfigured();

    const customerInfo = await Purchases.restorePurchases();
    setHasProAccess(hasRevenueCatProAccess(customerInfo));
  }

  async function openCustomerCenter() {
    await ensureRevenueCatConfigured();

    await RevenueCatUI.presentCustomerCenter();
  }

  const value = useMemo(
    () => ({
      selectedMeterType,
      readings,
      results,
      reminders,
      captureDraft,
      isBootstrapping,
      isSaving,
      isAnalyzingCapture,
      isAuthenticating,
      hasCompletedOnboarding,
      authUserId,
      authEmail,
      isAuthenticated: Boolean(authUserId),
      purchasesReady,
      hasProAccess,
      lastError,
      authNotice,
      setSelectedMeterType,
      beginCaptureDraft,
      clearError,
      completeOnboarding,
      createAccountWithPassword,
      loginWithPassword,
      sendPasswordReset,
      logout,
      deleteAccount,
      confirmDraftReading,
      showProPaywall,
      restorePurchases,
      openCustomerCenter,
    }),
    [
      authEmail,
      authNotice,
      authUserId,
      captureDraft,
      hasProAccess,
      hasCompletedOnboarding,
      isAuthenticating,
      isBootstrapping,
      isSaving,
      isAnalyzingCapture,
      lastError,
      purchasesReady,
      readings,
      reminders,
      results,
      selectedMeterType,
      sendPasswordReset,
    ]
  );

  return <AppFlowContext.Provider value={value}>{children}</AppFlowContext.Provider>;
}

export function useAppFlow() {
  const value = useContext(AppFlowContext);

  if (!value) {
    throw new Error('useAppFlow must be used within AppFlowProvider');
  }

  return value;
}

async function readPersistentFlag(key: string, isWeb: boolean) {
  if (isWeb) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(key);
  }

  return AsyncStorage.getItem(key);
}

async function writePersistentFlag(key: string, value: string, isWeb: boolean) {
  if (isWeb) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

function hasRevenueCatProAccess(customerInfo: CustomerInfo) {
  return REVENUECAT_PRO_ENTITLEMENTS.some((entitlementKey) => hasRevenueCatEntitlement(customerInfo, entitlementKey));
}

function hasRevenueCatEntitlement(customerInfo: CustomerInfo, entitlementKey: string) {
  return typeof customerInfo.entitlements.active[entitlementKey] !== 'undefined';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function dedupeReadings(items: ReadingRecord[]) {
  const uniqueById = new Map<string, ReadingRecord>();

  for (const item of items) {
    if (!uniqueById.has(item.id)) {
      uniqueById.set(item.id, item);
    }
  }

  return Array.from(uniqueById.values()).sort(
    (left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime()
  );
}

function dedupeResults(items: ResultRecord[]) {
  const uniqueById = new Map<string, ResultRecord>();

  for (const item of items) {
    if (!uniqueById.has(item.id)) {
      uniqueById.set(item.id, item);
    }
  }

  return Array.from(uniqueById.values()).sort(
    (left, right) => new Date(right.calculatedAt).getTime() - new Date(left.calculatedAt).getTime()
  );
}

function dedupeReminders(items: ReminderRecord[]) {
  const uniqueByMeter = new Map<MeterType, ReminderRecord>();

  for (const item of items) {
    if (!uniqueByMeter.has(item.meterType)) {
      uniqueByMeter.set(item.meterType, item);
    }
  }

  return Array.from(uniqueByMeter.values()).sort(
    (left, right) => new Date(left.nextDueAt).getTime() - new Date(right.nextDueAt).getTime()
  );
}
