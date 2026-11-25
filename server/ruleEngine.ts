import {
  EffectiveRange,
  ExtractedRow,
  RangeSource,
  RuleEvaluatedRow,
  TriageTier,
} from '../src/shared/clinicalTypes.ts';
import { matchClinicalSpec } from './referenceRanges.ts';

const URGENT_TEXT_PATTERNS = [
  /\bcritical(?:ly)?\b/i,
  /\bpanic\s*value\b/i,
  /\bimmediate\s*attention\b/i,
  /\bstat\b/i,
  /\bemergency\b/i,
  /\balert\s*value\b/i,
  /\burgent\s*review\b/i,
  /\b(?:hh|ll|!!|\*\*)\b/i,
];

const ABNORMAL_FLAG_PATTERNS = [
  /^(?:h|high|hi|l|low|lo|a|abn|abnormal|\*)$/i,
  /\babove\s*range\b/i,
  /\bbelow\s*range\b/i,
  /\belevated\b/i,
  /\bflagged\b/i,
];

export function parseNumericValue(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, '').trim();
  // Handle values like "< 0.01", "> 100", "6.2 mmol/L"
  const match = cleaned.match(/^[<>≤≥]?\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

export function parseRangeString(
  rangeStr: string,
  fallbackUnit: string
): { low: number | null; high: number | null; text: string; unit: string } | null {
  if (!rangeStr) return null;
  const cleaned = rangeStr.replace(/,/g, '').trim();
  if (!cleaned || /not\s*provided|n\/a|none/i.test(cleaned)) return null;

  // Match "3.5 - 5.0", "3.5–5.0", "3.5 to 5.0"
  const betweenMatch = cleaned.match(
    /(-?\d+(?:\.\d+)?)\s*(?:-|–|—|\bto\b)\s*(-?\d+(?:\.\d+)?)/i
  );
  if (betweenMatch) {
    const low = Number(betweenMatch[1]);
    const high = Number(betweenMatch[2]);
    if (Number.isFinite(low) && Number.isFinite(high) && high >= low) {
      return { low, high, text: rangeStr.trim(), unit: fallbackUnit };
    }
  }

  // Match "< 200", "<= 100", "≤ 0.04"
  const upperOnlyMatch = cleaned.match(/^(?:<|<=|≤|under|below)\s*(-?\d+(?:\.\d+)?)/i);
  if (upperOnlyMatch) {
    const high = Number(upperOnlyMatch[1]);
    if (Number.isFinite(high)) {
      return { low: 0, high, text: rangeStr.trim(), unit: fallbackUnit };
    }
  }

  // Match "> 60", ">= 40", "≥ 60"
  const lowerOnlyMatch = cleaned.match(/^(?:>|>=|≥|above|over)\s*(-?\d+(?:\.\d+)?)/i);
  if (lowerOnlyMatch) {
    const low = Number(lowerOnlyMatch[1]);
    if (Number.isFinite(low)) {
      return { low, high: null, text: rangeStr.trim(), unit: fallbackUnit };
    }
  }

  return null;
}

function hasUrgentTextFlag(flagInDoc: string | null, sourceText: string): string | null {
  const combined = `${flagInDoc ?? ''} ${sourceText}`.trim();
  for (const pattern of URGENT_TEXT_PATTERNS) {
    const match = combined.match(pattern);
    if (match) {
      return `Urgent flag detected in document text ("${match[0]}")`;
    }
  }
  return null;
}

function hasAbnormalFlag(flagInDoc: string | null): boolean {
  if (!flagInDoc) return false;
  const trimmed = flagInDoc.trim();
  return ABNORMAL_FLAG_PATTERNS.some((p) => p.test(trimmed));
}

function computeSeverityRatio(
  value: number,
  low: number | null,
  high: number | null
): { ratio: number; direction: 'within' | 'high' | 'low' } {
  if (low !== null && high !== null) {
    const span = Math.max(high - low, Math.abs(high) * 0.25, 0.01);
    if (value < low) {
      return { ratio: Number(((low - value) / span).toFixed(2)), direction: 'low' };
    }
    if (value > high) {
      return { ratio: Number(((value - high) / span).toFixed(2)), direction: 'high' };
    }
    return { ratio: 0, direction: 'within' };
  }

  if (high !== null) {
    if (value > high) {
      const span = Math.max(high, 0.1);
      return { ratio: Number(((value - high) / span).toFixed(2)), direction: 'high' };
    }
    return { ratio: 0, direction: 'within' };
  }

  if (low !== null) {
    if (value < low) {
      const span = Math.max(low, 0.1);
      return { ratio: Number(((low - value) / span).toFixed(2)), direction: 'low' };
    }
    return { ratio: 0, direction: 'within' };
  }

  return { ratio: 0, direction: 'within' };
}

function unitsAreCompatible(docUnit: string, specUnit: string): boolean {
  const norm = (u: string) =>
    u
      .toLowerCase()
      .replace(/µ/g, 'u')
      .replace(/\s+/g, '')
      .replace('meq/l', 'mmol/l'); // monovalent electrolytes like K+/Na+/Cl-/HCO3- are 1:1

  const a = norm(docUnit);
  const b = norm(specUnit);
  if (!a) return true; // if unit missing, use caution but allow spec match with lower confidence
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if ((a.includes('10^3') || a.includes('k/ul') || a.includes('thous')) && b.includes('10^3')) {
    return true;
  }
  return false;
}

export function evaluateExtractedRow(row: ExtractedRow): RuleEvaluatedRow {
  const spec = matchClinicalSpec(row.test_name);
  const numericVal = row.numeric_value ?? parseNumericValue(row.value);
  const parsedDocRange = parseRangeString(row.reference_range, row.unit || spec?.unit || '');

  let rangeSource: RangeSource = 'not_provided';
  let effectiveRange: EffectiveRange = {
    low: null,
    high: null,
    text: 'Range not provided',
    unit: row.unit || spec?.unit || '',
  };

  if (parsedDocRange) {
    rangeSource = 'document';
    effectiveRange = parsedDocRange;
  } else if (spec && unitsAreCompatible(row.unit, spec.unit)) {
    rangeSource = 'typical_adult_guide';
    effectiveRange = {
      low: spec.normalLow,
      high: spec.normalHigh,
      text: spec.typicalRangeLabel,
      unit: row.unit || spec.unit,
    };
  }

  const urgentTextReason = hasUrgentTextFlag(row.flag_in_doc, row.source_text);
  let preliminaryTier: TriageTier = 'NORMAL';
  let severityRatio = 0;
  let direction: 'within' | 'high' | 'low' | 'unknown' = 'unknown';
  let criticalReason: string | null = urgentTextReason;

  // Check deterministic critical thresholds when units are compatible
  const canApplyCriticalSpec = spec !== null && unitsAreCompatible(row.unit, spec.unit);
  const criticalLow = canApplyCriticalSpec ? spec.criticalLow : null;
  const criticalHigh = canApplyCriticalSpec ? spec.criticalHigh : null;

  if (numericVal !== null && (effectiveRange.low !== null || effectiveRange.high !== null)) {
    const computed = computeSeverityRatio(numericVal, effectiveRange.low, effectiveRange.high);
    severityRatio = computed.ratio;
    direction = computed.direction;

    if (computed.direction !== 'within') {
      preliminaryTier = 'ABNORMAL';
    }
  } else if (hasAbnormalFlag(row.flag_in_doc)) {
    preliminaryTier = 'ABNORMAL';
    severityRatio = 0.5;
    direction = /low|lo|\bl\b/i.test(row.flag_in_doc ?? '') ? 'low' : 'high';
  }

  // Critical band checks
  if (numericVal !== null && canApplyCriticalSpec) {
    if (criticalLow !== null && numericVal <= criticalLow) {
      preliminaryTier = 'POTENTIALLY_URGENT';
      severityRatio = Math.max(severityRatio, 1.8);
      direction = 'low';
      criticalReason = `${spec.canonicalName} (${numericVal} ${row.unit || spec.unit}) is at or below the critical threshold (${criticalLow} ${spec.unit}).`;
    } else if (criticalHigh !== null && numericVal >= criticalHigh) {
      preliminaryTier = 'POTENTIALLY_URGENT';
      severityRatio = Math.max(severityRatio, 1.8);
      direction = 'high';
      criticalReason = `${spec.canonicalName} (${numericVal} ${row.unit || spec.unit}) is at or above the critical threshold (${criticalHigh} ${spec.unit}).`;
    }
  }

  // Extreme severity ratio fallback (e.g., >= 2.0x outside document range when no critical table entry exists)
  if (severityRatio >= 2.0 && preliminaryTier !== 'POTENTIALLY_URGENT') {
    preliminaryTier = 'POTENTIALLY_URGENT';
    criticalReason = `Measured value is substantially outside the reference range (severity ratio ${severityRatio.toFixed(2)}).`;
  }

  // Urgent document text flag always escalates to POTENTIALLY_URGENT
  if (urgentTextReason) {
    preliminaryTier = 'POTENTIALLY_URGENT';
    severityRatio = Math.max(severityRatio, 1.5);
  }

  // Confidence scoring
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (numericVal === null || rangeSource === 'not_provided') {
    confidence = 'low';
  } else if (rangeSource === 'typical_adult_guide' || !row.unit) {
    confidence = 'medium';
  }

  return {
    ...row,
    numeric_value: numericVal,
    canonical_name: spec?.canonicalName ?? null,
    preliminary_tier: preliminaryTier,
    severity_ratio: severityRatio,
    range_source: rangeSource,
    effective_range: effectiveRange,
    critical_low: criticalLow,
    critical_high: criticalHigh,
    critical_reason: criticalReason,
    direction,
    confidence,
    default_what_it_measures:
      spec?.plainWhatItMeasures ??
      'A clinical measurement listed in your uploaded report.',
  };
}

export function evaluateAllRows(rows: ExtractedRow[]): RuleEvaluatedRow[] {
  return rows.map(evaluateExtractedRow);
}

export function scanRawTextForUrgentSignals(rawText: string): string[] {
  const reasons: string[] = [];
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const pattern of URGENT_TEXT_PATTERNS) {
      if (pattern.test(trimmed)) {
        // Skip false positives like "Status: Normal"
        if (/not\s+critical|non-urgent|normal\s+stat/i.test(trimmed)) continue;
        reasons.push(`Document text contains an urgent indicator: "${trimmed.slice(0, 140)}"`);
        break;
      }
    }
  }
  return Array.from(new Set(reasons)).slice(0, 4);
}
