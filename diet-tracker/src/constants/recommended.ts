import type { NutritionRange, UserMode } from '../types/diet';

/**
 * 不同用户模式的每日营养推荐摄入范围
 * 数据来源：中国居民膳食营养素参考摄入量（DRIs）
 */
export const RECOMMENDED_NUTRITION: Record<UserMode, NutritionRange> = {
  normal: {
    protein: { min: 60, max: 80 },
    fat: { min: 50, max: 70 },
    carbs: { min: 250, max: 350 },
    fiber: { min: 25, max: 35 },
    potassium: { min: 2000, max: 3500 },
    phosphorus: { min: 800, max: 1000 },
    calories: { min: 1800, max: 2200 },
  },
  kidney: {
    protein: { min: 40, max: 60 },
    fat: { min: 50, max: 70 },
    carbs: { min: 200, max: 300 },
    fiber: { min: 20, max: 30 },
    potassium: { min: 1500, max: 2000 },
    phosphorus: { min: 600, max: 800 },
    calories: { min: 1600, max: 2000 },
  },
};

/**
 * 获取当前用户模式的推荐范围
 * @param mode 用户模式
 * @returns 营养推荐范围
 */
export function getRecommendedRange(mode: UserMode): NutritionRange {
  return RECOMMENDED_NUTRITION[mode];
}

/**
 * 判断营养值是否在推荐范围内
 * @param value 实际摄入值
 * @param range 推荐范围 [min, max]
 * @returns 'low' | 'normal' | 'high'
 */
export function checkNutritionStatus(
  value: number,
  range: { min: number; max: number }
): 'low' | 'normal' | 'high' {
  if (value < range.min) {
    return 'low';
  } else if (value > range.max) {
    return 'high';
  } else {
    return 'normal';
  }
}

/**
 * 获取营养状态对应的颜色
 * @param status 营养状态
 * @returns 颜色值
 */
export function getNutritionStatusColor(
  status: 'low' | 'normal' | 'high'
): string {
  switch (status) {
    case 'low':
      return '#ff976a'; // 橙色 - 偏低
    case 'high':
      return '#ee0a24'; // 红色 - 偏高
    case 'normal':
      return '#07c160'; // 绿色 - 正常
    default:
      return '#969799';
  }
}

/**
 * 获取营养状态对应的文本描述
 * @param status 营养状态
 * @returns 描述文本
 */
export function getNutritionStatusText(
  status: 'low' | 'normal' | 'high'
): string {
  switch (status) {
    case 'low':
      return '偏低';
    case 'high':
      return '偏高';
    case 'normal':
      return '正常';
    default:
      return '未知';
  }
}

/**
 * 计算营养摄入百分比（相对于推荐范围中值）
 * @param value 实际摄入值
 * @param range 推荐范围 [min, max]
 * @returns 百分比（0-100+）
 */
export function calculateNutritionPercentage(
  value: number,
  range: { min: number; max: number }
): number {
  const mid = (range.min + range.max) / 2;

  return Number(((value / mid) * 100).toFixed(1));
}

/**
 * 用户模式配置信息
 */
export const USER_MODE_CONFIG: Record<
  UserMode,
  {
    label: string;
    description: string;
  }
> = {
  normal: {
    label: '普通成人',
    description: '适用于健康成年人的标准营养推荐',
  },
  kidney: {
    label: '肾病患者',
    description: '低蛋白、限钾、限磷的饮食方案',
  },
};
