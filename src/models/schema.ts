export type MeterType = 'gas' | 'hydro' | 'water';

export type ReadingRecord = {
  id: string;
  meterType: MeterType;
  imageUri: string;
  capturedAt: string;
  aiReadingValue: string;
  aiConfidence: number;
  confirmedValue: string;
  units: string;
};

export type ResultRecord = {
  id: string;
  meterType: MeterType;
  currentReadingId: string;
  previousReadingId?: string;
  usageValue?: number;
  calculatedAt: string;
};

export type ReminderRecord = {
  id: string;
  meterType: MeterType;
  nextDueAt: string;
  active: boolean;
};

export type CaptureDraft = {
  meterType: MeterType;
  imageUri: string;
  capturedAt: string;
  aiReadingValue?: string;
  aiConfidence?: number;
  units?: string;
  serialNumber?: string;
  isReadable?: boolean;
  analysisNotes?: string;
  debugOutput?: string;
};
