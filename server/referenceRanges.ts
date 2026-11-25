export interface ClinicalReferenceSpec {
  canonicalName: string;
  aliases: string[];
  unit: string;
  normalLow: number | null;
  normalHigh: number | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  typicalRangeLabel: string;
  plainWhatItMeasures: string;
}

export const CLINICAL_REFERENCE_TABLE: ClinicalReferenceSpec[] = [
  {
    canonicalName: 'Potassium',
    aliases: ['potassium', 'k+', 'serum potassium', 'potassium, serum', 'k'],
    unit: 'mmol/L',
    normalLow: 3.5,
    normalHigh: 5.0,
    criticalLow: 2.8,
    criticalHigh: 6.0,
    typicalRangeLabel: '3.5–5.0 mmol/L (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures the amount of potassium electrolyte in the blood, which helps regulate heart rhythm, nerve signals, and muscle function.',
  },
  {
    canonicalName: 'Sodium',
    aliases: ['sodium', 'na+', 'serum sodium', 'sodium, serum', 'na'],
    unit: 'mmol/L',
    normalLow: 135,
    normalHigh: 145,
    criticalLow: 120,
    criticalHigh: 160,
    typicalRangeLabel: '135–145 mmol/L (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures sodium concentration in the blood, reflecting fluid balance, hydration status, and nerve/muscle signaling.',
  },
  {
    canonicalName: 'Chloride',
    aliases: ['chloride', 'cl-', 'serum chloride', 'cl'],
    unit: 'mmol/L',
    normalLow: 98,
    normalHigh: 107,
    criticalLow: 80,
    criticalHigh: 120,
    typicalRangeLabel: '98–107 mmol/L (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures chloride, an electrolyte that works alongside sodium and bicarbonate to keep body fluids and acid-base balance steady.',
  },
  {
    canonicalName: 'Bicarbonate (CO2)',
    aliases: ['bicarbonate', 'co2', 'hco3', 'total co2', 'carbon dioxide'],
    unit: 'mmol/L',
    normalLow: 22,
    normalHigh: 29,
    criticalLow: 12,
    criticalHigh: 40,
    typicalRangeLabel: '22–29 mmol/L (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures carbon dioxide / bicarbonate in the blood, which doctors review to check acid-base balance.',
  },
  {
    canonicalName: 'Glucose',
    aliases: ['glucose', 'blood glucose', 'fasting glucose', 'plasma glucose', 'random glucose'],
    unit: 'mg/dL',
    normalLow: 70,
    normalHigh: 99,
    criticalLow: 50,
    criticalHigh: 400,
    typicalRangeLabel: '70–99 mg/dL fasting (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures the amount of sugar (glucose) circulating in the blood, the primary energy source for the body.',
  },
  {
    canonicalName: 'HbA1c',
    aliases: ['hba1c', 'hemoglobin a1c', 'a1c', 'glycated hemoglobin'],
    unit: '%',
    normalLow: 4.0,
    normalHigh: 5.6,
    criticalLow: null,
    criticalHigh: 14.0,
    typicalRangeLabel: '4.0–5.6 % (typical adult range — general guide)',
    plainWhatItMeasures:
      'Reflects average blood sugar levels over roughly the past 2 to 3 months.',
  },
  {
    canonicalName: 'Hemoglobin',
    aliases: ['hemoglobin', 'hgb', 'hb', 'haemoglobin'],
    unit: 'g/dL',
    normalLow: 12.0,
    normalHigh: 17.5,
    criticalLow: 7.0,
    criticalHigh: 20.0,
    typicalRangeLabel: '12.0–17.5 g/dL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures the oxygen-carrying protein inside red blood cells.',
  },
  {
    canonicalName: 'Hematocrit',
    aliases: ['hematocrit', 'hct', 'haematocrit'],
    unit: '%',
    normalLow: 36,
    normalHigh: 50,
    criticalLow: 20,
    criticalHigh: 60,
    typicalRangeLabel: '36–50 % (typical adult range — general guide)',
    plainWhatItMeasures:
      'Shows the percentage of blood volume made up of red blood cells.',
  },
  {
    canonicalName: 'White Blood Cell Count (WBC)',
    aliases: ['wbc', 'white blood cell', 'white blood cells', 'leukocytes', 'wbc count'],
    unit: '10^3/uL',
    normalLow: 4.0,
    normalHigh: 11.0,
    criticalLow: 1.5,
    criticalHigh: 30.0,
    typicalRangeLabel: '4.0–11.0 x10^3/uL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Counts white blood cells, which are part of the immune system response to infection or inflammation.',
  },
  {
    canonicalName: 'Platelets',
    aliases: ['platelets', 'platelet count', 'plt'],
    unit: '10^3/uL',
    normalLow: 150,
    normalHigh: 450,
    criticalLow: 50,
    criticalHigh: 1000,
    typicalRangeLabel: '150–450 x10^3/uL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Counts platelets, tiny blood cell fragments that help blood clot normally.',
  },
  {
    canonicalName: 'Creatinine',
    aliases: ['creatinine', 'serum creatinine', 'creat', 'cr'],
    unit: 'mg/dL',
    normalLow: 0.6,
    normalHigh: 1.3,
    criticalLow: null,
    criticalHigh: 4.0,
    typicalRangeLabel: '0.6–1.3 mg/dL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures a muscle waste product filtered by the kidneys, commonly reviewed to assess kidney filtration.',
  },
  {
    canonicalName: 'BUN (Blood Urea Nitrogen)',
    aliases: ['bun', 'blood urea nitrogen', 'urea nitrogen'],
    unit: 'mg/dL',
    normalLow: 7,
    normalHigh: 20,
    criticalLow: null,
    criticalHigh: 80,
    typicalRangeLabel: '7–20 mg/dL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures urea nitrogen in the blood, often reviewed alongside creatinine for kidney function and hydration.',
  },
  {
    canonicalName: 'eGFR',
    aliases: ['egfr', 'estimated gfr', 'gfr'],
    unit: 'mL/min/1.73m2',
    normalLow: 60,
    normalHigh: 120,
    criticalLow: 15,
    criticalHigh: null,
    typicalRangeLabel: '>= 60 mL/min/1.73m2 (typical adult range — general guide)',
    plainWhatItMeasures:
      'Estimates how efficiently the kidneys filter waste from the blood.',
  },
  {
    canonicalName: 'Calcium',
    aliases: ['calcium', 'serum calcium', 'ca'],
    unit: 'mg/dL',
    normalLow: 8.5,
    normalHigh: 10.5,
    criticalLow: 6.5,
    criticalHigh: 13.0,
    typicalRangeLabel: '8.5–10.5 mg/dL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures blood calcium, important for bone health, nerve signaling, and muscle/heart contraction.',
  },
  {
    canonicalName: 'Magnesium',
    aliases: ['magnesium', 'mg', 'serum magnesium'],
    unit: 'mg/dL',
    normalLow: 1.7,
    normalHigh: 2.2,
    criticalLow: 1.0,
    criticalHigh: 4.5,
    typicalRangeLabel: '1.7–2.2 mg/dL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures magnesium levels in the blood, which support muscle, nerve, and heart rhythm stability.',
  },
  {
    canonicalName: 'Troponin I',
    aliases: ['troponin', 'troponin i', 'hs-troponin', 'high sensitivity troponin', 'troponin t'],
    unit: 'ng/mL',
    normalLow: 0,
    normalHigh: 0.04,
    criticalLow: null,
    criticalHigh: 0.1,
    typicalRangeLabel: '0.00–0.04 ng/mL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures a cardiac protein released into the blood when heart muscle cells experience stress or injury.',
  },
  {
    canonicalName: 'D-Dimer',
    aliases: ['d-dimer', 'd dimer'],
    unit: 'ug/mL FEU',
    normalLow: 0,
    normalHigh: 0.5,
    criticalLow: null,
    criticalHigh: 2.0,
    typicalRangeLabel: '< 0.50 ug/mL FEU (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures a protein fragment produced when a blood clot dissolves in the body.',
  },
  {
    canonicalName: 'INR',
    aliases: ['inr', 'international normalized ratio', 'prothrombin inr'],
    unit: 'ratio',
    normalLow: 0.8,
    normalHigh: 1.2,
    criticalLow: null,
    criticalHigh: 4.5,
    typicalRangeLabel: '0.8–1.2 (typical adult non-anticoagulated — general guide)',
    plainWhatItMeasures:
      'Measures how quickly blood clots compared to a standardized baseline.',
  },
  {
    canonicalName: 'ALT',
    aliases: ['alt', 'sgpt', 'alanine aminotransferase'],
    unit: 'U/L',
    normalLow: 7,
    normalHigh: 56,
    criticalLow: null,
    criticalHigh: 500,
    typicalRangeLabel: '7–56 U/L (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures an enzyme mainly found in liver cells, often checked when evaluating liver health.',
  },
  {
    canonicalName: 'AST',
    aliases: ['ast', 'sgot', 'aspartate aminotransferase'],
    unit: 'U/L',
    normalLow: 10,
    normalHigh: 40,
    criticalLow: null,
    criticalHigh: 500,
    typicalRangeLabel: '10–40 U/L (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures an enzyme found in the liver and muscles, checked alongside ALT when assessing liver or tissue stress.',
  },
  {
    canonicalName: 'Total Bilirubin',
    aliases: ['bilirubin', 'total bilirubin', 'tbil'],
    unit: 'mg/dL',
    normalLow: 0.1,
    normalHigh: 1.2,
    criticalLow: null,
    criticalHigh: 10.0,
    typicalRangeLabel: '0.1–1.2 mg/dL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures bilirubin, a yellow pigment processed by the liver from normal red blood cell turnover.',
  },
  {
    canonicalName: 'TSH',
    aliases: ['tsh', 'thyroid stimulating hormone'],
    unit: 'mIU/L',
    normalLow: 0.4,
    normalHigh: 4.0,
    criticalLow: 0.05,
    criticalHigh: 20.0,
    typicalRangeLabel: '0.4–4.0 mIU/L (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures thyroid-stimulating hormone, which doctors look at when assessing thyroid gland activity.',
  },
  {
    canonicalName: 'LDL Cholesterol',
    aliases: ['ldl', 'ldl cholesterol', 'ldl-c'],
    unit: 'mg/dL',
    normalLow: 0,
    normalHigh: 100,
    criticalLow: null,
    criticalHigh: null,
    typicalRangeLabel: '< 100 mg/dL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures low-density lipoprotein cholesterol, often reviewed when assessing cardiovascular risk.',
  },
  {
    canonicalName: 'HDL Cholesterol',
    aliases: ['hdl', 'hdl cholesterol', 'hdl-c'],
    unit: 'mg/dL',
    normalLow: 40,
    normalHigh: 100,
    criticalLow: null,
    criticalHigh: null,
    typicalRangeLabel: '>= 40 mg/dL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures high-density lipoprotein cholesterol, which helps transport cholesterol away from blood vessels.',
  },
  {
    canonicalName: 'Triglycerides',
    aliases: ['triglycerides', 'trig'],
    unit: 'mg/dL',
    normalLow: 0,
    normalHigh: 150,
    criticalLow: null,
    criticalHigh: 1000,
    typicalRangeLabel: '< 150 mg/dL (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures a type of blood fat stored from excess calories, reviewed for metabolic and heart health.',
  },
  {
    canonicalName: 'Lactate',
    aliases: ['lactate', 'lactic acid'],
    unit: 'mmol/L',
    normalLow: 0.5,
    normalHigh: 2.2,
    criticalLow: null,
    criticalHigh: 4.0,
    typicalRangeLabel: '0.5–2.2 mmol/L (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures lactic acid in the blood, which doctors review to evaluate oxygen delivery and tissue stress.',
  },
  {
    canonicalName: 'Oxygen Saturation (SpO2)',
    aliases: ['spo2', 'oxygen saturation', 'o2 sat'],
    unit: '%',
    normalLow: 95,
    normalHigh: 100,
    criticalLow: 88,
    criticalHigh: null,
    typicalRangeLabel: '95–100 % (typical adult range — general guide)',
    plainWhatItMeasures:
      'Measures the percentage of hemoglobin in the blood carrying oxygen.',
  },
];

export function matchClinicalSpec(testName: string): ClinicalReferenceSpec | null {
  const normalized = testName
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9+/\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;

  for (const spec of CLINICAL_REFERENCE_TABLE) {
    if (spec.canonicalName.toLowerCase() === normalized) {
      return spec;
    }
    for (const alias of spec.aliases) {
      if (normalized === alias || normalized.startsWith(alias + ' ') || normalized.endsWith(' ' + alias)) {
        return spec;
      }
    }
  }

  // Secondary substring check for longer aliases (>= 4 chars) to avoid false hits like "k" or "ca"
  for (const spec of CLINICAL_REFERENCE_TABLE) {
    for (const alias of spec.aliases) {
      if (alias.length >= 4 && normalized.includes(alias)) {
        return spec;
      }
    }
  }

  return null;
}
