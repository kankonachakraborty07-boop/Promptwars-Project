export interface SampleReport {
  id: string;
  title: string;
  category: string;
  summaryHint: string;
  content: string;
}

export const SAMPLE_REPORTS: SampleReport[] = [
  {
    id: 'urgent-cardiac-electrolyte',
    title: 'Urgent Electrolyte & Cardiac Panel',
    category: 'Acute Lab Panel',
    summaryHint: 'Includes critical-band Potassium and Troponin I values to verify Emergency Escalation.',
    content: `NCPL MEDITECH CLINICAL LABORATORY — STAT REPORT
Report Type: Basic Metabolic & Cardiac Biomarker Panel
Specimen Collected: 2026-11-24 08:15

--- Page 1 ---
Potassium: 6.3 mmol/L (Ref: 3.5 - 5.0) CRITICAL HIGH
Sodium: 138 mmol/L (Ref: 135 - 145)
Chloride: 103 mmol/L (Ref: 98 - 107)
Bicarbonate (CO2): 19 mmol/L (Ref: 22 - 29) LOW
Creatinine: 1.9 mg/dL (Ref: 0.6 - 1.3) HIGH
BUN: 32 mg/dL (Ref: 7 - 20) HIGH
Troponin I: 0.24 ng/mL (Ref: 0.00 - 0.04) CRITICAL
Hemoglobin: 10.8 g/dL (Ref: 12.0 - 16.0) LOW
Platelets: 245 10^3/uL (Ref: 150 - 450)

Laboratory Note: Critical value protocol initiated for Potassium and Troponin I. Immediate clinician notification advised.`,
  },
  {
    id: 'routine-wellness-panel',
    title: 'Routine Preventive Lab Panel',
    category: 'Annual Checkup',
    summaryHint: 'Mostly normal markers with mild fasting glucose and LDL elevation for routine review.',
    content: `OUTPATIENT DIAGNOSTICS — COMPREHENSIVE WELLNESS PANEL
Specimen Type: Venous Blood (Fasting)

--- Page 1 ---
Glucose, Fasting: 108 mg/dL (Ref: 70 - 99) HIGH
HbA1c: 5.9 % (Ref: 4.0 - 5.6) HIGH
LDL Cholesterol: 128 mg/dL (Ref: < 100) HIGH
HDL Cholesterol: 54 mg/dL (Ref: >= 40)
Triglycerides: 132 mg/dL (Ref: < 150)
TSH: 2.15 mIU/L (Ref: 0.40 - 4.00)
Hemoglobin: 13.9 g/dL (Ref: 12.0 - 17.5)
WBC: 6.4 10^3/uL (Ref: 4.0 - 11.0)
Platelets: 262 10^3/uL (Ref: 150 - 450)
Creatinine: 0.9 mg/dL (Ref: 0.6 - 1.3)
ALT: 24 U/L (Ref: 7 - 56)`,
  },
  {
    id: 'prescription-discharge',
    title: 'Prescription & Follow-Up Summary',
    category: 'Mixed Rx & Labs',
    summaryHint: 'Medications plus lab values without printed reference ranges (uses adult guide fallback).',
    content: `OUTPATIENT CLINIC FOLLOW-UP & PRESCRIPTION SUMMARY

--- Page 1 ---
Recent Measurements (reference ranges not printed on summary):
HbA1c: 7.4 %
Sodium: 140 mmol/L
Potassium: 4.2 mmol/L
eGFR: 74 mL/min/1.73m2

Current Prescription Instructions:
1. Metformin Extended Release 500 mg — Take 1 tablet by mouth once daily with evening meal. (30-day supply, 3 refills)
2. Lisinopril 10 mg — Take 1 tablet by mouth once daily in the morning. (30-day supply, 3 refills)
3. Atorvastatin 20 mg — Take 1 tablet by mouth once daily at bedtime. (30-day supply, 3 refills)

Clinical Note: Continue routine dietary fiber and hydration counseling. Schedule follow-up metabolic panel in 12 weeks.`,
  },
];
