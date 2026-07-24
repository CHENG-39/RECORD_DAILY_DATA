import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDietStore } from './diet'

describe('diet store lab report restore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps one valid report per date and drops unsafe optional values', () => {
    const store = useDietStore()
    store.restoreBackup({
      records: [],
      labReports: [
        {
          id: 'valid', date: '2026-01-01', age: 50, sex: 'female',
          creatinine: 100, creatinineUnit: 'umol/L', potassium: 13,
          phosphorus: 7, phosphorusUnit: 'mmol/L', albuminuriaCategory: 'unknown',
        },
        {
          id: 'duplicate', date: '2026-01-01', age: 50, sex: 'female',
          creatinine: 100, creatinineUnit: 'umol/L',
        },
        {
          id: 'future', date: '2099-01-01', age: 50, sex: 'male',
          creatinine: 1, creatinineUnit: 'mg/dL',
        },
        {
          id: 'invalid-age', date: '2025-12-01', age: 17, sex: 'male',
          creatinine: 1, creatinineUnit: 'mg/dL',
        },
      ],
    })

    expect(store.labReports).toHaveLength(1)
    expect(store.labReports[0]).toMatchObject({ id: 'valid', albuminuriaCategory: 'unknown' })
    expect(store.labReports[0].potassium).toBeUndefined()
    expect(store.labReports[0].phosphorus).toBeUndefined()
  })
})
