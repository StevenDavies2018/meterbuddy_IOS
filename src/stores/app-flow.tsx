import { createContext, ReactNode, startTransition, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { getMeterOption } from '@/models/meter-data';
import { CaptureDraft, MeterType, ReadingRecord, ReminderRecord, ResultRecord } from '@/models/schema';
import {
  createAccount,
  ensureAnonymousSession,
  extractMeterReading,
  fetchMeterRecords,
  requestAccountDeletion,
  saveConfirmedReading,
  signInWithPassword,
  signOut,
  uploadMeterImage,
} from '@/lib/meter-service';

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
  hasCompletedFirstScanPrompt: boolean;
  authUserId: string | null;
  authEmail: string | null;
  isAuthenticated: boolean;
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
  markFirstScanPromptComplete: () => void;
  createAccountWithPassword: (email: string, password: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  confirmDraftReading: (confirmedValue?: string) => Promise<void>;
};

const AppFlowContext = createContext<AppFlowContextValue | null>(null);

export function AppFlowProvider({ children }: { children: ReactNode }) {
  const onboardingStorageKey = 'meterbuddy.onboardingCompleted';
  const firstScanPromptStorageKey = 'meterbuddy.firstScanPromptCompleted';
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
  const [hasCompletedFirstScanPrompt, setHasCompletedFirstScanPrompt] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const captureUploadPayloadRef = useRef<{ imageBase64?: string; mimeType?: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function syncSessionState() {
      try {
        const [onboardingFlag, firstScanPromptFlag] = await Promise.all([
          readPersistentFlag(onboardingStorageKey, isWeb),
          readPersistentFlag(firstScanPromptStorageKey, isWeb),
        ]);

        if (cancelled) return;

        startTransition(() => {
          setHasCompletedOnboarding(onboardingFlag === 'true');
          setHasCompletedFirstScanPrompt(firstScanPromptFlag === 'true');
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

        const remote = await fetchMeterRecords();

        if (cancelled) return;

        startTransition(() => {
          setAuthUserId(session.user.id);
          setAuthEmail(session.user.email ?? null);
          setReadings(remote.readings);
          setResults(remote.results);
          setReminders(remote.reminders);
          setLastError(null);
        });
      } catch (error) {
        if (cancelled) return;
        setLastError(error instanceof Error ? error.message : 'Failed to connect to Supabase.');
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

      fetchMeterRecords()
        .then((remote) => {
          if (cancelled) return;
          startTransition(() => {
            setReadings(remote.readings);
            setResults(remote.results);
            setReminders(remote.reminders);
          });
        })
        .catch((error) => {
          if (cancelled) return;
          setLastError(error instanceof Error ? error.message : 'Failed to refresh account data.');
        });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [firstScanPromptStorageKey, isWeb, onboardingStorageKey]);

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

  function markFirstScanPromptComplete() {
    void writePersistentFlag(firstScanPromptStorageKey, 'true', isWeb);
    setHasCompletedFirstScanPrompt(true);
  }

  async function createAccountWithPassword(email: string, password: string) {
    setIsAuthenticating(true);
    setLastError(null);
    setAuthNotice(null);

    try {
      const response = await createAccount(email, password);

      if (response.session?.user) {
        const remote = await fetchMeterRecords();
        startTransition(() => {
          setAuthUserId(response.session?.user?.id ?? null);
          setAuthEmail(response.session?.user?.email ?? null);
          setReadings(remote.readings);
          setResults(remote.results);
          setReminders(remote.reminders);
          setAuthNotice('Account created. You are now signed in.');
        });
        return;
      }

      setAuthNotice('Account created. Check your email to confirm it, then sign in with your password.');
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Failed to create account.');
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
      const remote = await fetchMeterRecords();
      const session = await ensureAnonymousSession();

      startTransition(() => {
        setAuthUserId(session?.user?.id ?? null);
        setAuthEmail(session?.user?.email ?? null);
        setReadings(remote.readings);
        setResults(remote.results);
        setReminders(remote.reminders);
        setAuthNotice(null);
      });
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Failed to sign in.');
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function logout() {
    setLastError(null);
    await signOut();
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
        setReadings((current) => [saved.reading, ...current]);
        setResults((current) => [saved.result, ...current.filter((item) => item.meterType !== saved.result.meterType)]);
        setReminders((current) => [saved.reminder, ...current.filter((item) => item.meterType !== saved.reminder.meterType)]);
        setCaptureDraft(null);
      });
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Failed to save the reading.');
      throw error;
    } finally {
      setIsSaving(false);
    }
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
      hasCompletedFirstScanPrompt,
      authUserId,
      authEmail,
      isAuthenticated: Boolean(authUserId),
      lastError,
      authNotice,
      setSelectedMeterType,
      beginCaptureDraft,
      clearError,
      completeOnboarding,
      markFirstScanPromptComplete,
      createAccountWithPassword,
      loginWithPassword,
      logout,
      deleteAccount,
      confirmDraftReading,
    }),
    [
      authEmail,
      authNotice,
      authUserId,
      captureDraft,
      hasCompletedOnboarding,
      hasCompletedFirstScanPrompt,
      isAuthenticating,
      isBootstrapping,
      isSaving,
      isAnalyzingCapture,
      lastError,
      readings,
      reminders,
      results,
      selectedMeterType,
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
