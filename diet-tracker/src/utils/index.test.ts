import { describe, expect, it } from 'vitest'
import { calculateNutritionTotals, getPersonalizedNutrientRanges, getRecordStreak } from './index'

describe('getRecordStreak', () => {
  it('counts through today when the user has already recorded a meal', () => {
    expect(getRecordStreak([
      { date: '2026-07-19' }, { date: '2026-07-20' }, { date: '2026-07-21' },
    ], '2026-07-21')).toEqual({ days: 3, loggedToday: true })
  })

  it('keeps yesterday\'s streak visible until the user records today', () => {
    expect(getRecordStreak([
      { date: '2026-07-19' }, { date: '2026-07-20' },
    ], '2026-07-21')).toEqual({ days: 2, loggedToday: false })
  })

  it('stops at a missing calendar day', () => {
    expect(getRecordStreak([
      { date: '2026-07-17' }, { date: '2026-07-19' }, { date: '2026-07-20' },
    ], '2026-07-21')).toEqual({ days: 2, loggedToday: false })
  })
})

describe('calculateNutritionTotals', () => {
  it('aggregates sodium and bioavailable phosphorus with the other nutrients', () => {
    const totals = calculateNutritionTotals([
      {
        calories: 100, protein: 10, fat: 2, carbs: 12, fiber: 3,
        potassium: 200, phosphorus: 100, sodium: 300, bioavailablePhosphorus: 40,
      },
      {
        calories: 150, protein: 5, fat: 6, carbs: 20, fiber: 2,
        potassium: 150, phosphorus: 80, sodium: 120, bioavailablePhosphorus: 32,
      },
    ])

    expect(totals).toMatchObject({
      totalCalories: 250,
      totalProtein: 15,
      totalPotassium: 350,
      totalPhosphorus: 180,
      totalSodium: 420,
      totalBioavailablePhosphorus: 72,
    })
    expect(totals.totalPRAL).toBe(6.7)
  })

  it('uses total phosphorus as a backwards-compatible fallback', () => {
    const totals = calculateNutritionTotals([{
      calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0,
      potassium: 0, phosphorus: 90,
    }])
    expect(totals.totalBioavailablePhosphorus).toBe(90)
    expect(totals.totalSodium).toBe(0)
  })
})

describe('getPersonalizedNutrientRanges', () => {
  it('applies enabled clinician upper limits in kidney mode', () => {
    const ranges = getPersonalizedNutrientRanges(60, 'kidney', {
      enabled: true,
      source: 'clinician',
      note: '',
      targets: { protein: 42, potassium: 1800, phosphorus: 700, sodium: 1500 },
    })

    expect(ranges.protein).toMatchObject({ min: 0, max: 42, isUpperLimit: true })
    expect(ranges.potassium).toMatchObject({ min: 0, max: 1800, isUpperLimit: true })
    expect(ranges.sodium.max).toBe(1500)
  })

  it('does not treat a self-recorded or disabled plan as a prescription', () => {
    const disabled = getPersonalizedNutrientRanges(60, 'kidney', {
      enabled: false,
      source: 'clinician',
      note: '',
      targets: { sodium: 800 },
    })
    const selfRecorded = getPersonalizedNutrientRanges(60, 'kidney', {
      enabled: true,
      source: 'self',
      note: '',
      targets: { sodium: 800 },
    })

    expect(disabled.sodium.max).toBe(2000)
    expect(selfRecorded.sodium.max).toBe(2000)
  })
})
