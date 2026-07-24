import { describe, expect, it } from 'vitest'
import type { LabReport } from '@/types'
import { analyzeLabReport, calculateEgfr, getEgfrStage } from './labAnalysis'

function makeReport(overrides: Partial<LabReport> = {}): LabReport {
  return {
    id: 'current',
    date: '2026-07-20',
    age: 50,
    sex: 'male',
    creatinine: 2,
    creatinineUnit: 'mg/dL',
    ...overrides,
  }
}

describe('CKD-EPI 2021 eGFR', () => {
  it('calculates published CKD-EPI 2021 equation branches for male and female adults', () => {
    expect(calculateEgfr(1, 'mg/dL', 50, 'male')).toBeCloseTo(91.7, 1)
    expect(calculateEgfr(1, 'mg/dL', 50, 'female')).toBeCloseTo(68.6, 1)
  })

  it('converts umol/L to mg/dL before calculation', () => {
    expect(calculateEgfr(88.4, 'umol/L', 50, 'male')).toBe(calculateEgfr(1, 'mg/dL', 50, 'male'))
  })

  it('rejects unsupported ages and invalid creatinine values', () => {
    expect(calculateEgfr(1, 'mg/dL', 17, 'male')).toBeNull()
    expect(calculateEgfr(0, 'mg/dL', 50, 'male')).toBeNull()
    expect(calculateEgfr(Number.NaN, 'mg/dL', 50, 'female')).toBeNull()
  })
})

describe('eGFR G categories', () => {
  it.each([
    [90, 'G1'], [89.9, 'G2'], [60, 'G2'], [59.9, 'G3a'], [45, 'G3a'],
    [44.9, 'G3b'], [30, 'G3b'], [29.9, 'G4'], [15, 'G4'], [14.9, 'G5'],
  ] as const)('maps %s to %s', (value, stage) => {
    expect(getEgfrStage(value)).toBe(stage)
  })

  it('marks missing or negative results invalid', () => {
    expect(getEgfrStage(null)).toBe('invalid')
    expect(getEgfrStage(-1)).toBe('invalid')
  })
})

describe('lab report safety analysis', () => {
  it('does not call one low eGFR result persistent', () => {
    const analysis = analyzeLabReport(makeReport(), 60)
    expect(analysis.chronicity).toBe('not_established')
    expect(analysis.alerts.some(item => item.includes('90 天'))).toBe(true)
  })

  it('only flags possible persistence when abnormalities are at least 90 days apart', () => {
    const current = makeReport()
    const oldLow = makeReport({ id: 'old', date: '2026-04-20', creatinine: 2.1 })
    const oldNormal = makeReport({ id: 'old-normal', date: '2026-01-01', creatinine: 1 })

    expect(analyzeLabReport(current, 60, [oldLow]).chronicity).toBe('possible_persistent')
    expect(analyzeLabReport(current, 60, [oldNormal]).chronicity).toBe('not_established')
    expect(analyzeLabReport(
      makeReport({ creatinine: 1, albuminuriaCategory: 'A2' }),
      60,
      [makeReport({ id: 'old-a2', date: '2026-04-20', creatinine: 1, albuminuriaCategory: 'A2' })],
    ).chronicity).toBe('possible_persistent')
  })

  it('offers the 0.8 g/kg discussion anchor only for non-dialysis G3-G5 results', () => {
    const nonDialysis = analyzeLabReport(makeReport(), 60)
    const dialysis = analyzeLabReport(makeReport({ dialysis: true }), 60)
    const normalEgfr = analyzeLabReport(makeReport({ creatinine: 1 }), 60)

    expect(nonDialysis.nutritionReferences.find(item => item.key === 'protein')).toMatchObject({ value: '48.0', level: 'requires_clinician' })
    expect(dialysis.nutritionReferences.find(item => item.key === 'protein')?.value).toBe('需结合病情')
    expect(normalEgfr.nutritionReferences.find(item => item.key === 'protein')?.value).toBe('需结合病情')
  })

  it('never derives automatic potassium or phosphorus limits from creatinine', () => {
    const analysis = analyzeLabReport(makeReport(), 60)
    for (const key of ['potassium', 'phosphorus'] as const) {
      expect(analysis.nutritionReferences.find(item => item.key === key)).toMatchObject({ value: '不自动限值', level: 'requires_clinician' })
    }
  })

  it('interprets phosphorus alert thresholds according to the entered unit', () => {
    const mmol = analyzeLabReport(makeReport({ phosphorus: 1.8, phosphorusUnit: 'mmol/L' }), 60)
    const mgDl = analyzeLabReport(makeReport({ phosphorus: 5, phosphorusUnit: 'mg/dL' }), 60)
    expect(mmol.alerts.some(item => item.includes('血磷'))).toBe(true)
    expect(mgDl.alerts.some(item => item.includes('血磷'))).toBe(true)
  })
})
