import { buildReminderDate, calculateUsage } from '@/models/records';
import { MeterType, ReadingRecord, ReminderRecord, ResultRecord } from '@/models/schema';
import { supabase } from '@/lib/supabase';

type SavedMeterRecords = {
  reading: ReadingRecord;
  result: ResultRecord;
  reminder: ReminderRecord;
};

type MeterAnalysis = {
  readingValue: string;
  units: string | null;
  serialNumber: string | null;
  confidence: number;
  isReadable: boolean;
  notes: string;
  debugOutput: string;
};

export async function ensureAnonymousSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export async function createAccount(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function requestAccountDeletion() {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });

  if (error) {
    throw new Error(error.message || 'Account deletion failed.');
  }

  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Account deletion failed.');
  }
}

export async function fetchMeterRecords() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return { readings: [], results: [], reminders: [] };
  }

  const [readingsResult, resultsResult, remindersResult] = await Promise.all([
    supabase
      .from('readings')
      .select('id,meter_type,image_path,captured_at,ai_reading_value,ai_confidence,confirmed_value,units')
      .order('captured_at', { ascending: false }),
    supabase
      .from('results')
      .select('id,meter_type,current_reading_id,previous_reading_id,usage_value,calculated_at')
      .order('calculated_at', { ascending: false }),
    supabase
      .from('reminders')
      .select('id,meter_type,next_due_at,active')
      .order('next_due_at', { ascending: true }),
  ]);

  if (readingsResult.error) throw readingsResult.error;
  if (resultsResult.error) throw resultsResult.error;
  if (remindersResult.error) throw remindersResult.error;

  const readings = await hydrateReadingImageUrls((readingsResult.data ?? []).map(mapReadingRow));

  return {
    readings,
    results: (resultsResult.data ?? []).map(mapResultRow),
    reminders: (remindersResult.data ?? []).map(mapReminderRow),
  };
}

