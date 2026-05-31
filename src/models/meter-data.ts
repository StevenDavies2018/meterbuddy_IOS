import { MeterType } from '@/models/schema';

export const METER_OPTIONS: Array<{
  type: MeterType;
  label: string;
  shortPrompt: string;
  defaultUnits: string;
  mockNextReading: string;
  mockConfidence: number;
}> = [
  {
    type: 'gas',
    label: 'Gas Meter',
    shortPrompt: 'Capture the full gas meter readout.',
    defaultUnits: 'm3',
    mockNextReading: '43021',
    mockConfidence: 0.93,
  },
  {
    type: 'hydro',
    label: 'Hydro Meter',
    shortPrompt: 'Capture the cumulative electricity reading.',
    defaultUnits: 'kWh',
    mockNextReading: '18344',
    mockConfidence: 0.88,
  },
  {
    type: 'water',
    label: 'Water Meter',
    shortPrompt: 'Capture the water meter digits clearly.',
    defaultUnits: 'm3',
    mockNextReading: '1512',
    mockConfidence: 0.82,
  },
];

export function getMeterOption(type: MeterType) {
  return METER_OPTIONS.find((meter) => meter.type === type) ?? METER_OPTIONS[0];
}
