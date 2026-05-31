// @ts-nocheck

type MeterType = 'gas' | 'hydro' | 'water';

type ParsedMeterReading = {
  reading_display: string | null;
  reading_value: string | null;
  reading_whole: string | null;
  reading_fractional: string | null;
  fractional_marker: string | null;
  units: string | null;
  serial_number: string | null;
  confidence: number;
  is_readable: boolean;
  notes: string;
};

const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
const openAiModel = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!openAiApiKey) {
    return jsonResponse({ error: 'Server missing OPENAI_API_KEY.' }, 500);
  }

  try {
    const body = await request.json();
    const meterType = normalizeMeterType(body?.meterType);
    const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : '';
    const mimeType = typeof body?.mimeType === 'string' && body.mimeType.trim() ? body.mimeType : 'image/jpeg';

    if (!meterType || !imageBase64) {
      return jsonResponse({ error: 'meterType and imageBase64 are required.' }, 400);
    }

    const meterLabel = meterTypeLabel(meterType);
    const meterSpecificInstructions = meterReadingInstructions(meterType);
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: openAiModel,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: [
                  `You are reading a ${meterLabel} utility meter photo.`,
                  'Return only the cumulative meter reading visible in the image.',
                  'For mechanical odometer-style meters, read digits from left to right exactly as shown in the register window.',
                  'Black or white digits on a dark background usually represent the whole-number portion of the cumulative reading.',
                  'Red digits to the right usually represent the fractional or decimal portion of the cumulative reading.',
                  'If both whole and red fractional digits are present, combine them into one cumulative reading using the visual divider between them.',
                  meterSpecificInstructions,
                  'Do not ignore non-zero digits just because leading digits are zero.',
                  'Do not return only the red digits by themselves when whole-number digits are also visible.',
                  'Do not include unrelated serial numbers, barcodes, model numbers, or manufacturer text in the reading.',
                  'Do not estimate or invent digits.',
                  'If the display is unreadable, partially cropped, or too blurry, set is_readable to false and reading_value to null.',
                  'Use a confidence score from 0 to 1.',
                  'When units or a serial number are visible, include them.',
                ].join(' '),
              },
              {
                type: 'input_image',
                image_url: dataUrl,
                detail: 'high',
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'meter_reading_analysis',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                reading_display: {
                  type: ['string', 'null'],
                  description: 'The full cumulative meter reading as a human-confirmable string, including decimal punctuation only if shown.',
                },
                reading_value: {
                  type: ['string', 'null'],
                  description: 'The cumulative utility meter reading exactly as visible, using only digits and decimal punctuation if shown.',
                },
                reading_whole: {
                  type: ['string', 'null'],
                  description: 'The whole-number portion of the cumulative reading if distinguishable.',
                },
                reading_fractional: {
                  type: ['string', 'null'],
                  description: 'The fractional or red-digit portion of the cumulative reading if distinguishable.',
                },
                fractional_marker: {
                  type: ['string', 'null'],
                  description: 'Description of the visible decimal/divider cue, such as red dot, color break, or printed decimal marker.',
                },
                units: {
                  type: ['string', 'null'],
                  description: 'The units shown on the meter, such as m3, kWh, or gal.',
                },
                serial_number: {
                  type: ['string', 'null'],
                  description: 'The meter serial number if clearly visible.',
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence score from 0 to 1.',
                },
                is_readable: {
                  type: 'boolean',
                  description: 'Whether the meter reading is clear enough to trust.',
                },
                notes: {
                  type: 'string',
                  description: 'Short explanation for the user, especially if manual confirmation is needed.',
                },
              },
              required: [
                'reading_display',
                'reading_value',
                'reading_whole',
                'reading_fractional',
                'fractional_marker',
                'units',
                'serial_number',
                'confidence',
                'is_readable',
                'notes',
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse({ error: `OpenAI meter extraction failed (${response.status}): ${errorText}` }, 500);
    }

    const payload = await response.json();
    const rawText = extractStructuredOutputText(payload);

    if (!rawText) {
      return jsonResponse({ error: 'OpenAI meter extraction returned no structured output.' }, 500);
    }

    const parsed = JSON.parse(rawText) as ParsedMeterReading;
    const normalizedReadingValue = resolveBestReadingValue(parsed);

    return jsonResponse({
      readingValue: normalizedReadingValue,
      units: parsed.units,
      serialNumber: parsed.serial_number,
      confidence: clampConfidence(parsed.confidence),
      isReadable: Boolean(parsed.is_readable),
      notes: parsed.notes?.trim() || 'Review the digits before saving.',
      debugOutput: buildAnalysisDebugOutput(payload, rawText, parsed),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected extraction failure.';
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeMeterType(value: unknown): MeterType | null {
  if (value === 'gas' || value === 'hydro' || value === 'water') {
    return value;
  }

  return null;
}

function meterTypeLabel(meterType: MeterType) {
  if (meterType === 'gas') return 'gas';
  if (meterType === 'hydro') return 'electricity / hydro';
  return 'water';
}

function meterReadingInstructions(meterType: MeterType) {
  if (meterType === 'gas') {
    return [
      'Gas meters often use black digits for whole cubic metres and red digits for the fractional portion of a cubic metre.',
      'If a red dot, color change, or obvious divider separates black digits from red digits, treat that boundary as the decimal point.',
      'Digits to the right of that divider are fractional digits, not additional whole-number digits.',
      'For example, black 00000 followed by red 453 should be interpreted as 0.453 m3.',
      'If all whole-number digits are zero, keep the leading zero and return a fractional reading such as 0.453.',
    ].join(' ');
  }

  return [
    'Use any visible decimal marker, color change, or divider as the boundary between whole and fractional digits.',
    'Only treat right-side digits as fractional when the meter face clearly separates them from the main whole-number register.',
  ].join(' ');
}

function normalizeReadingValue(value: string | null) {
  if (!value) return '';
  return value.replace(/\s+/g, '').trim();
}

function normalizeDigitGroup(value: string | null) {
  if (!value) return '';
  return value.replace(/[^\d]/g, '');
}

function stripLeadingZerosPreservingZero(value: string) {
  const stripped = value.replace(/^0+(?=\d)/, '');
  return stripped || '0';
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

function clampConfidence(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function extractStructuredOutputText(payload: any) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputs = Array.isArray(payload?.output) ? payload.output : [];

  for (const output of outputs) {
    const contents = Array.isArray(output?.content) ? output.content : [];

    for (const item of contents) {
      if (typeof item?.text === 'string' && item.text.trim()) {
        return item.text.trim();
      }

      if (typeof item?.output_text === 'string' && item.output_text.trim()) {
        return item.output_text.trim();
      }

      if (typeof item?.json === 'string' && item.json.trim()) {
        return item.json.trim();
      }
    }
  }

  return '';
}

function buildAnalysisDebugOutput(payload: unknown, rawText: string, parsed: ParsedMeterReading) {
  const compactPayload =
    payload && typeof payload === 'object'
      ? {
          id: (payload as Record<string, unknown>).id ?? null,
          status: (payload as Record<string, unknown>).status ?? null,
          model: (payload as Record<string, unknown>).model ?? null,
          output_count: Array.isArray((payload as Record<string, unknown>).output)
            ? ((payload as Record<string, unknown>).output as unknown[]).length
            : 0,
        }
      : payload;

  return JSON.stringify(
    {
      raw_structured_output: rawText,
      parsed_result: parsed,
      response_summary: compactPayload,
    },
    null,
    2
  );
}
