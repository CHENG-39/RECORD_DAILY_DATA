import type { LabReport, LabSex } from '@/types'

/**
 * Evidence links used by the report screen. These are references, not a
 * substitute for a clinician's interpretation of a laboratory report.
 */
export const LAB_DATA_SOURCES = [
  {
    organization: 'KDIGO',
    title: '2024 CKD Evaluation and Management Guideline',
    url: 'https://kdigo.org/wp-content/uploads/2026/04/KDIGO-2024-CKD-Guideline.pdf',
  },
  {
    organization: 'National Kidney Foundation',
    title: 'eGFR calculator and CKD-EPI 2021 equation',
    url: 'https://www.kidney.org/professionals/gfr_calculator',
  },
  {
    organization: 'World Health Organization',
    title: 'Guideline: Sodium intake for adults and children',
    url: 'https://www.who.int/publications/i/item/9789241504836',
  },
  {
    organization: 'NKF KDOQI',
    title: 'Clinical Practice Guideline for Nutrition in CKD: 2020 Update',
    url: 'https://www.ajkd.org/article/S0272-6386(20)30812-X/fulltext',
  },
] as const

export type EgfrStage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5' | 'invalid'

export interface LabNutritionReference {
  key: 'calories' | 'protein' | 'sodium' | 'potassium' | 'phosphorus'
  label: string
  value: string
  unit: string
  level: 'reference' | 'requires_clinician'
  evidence: string
  explanation: string
}

export interface LabAnalysis {
  egfr: number | null
  egfrStage: EgfrStage
  creatinineMgDl: number | null
  chronicity: 'not_established' | 'possible_persistent'
  nutritionReferences: LabNutritionReference[]
  alerts: string[]
  limitations: string[]
}

function normalizeCreatinine(value: number, unit: LabReport['creatinineUnit']): number {
  return unit === 'umol/L' ? value / 88.4 : value
}

/** CKD-EPI 2021 creatinine equation, expressed as mL/min/1.73m2. */
export function calculateEgfr(creatinine: number, unit: LabReport['creatinineUnit'], age: number, sex: LabSex): number | null {
  if (!Number.isFinite(creatinine) || !Number.isFinite(age) || age < 18 || age > 120 || creatinine <= 0) return null
  const scr = normalizeCreatinine(creatinine, unit)
  if (scr <= 0 || scr > 30) return null
  const kappa = sex === 'female' ? 0.7 : 0.9
  const alpha = sex === 'female' ? -0.241 : -0.302
  const ratio = scr / kappa
  const egfr = 142 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.2) * Math.pow(0.9938, age) * (sex === 'female' ? 1.012 : 1)
  return Number.isFinite(egfr) ? Math.round(egfr * 10) / 10 : null
}

export function getEgfrStage(egfr: number | null): EgfrStage {
  if (egfr === null || !Number.isFinite(egfr) || egfr < 0) return 'invalid'
  if (egfr >= 90) return 'G1'
  if (egfr >= 60) return 'G2'
  if (egfr >= 45) return 'G3a'
  if (egfr >= 30) return 'G3b'
  if (egfr >= 15) return 'G4'
  return 'G5'
}

function daysBetween(a: string, b: string): number {
  const first = Date.parse(`${a}T00:00:00Z`)
  const second = Date.parse(`${b}T00:00:00Z`)
  if (!Number.isFinite(first) || !Number.isFinite(second)) return 0
  return Math.abs(second - first) / 86_400_000
}

function hasKidneyAbnormality(report: LabReport, egfr: number | null): boolean {
  return (egfr !== null && egfr < 60)
    || report.albuminuriaCategory === 'A2'
    || report.albuminuriaCategory === 'A3'
}

function hasPersistentKidneyAbnormality(report: LabReport, egfr: number | null, previousReports: LabReport[]): boolean {
  if (!hasKidneyAbnormality(report, egfr)) return false
  return previousReports.some(previous => {
    if (previous.id === report.id || daysBetween(previous.date, report.date) < 90) return false
    const previousEgfr = calculateEgfr(previous.creatinine, previous.creatinineUnit, previous.age, previous.sex)
    return hasKidneyAbnormality(previous, previousEgfr)
  })
}

