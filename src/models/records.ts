import { METER_OPTIONS } from '@/models/meter-data';
import { MeterType, ReadingRecord, ReminderRecord, ResultRecord } from '@/models/schema';

export function getLatestReadingByType(readings: ReadingRecord[], meterType: MeterType) {
  return [...readings]
    .filter((reading) => reading.meterType === meterType)
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0];
}

export function getLatestResultByType(results: ResultRecord[], meterType: MeterType) {
  return [...results]
    .filter((result) => result.meterType === meterType)
    .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())[0];
}

export function calculateUsage(currentValue: string, previousValue?: string) {
  if (!previousValue) return undefined;

  const current = Number(currentValue);
  const previous = Number(previousValue);

  if (Number.isNaN(current) || Number.isNaN(previous) || current < previous) {
    return undefined;
  }

  return current - previous;
}

export function buildReminderDate(capturedAt: string) {
  const base = new Date(capturedAt);
  base.setDate(base.getDate() + 28);
  return base.toISOString();
}

export function formatUsageValue(usage: number | undefined, units: string) {
  return usage === undefined ? 'Pending comparison' : `${usage} ${units}`;
}

export function formatReminderDate(value: string | undefined) {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildSeedReminders(readings: ReadingRecord[]): ReminderRecord[] {
  return METER_OPTIONS.map((meter) => {
    const latestReading = getLatestReadingByType(readings, meter.type);
    return {
      id: `reminder-${meter.type}`,
      meterType: meter.type,
      nextDueAt: latestReading
        ? buildReminderDate(latestReading.capturedAt)
        : buildReminderDate(new Date().toISOString()),
      active: true,
    };
  });
}