export async function uploadMeterImage(params: {
  meterType: MeterType;
  imageUri: string;
  fileName?: string;
  imageBase64?: string;
  mimeType?: string | null;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('No authenticated user available for upload.');
  }

  let fileBody: ArrayBuffer | Blob;
  let contentType: string;

  if (params.imageBase64) {
    fileBody = decodeBase64ToArrayBuffer(params.imageBase64);
    contentType = params.mimeType || mimeTypeFromExtension(getFileExtension(params.fileName ?? params.imageUri));
  } else {
    const response = await fetch(params.imageUri);
    if (!response.ok) {
      throw new Error(`Failed to read captured image for upload (${response.status}).`);
    }

    const blob = await response.blob();
    fileBody = blob;
    contentType = params.mimeType || response.headers.get('Content-Type') || mimeTypeFromExtension(getFileExtension(params.fileName ?? params.imageUri));
  }
  const extension = getFileExtension(params.fileName ?? params.imageUri);
  const objectPath = `${user.id}/${params.meterType}/${Date.now()}-${Math.round(Math.random() * 1_000_000)}.${extension}`;

  const { error } = await supabase.storage.from('meter-images').upload(objectPath, fileBody, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return objectPath;
}

export async function extractMeterReading(params: {
  meterType: MeterType;
  imageBase64: string;
  mimeType?: string | null;
}): Promise<MeterAnalysis> {
  const { data, error } = await supabase.functions.invoke('extract-meter-reading', {
    body: {
      meterType: params.meterType,
      imageBase64: params.imageBase64,
      mimeType: params.mimeType ?? null,
    },
  });

  if (error) {
    throw new Error(error.message || 'Meter extraction request failed.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Meter extraction returned an invalid response.');
  }

  return {
    readingValue: typeof data.readingValue === 'string' ? data.readingValue : '',
    units: typeof data.units === 'string' ? data.units : null,
    serialNumber: typeof data.serialNumber === 'string' ? data.serialNumber : null,
    confidence: clampConfidence(Number(data.confidence ?? 0)),
    isReadable: Boolean(data.isReadable),
    notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : 'Review the digits before saving.',
    debugOutput: typeof data.debugOutput === 'string' ? data.debugOutput : '',
  };
}

export async function saveConfirmedReading(params: {
  meterType: MeterType;
  imagePath: string;
  capturedAt: string;
  aiReadingValue: string;
  aiConfidence: number;
  confirmedValue: string;
  units: string;
}): Promise<SavedMeterRecords> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('No authenticated user available for save.');
  }

  const { data: previousRows, error: previousError } = await supabase
    .from('readings')
    .select('id,confirmed_value')
    .eq('meter_type', params.meterType)
    .order('captured_at', { ascending: false })
    .limit(1);

  if (previousError) {
    throw previousError;
  }

  const previousReading = previousRows?.[0];
  const previousConfirmedValue = normalizeSavedReadingValue(previousReading?.confirmed_value);
  const nextConfirmedValue = normalizeSavedReadingValue(params.confirmedValue);

  if (previousConfirmedValue !== null && nextConfirmedValue !== null && nextConfirmedValue <= previousConfirmedValue) {
    throw new Error('This reading must be greater than the last saved reading for this meter.');
  }

  const { data: readingRow, error: readingError } = await supabase
    .from('readings')
    .insert({
      user_id: user.id,
      meter_type: params.meterType,
      image_path: params.imagePath,
      captured_at: params.capturedAt,
      ai_reading_value: params.aiReadingValue,
      ai_confidence: params.aiConfidence,
      confirmed_value: params.confirmedValue,
      units: params.units,
    })
    .select('id,meter_type,image_path,captured_at,ai_reading_value,ai_confidence,confirmed_value,units')
    .single();

  if (readingError) {
    throw readingError;
  }

  const usageValue = calculateUsage(params.confirmedValue, previousReading?.confirmed_value);

  const { data: resultRow, error: resultError } = await supabase
    .from('results')
    .insert({
      user_id: user.id,
      meter_type: params.meterType,
      current_reading_id: readingRow.id,
      previous_reading_id: previousReading?.id ?? null,
      usage_value: usageValue ?? null,
      calculated_at: params.capturedAt,
    })
    .select('id,meter_type,current_reading_id,previous_reading_id,usage_value,calculated_at')
    .single();

  if (resultError) {
    throw resultError;
  }

  const { data: reminderRow, error: reminderError } = await supabase
    .from('reminders')
    .upsert(
      {
        user_id: user.id,
        meter_type: params.meterType,
        next_due_at: buildReminderDate(params.capturedAt),
        active: true,
      },
      { onConflict: 'user_id,meter_type' }
    )
    .select('id,meter_type,next_due_at,active')
    .single();

  if (reminderError) {
    throw reminderError;
  }

  const [reading] = await hydrateReadingImageUrls([mapReadingRow(readingRow)]);

  return {
    reading,
    result: mapResultRow(resultRow),
    reminder: mapReminderRow(reminderRow),
  };
}

function mapReadingRow(row: {
  id: string;
  meter_type: string;
  image_path: string;
  captured_at: string;
  ai_reading_value: string;
  ai_confidence: number;
  confirmed_value: string;
  units: string;
}): ReadingRecord {
  return {
    id: row.id,
    meterType: row.meter_type as MeterType,
    imageUri: row.image_path,
    capturedAt: row.captured_at,
    aiReadingValue: row.ai_reading_value,
    aiConfidence: Number(row.ai_confidence),
    confirmedValue: row.confirmed_value,
    units: row.units,
  };
}

function mapResultRow(row: {
  id: string;
  meter_type: string;
  current_reading_id: string;
  previous_reading_id: string | null;
  usage_value: number | null;
  calculated_at: string;
}): ResultRecord {
  return {
    id: row.id,
    meterType: row.meter_type as MeterType,
    currentReadingId: row.current_reading_id,
    previousReadingId: row.previous_reading_id ?? undefined,
    usageValue: row.usage_value ?? undefined,
    calculatedAt: row.calculated_at,
  };
}