export function analyzeLabReport(report: LabReport, weightKg: number | null, previousReports: LabReport[] = []): LabAnalysis {
  const creatinineMgDl = normalizeCreatinine(report.creatinine, report.creatinineUnit)
  const egfr = calculateEgfr(report.creatinine, report.creatinineUnit, report.age, report.sex)
  const egfrStage = getEgfrStage(egfr)
  const chronicity = hasPersistentKidneyAbnormality(report, egfr, previousReports) ? 'possible_persistent' : 'not_established'
  const safeWeight = weightKg && weightKg >= 30 && weightKg <= 200 ? weightKg : null
  const nutritionReferences: LabNutritionReference[] = []

  if (safeWeight && (report.dialysis || hasKidneyAbnormality(report, egfr))) {
    nutritionReferences.push({
      key: 'calories', label: '能量参考带', value: `${Math.round(safeWeight * 25)}-${Math.round(safeWeight * 35)}`, unit: 'kcal/日',
      level: 'requires_clinician', evidence: 'KDOQI 2020 Guideline 3.1.1 (1C)', explanation: '仅供已确诊且代谢稳定的成人 CKD 1-5D 与专业人员讨论；需结合年龄、活动量、体重变化、CKD 分期和炎症状态调整。',
    })
  }
  if (egfr !== null && egfr < 60 && !report.dialysis) {
    nutritionReferences.push({
      key: 'protein', label: '蛋白质讨论锚点', value: safeWeight ? (safeWeight * 0.8).toFixed(1) : '0.8', unit: safeWeight ? 'g/日（0.8 g/kg）' : 'g/kg/日',
      level: 'requires_clinician', evidence: 'KDIGO 2024 Recommendation 3.3.1.1 (2C)', explanation: '适用于非透析 CKD G3-G5 成人的讨论锚点；低蛋白饮食必须由专业人员监督。',
    })
  } else {
    nutritionReferences.push({
      key: 'protein', label: '蛋白质', value: '需结合病情', unit: '', level: 'requires_clinician', evidence: 'KDIGO 2024 Recommendation 3.3.1.1 (2C)',
      explanation: '单次肌酐/eGFR 不能决定蛋白质目标；请使用已有医生方案。',
    })
  }
  nutritionReferences.push({
    key: 'sodium', label: '钠摄入参考上限', value: '≤2000', unit: 'mg/日', level: 'reference', evidence: 'KDIGO 2024 Recommendation 3.3.2.1 (2C); WHO sodium guideline',
    explanation: 'WHO 成人公共健康参考与 KDIGO CKD 建议均指向每日钠少于 2g；高血压、心衰、水肿或钠丢失性肾病可能需要不同目标。',
  })
  nutritionReferences.push({
    key: 'potassium', label: '钾', value: '不自动限值', unit: '', level: 'requires_clinician', evidence: 'KDIGO 2024 Practice Point 3.3.2; 3.11',
      explanation: '需要结合血钾、用药、尿量和医生方案；肌酐单独不能推出每日钾上限。',
  })
  nutritionReferences.push({
    key: 'phosphorus', label: '磷', value: '不自动限值', unit: '', level: 'requires_clinician', evidence: 'KDIGO 2024 Practice Point 3.3.2',
      explanation: '需要结合血磷、PTH、饮食来源和医生方案；肌酐单独不能推出每日磷上限。',
  })

  const alerts: string[] = []
  if (egfrStage === 'G4' || egfrStage === 'G5') alerts.push('eGFR 处于较低区间，建议尽快由肾脏专科或营养专业人员复核。')
  else if (egfrStage === 'G3a' || egfrStage === 'G3b') alerts.push('eGFR 低于 60；一次结果不能确认慢性肾病，需要结合既往结果和尿蛋白评估。')
  if (report.potassium !== undefined && (report.potassium < 3.5 || report.potassium > 5.5)) alerts.push('录入的血钾超出常见实验室参考区间，请优先联系医生，不要自行调整饮食或药物。')
  if (report.phosphorus !== undefined) {
    const phosphorusUnit = report.phosphorusUnit ?? 'mmol/L'
    const low = phosphorusUnit === 'mg/dL' ? 2.5 : 0.8
    const high = phosphorusUnit === 'mg/dL' ? 4.5 : 1.6
    if (report.phosphorus < low || report.phosphorus > high) alerts.push('录入的血磷可能异常；实验室单位和参考区间不同，请按原报告复核。')
  }
  if (report.albuminuriaCategory === 'A3') alerts.push('尿白蛋白为 A3（重度升高）分级，建议尽快由医生结合原始 UACR、尿常规和临床情况复核。')
  else if (report.albuminuriaCategory === 'A2') alerts.push('尿白蛋白为 A2（中度升高）分级；单次升高可能受运动、感染等影响，需要按医生安排复查确认。')
  if (chronicity === 'not_established' && egfr !== null && egfr < 60) alerts.push('当前没有间隔至少 90 天的复测记录，不能仅凭本次结果判定慢性病分期。')
  if (chronicity === 'possible_persistent') alerts.push('相隔至少 90 天的记录中均存在 eGFR 或尿白蛋白异常，提示异常可能持续；仍需由医生结合原始报告确认。')

  return {
    egfr, egfrStage, creatinineMgDl: Number.isFinite(creatinineMgDl) ? Math.round(creatinineMgDl * 100) / 100 : null,
    chronicity, nutritionReferences: safeWeight ? nutritionReferences : nutritionReferences.filter(item => item.key !== 'calories'), alerts,
    limitations: [
      '本分析用于整理报告与饮食记录，不是诊断、处方或急症判断。',
      'eGFR 受年龄、性别、肌肉量、急性疾病和实验室方法影响；请以原始化验单和医生判断为准。',
      '若正在透析、近期住院、妊娠、儿童或存在严重营养不良，不适用此简化分析。',
    ],
  }
}
