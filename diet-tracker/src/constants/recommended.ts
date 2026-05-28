import type { NutritionRange, UserMode } from '../types/diet';

/**
 * 不同用户模式的每日营养推荐摄入范围
 * 数据来源：中国居民膳食营养素参考摄入量（DRIs）
 */
export const RECOMMENDED_NUTRITION: Record<UserMode, NutritionRange> = {
  // 普通成人模式
  normal: {
    protein: [60, 80],       // 蛋白质 60-80g
    potassium: [2000, 3500], // 钾 2000-3500mg
    phosphorus: [800, 1000], // 磷 800-1000mg
  },
  // 肾病患者模式
  kidney: {
    protein: [40, 60],       // 蛋白质 40-60g（低蛋白饮食）
    potassium: [1500, 2000], // 钾 1500-2000mg（限钾）
    phosphorus: [600, 800],  // 磷 600-800mg（限磷）
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
  range: [number, number]
): 'low' | 'normal' | 'high' {
  const [min, max] = range;
  
  if (value < min) {
    return 'low';
  } else if (value > max) {
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
  range: [number, number]
): number {
  const [min, max] = range;
  const mid = (min + max) / 2;
  
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