function mapReminderRow(row: {
  id: string;
  meter_type: string;
  next_due_at: string;
  active: boolean;
}): ReminderRecord {
  return {
    id: row.id,
    meterType: row.meter_type as MeterType,
    nextDueAt: row.next_due_at,
    active: row.active,
  };
}

function getFileExtension(value: string) {
  const clean = value.split('?')[0] ?? value;
  const parts = clean.split('.');
  const extension = parts.length > 1 ? parts.pop() : null;
  return extension?.toLowerCase() || 'jpg';
}

function mimeTypeFromExtension(extension: string) {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function normalizeReadingValue(value: string | null) {
  if (!value) return '';
  return value.replace(/\s+/g, '').trim();
}

function normalizeSavedReadingValue(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function resolveBestReadingValue(parsed: {
  reading_display: string | null;
  reading_value: string | null;
  reading_whole: string | null;
  reading_fractional: string | null;
}) {
  const displayValue = normalizeReadingValue(parsed.reading_display);
  const directValue = normalizeReadingValue(parsed.reading_value);
  const wholeValue = normalizeDigitGroup(parsed.reading_whole);
  const fractionalValue = normalizeDigitGroup(parsed.reading_fractional);

  if (displayValue) {
    return displayValue;
  }

  if (wholeValue && fractionalValue) {
    return `${stripLeadingZerosPreservingZero(wholeValue)}.${fractionalValue}`;
  }

  if (directValue) {
    return directValue;
  }

  if (wholeValue) {
    return stripLeadingZerosPreservingZero(wholeValue);
  }

  return '';
}

function normalizeDigitGroup(value: string | null) {
  if (!value) return '';
  return value.replace(/[^\d]/g, '');
}

function stripLeadingZerosPreservingZero(value: string) {
  const stripped = value.replace(/^0+(?=\d)/, '');
  return stripped || '0';
}

function clampConfidence(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function decodeBase64ToArrayBuffer(value: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const cleanValue = value.replace(/[^A-Za-z0-9+/=]/g, '');
  let bufferLength = cleanValue.length * 0.75;

  if (cleanValue.endsWith('==')) {
    bufferLength -= 2;
  } else if (cleanValue.endsWith('=')) {
    bufferLength -= 1;
  }

  const bytes = new Uint8Array(bufferLength);
  let byteIndex = 0;

  for (let i = 0; i < cleanValue.length; i += 4) {
    const encoded1 = chars.indexOf(cleanValue[i] ?? '=');
    const encoded2 = chars.indexOf(cleanValue[i + 1] ?? '=');
    const encoded3 = chars.indexOf(cleanValue[i + 2] ?? '=');
    const encoded4 = chars.indexOf(cleanValue[i + 3] ?? '=');

    const chunk = (encoded1 << 18) | (encoded2 << 12) | ((encoded3 & 63) << 6) | (encoded4 & 63);

    if (byteIndex < bytes.length) {
      bytes[byteIndex++] = (chunk >> 16) & 255;
    }
    if (byteIndex < bytes.length && encoded3 !== 64) {
      bytes[byteIndex++] = (chunk >> 8) & 255;
    }
    if (byteIndex < bytes.length && encoded4 !== 64) {
      bytes[byteIndex++] = chunk & 255;
    }
  }

  return bytes.buffer;
}

async function hydrateReadingImageUrls(readings: ReadingRecord[]) {
  if (readings.length === 0) {
    return readings;
  }

  const urlCache = new Map<string, string>();

  await Promise.all(
    readings.map(async (reading) => {
      if (isDisplayableImageUri(reading.imageUri) || urlCache.has(reading.imageUri)) {
        return;
      }

      const { data, error } = await supabase.storage.from('meter-images').createSignedUrl(reading.imageUri, 60 * 60 * 24 * 7);

      if (!error && data?.signedUrl) {
        urlCache.set(reading.imageUri, data.signedUrl);
      }
    })
  );

  return readings.map((reading) => ({
    ...reading,
    imageUri: urlCache.get(reading.imageUri) ?? reading.imageUri,
  }));
}

function isDisplayableImageUri(value?: string | null) {
  if (!value) return false;
  return /^(file|content|https?|data):/i.test(value);
}
