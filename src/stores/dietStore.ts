/**
 * 饮食记录 Pinia Store
 * 负责管理用户的饮食记录、营养计算和用户设置
 */

import { defineStore } from 'pinia';
import dayjs, { Dayjs } from 'dayjs';
import type {
  FoodItem,
  MealRecord,
  DailyRecord,
  DailyNutrition,
  MealType,
} from '../types/diet';
import {
  calculateMealNutrition,
  calculateDailyNutrition,
  evaluateIntake,
  type NutritionEvaluation,
} from '../utils/nutritionCalculator';

/**
 * 用户设置接口
 */
interface UserSettings {
  userName: string;
  dailyCalorieTarget: number;
}

/**
 * Store State 接口
 */
interface DietState {
  // 以日期 YYYY-MM-DD 为 key 的记录字典
  records: Record<string, DailyRecord>;
  // 用户模式：'normal' | 'kidney'
  currentUserMode: 'normal' | 'kidney';
  // 用户设置
  settings: UserSettings;
}

/**
 * 创建空的每日记录
 * @param dateStr 日期字符串 YYYY-MM-DD
 * @returns 空的 DailyRecord
 */
function createEmptyDailyRecord(dateStr: string): DailyRecord {
  return {
    date: dateStr,
    meals: [],
    totalNutrition: {
      protein: 0,
      potassium: 0,
      phosphorus: 0,
      calories: 0,
    },
  };
}

/**
 * 获取今日日期字符串 YYYY-MM-DD
 */
function getTodayDateStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * 饮食记录 Store
 */
export const useDietStore = defineStore('diet', {
  // State
  state: (): DietState => ({
    records: {},
    currentUserMode: 'normal',
    settings: {
      userName: '用户',
      dailyCalorieTarget: 2000,
    },
  }),

  // Getters
  getters: {
    /**
     * 获取今天的记录
     * 如果今天没有记录，自动创建并返回空记录
     */
    getTodayRecord(): DailyRecord {
      const today = getTodayDateStr();
      if (!this.records[today]) {
        // 自动创建今天的空记录
        this.records[today] = createEmptyDailyRecord(today);
      }
      return this.records[today];
    },

    /**
     * 按日期获取记录
     * @param dateStr 日期字符串 YYYY-MM-DD 或 Date 对象
     * @returns DailyRecord 或 null（如果不存在且非今天）
     */
    getRecordByDate: (state) => {
      return (dateStr: string | Dayjs): DailyRecord | null => {
        const date = typeof dateStr === 'string' ? dateStr : dayjs(dateStr).format('YYYY-MM-DD');
        
        // 如果记录不存在，检查是否是今天
        if (!state.records[date]) {
          if (date === getTodayDateStr()) {
            // 今天是自动创建
            state.records[date] = createEmptyDailyRecord(date);
            return state.records[date];
          }
          return null;
        }
        return state.records[date];
      };
    },

    /**
     * 获取最近 N 天的记录
     * @param days 天数
     * @returns DailyRecord 数组，按日期倒序排列
     */
    getRecentRecords: (state) => {
      return (days: number = 7): DailyRecord[] => {
        const records: DailyRecord[] = [];
        const today = dayjs();

        for (let i = 0; i < days; i++) {
          const dateStr = today.subtract(i, 'day').format('YYYY-MM-DD');
          if (state.records[dateStr]) {
            records.push(state.records[dateStr]);
          }
        }

        return records;
      };
    },

    /**
     * 今日营养汇总 + 评估状态
     * @returns 包含今日营养数据和评估结果的对象
     */
    getTodayNutritionSummary(): {
      nutrition: DailyNutrition;
      evaluation: NutritionEvaluation;
      date: string;
    } {
      const todayRecord = this.getTodayRecord;
      const evaluation = evaluateIntake(todayRecord.totalNutrition, this.currentUserMode);

      return {
        nutrition: todayRecord.totalNutrition,
        evaluation,
        date: todayRecord.date,
      };
    },

    /**
     * 最近 7 天平均摄入
     * @returns 平均营养数据，如果没有记录则返回全 0
     */
    getWeekAverage(): DailyNutrition {
      const recentRecords = this.getRecentRecords(7);
      
      if (recentRecords.length === 0) {
        return {
          protein: 0,
          potassium: 0,
          phosphorus: 0,
          calories: 0,
        };
      }

      let totalProtein = 0;
      let totalPotassium = 0;
      let totalPhosphorus = 0;
      let totalCalories = 0;

      recentRecords.forEach((record) => {
        totalProtein += record.totalNutrition.protein;
        totalPotassium += record.totalNutrition.potassium;
        totalPhosphorus += record.totalNutrition.phosphorus;
        totalCalories += record.totalNutrition.calories;
      });

      const count = recentRecords.length;

      return {
        protein: parseFloat((totalProtein / count).toFixed(2)),
        potassium: Math.round(totalPotassium / count),
        phosphorus: Math.round(totalPhosphorus / count),
        calories: Math.round(totalCalories / count),
      };
    },

    /**
     * 获取指定日期的餐食列表
     */
    getMealsByDate: (state) => {
      return (dateStr: string | Dayjs): MealRecord[] => {
        const record = state.getRecordByDate(dateStr);
        return record ? record.meals : [];
      };
    },

    /**
     * 检查指定日期是否有记录
     */
    hasRecordOnDate: (state) => {
      return (dateStr: string | Dayjs): boolean => {
        const date = typeof dateStr === 'string' ? dateStr : dayjs(dateStr).format('YYYY-MM-DD');
        return !!state.records[date];
      };
    },
  },

  // Actions
  actions: {
    /**
     * 确保某天的记录存在
     * @param dateStr 日期字符串
     * @returns DailyRecord
     */
    ensureRecordExists(dateStr: string): DailyRecord {
      if (!this.records[dateStr]) {
        this.records[dateStr] = createEmptyDailyRecord(dateStr);
      }
      return this.records[dateStr];
    },

    /**
     * 重新计算某天的总营养
     * @param dateStr 日期字符串
     */
    recalculateDailyNutrition(dateStr: string) {
      const record = this.records[dateStr];
      if (!record) return;

      const totalNutrition = calculateDailyNutrition(record.meals);
      record.totalNutrition = totalNutrition;
    },

    /**
     * 添加一条食物记录
     * @param dateStr 日期字符串 YYYY-MM-DD（可选，默认为今天）
     * @param mealType 餐食类型
     * @param foodItem 食物项
     */
    addFood(
      dateStr: string | undefined,
      mealType: MealType,
      foodItem: FoodItem
    ) {
      const targetDate = dateStr || getTodayDateStr();
      
      // 验证食物重量
      if (foodItem.weightGrams <= 0) {
        console.warn('食物重量必须大于 0');
        return;
      }

      const record = this.ensureRecordExists(targetDate);
      
      // 查找或创建对应的餐食记录
      let mealRecord = record.meals.find((m) => m.mealType === mealType);
      
      if (!mealRecord) {
        mealRecord = {
          mealType,
          foods: [],
          timestamp: dayjs().valueOf(),
        };
        record.meals.push(mealRecord);
      }

      // 添加食物
      mealRecord.foods.push({
        ...foodItem,
      });

      // 重新计算总营养
      this.recalculateDailyNutrition(targetDate);
    },

    /**
     * 删除一条食物记录
     * @param dateStr 日期字符串 YYYY-MM-DD（可选，默认为今天）
     * @param mealType 餐食类型
     * @param foodIndex 食物在餐食中的索引
     */
    removeFood(
      dateStr: string | undefined,
      mealType: MealType,
      foodIndex: number
    ) {
      const targetDate = dateStr || getTodayDateStr();
      const record = this.records[targetDate];
      
      if (!record) {
        console.warn('记录不存在');
        return;
      }

      const mealRecord = record.meals.find((m) => m.mealType === mealType);
      
      if (!mealRecord || foodIndex < 0 || foodIndex >= mealRecord.foods.length) {
        console.warn('餐食记录或食物索引不存在');
        return;
      }

      // 删除食物
      mealRecord.foods.splice(foodIndex, 1);

      // 如果餐食没有食物了，删除餐食记录
      if (mealRecord.foods.length === 0) {
        record.meals = record.meals.filter((m) => m.mealType !== mealType);
      }

      // 重新计算总营养
      this.recalculateDailyNutrition(targetDate);
    },

    /**
     * 修改一条食物记录
     * @param dateStr 日期字符串 YYYY-MM-DD（可选，默认为今天）
     * @param mealType 餐食类型
     * @param foodIndex 食物在餐食中的索引
     * @param newFood 新的食物项
     */
    updateFood(
      dateStr: string | undefined,
      mealType: MealType,
      foodIndex: number,
      newFood: FoodItem
    ) {
      const targetDate = dateStr || getTodayDateStr();
      const record = this.records[targetDate];
      
      if (!record) {
        console.warn('记录不存在');
        return;
      }

      const mealRecord = record.meals.find((m) => m.mealType === mealType);
      
      if (!mealRecord || foodIndex < 0 || foodIndex >= mealRecord.foods.length) {
        console.warn('餐食记录或食物索引不存在');
        return;
      }

      // 验证新食物重量
      if (newFood.weightGrams <= 0) {
        console.warn('食物重量必须大于 0');
        return;
      }

      // 更新食物
      mealRecord.foods[foodIndex] = {
        ...newFood,
      };

      // 重新计算总营养
      this.recalculateDailyNutrition(targetDate);
    },

    /**
     * 切换用户模式
     * @param mode 用户模式 'normal' | 'kidney'
     */
    setUserMode(mode: 'normal' | 'kidney') {
      this.currentUserMode = mode;
    },

    /**
     * 更新用户设置
     * @param settings 部分或完整的用户设置
     */
    updateSettings(settings: Partial<UserSettings>) {
      this.settings = {
        ...this.settings,
        ...settings,
      };
    },

    /**
     * 清除某一天的所有记录
     * @param dateStr 日期字符串 YYYY-MM-DD（可选，默认为今天）
     */
    clearDayRecord(dateStr: string | undefined) {
      const targetDate = dateStr || getTodayDateStr();
      
      if (this.records[targetDate]) {
        delete this.records[targetDate];
      }
    },

    /**
     * 导出所有数据为 JSON 字符串
     * @returns JSON 字符串
     */
    exportData(): string {
      const data = {
        records: this.records,
        currentUserMode: this.currentUserMode,
        settings: this.settings,
        exportedAt: dayjs().toISOString(),
        version: '1.0.0',
      };
      
      return JSON.stringify(data, null, 2);
    },

    /**
     * 从 JSON 字符串导入数据
     * @param jsonString JSON 字符串
     * @returns 是否成功
     */
    importData(jsonString: string): boolean {
      try {
        const data = JSON.parse(jsonString);
        
        // 基本验证
        if (!data.records || typeof data.records !== 'object') {
          throw new Error('无效的数据格式：缺少 records');
        }

        // 导入记录
        this.records = data.records;
        
        // 导入用户模式（如果存在）
        if (data.currentUserMode === 'normal' || data.currentUserMode === 'kidney') {
          this.currentUserMode = data.currentUserMode;
        }
        
        // 导入设置（如果存在）
        if (data.settings && typeof data.settings === 'object') {
          this.settings = {
            ...this.settings,
            ...data.settings,
          };
        }

        return true;
      } catch (error) {
        console.error('导入数据失败:', error);
        return false;
      }
    },

    /**
     * 清空所有数据
     */
    clearAllData() {
      this.records = {};
      this.currentUserMode = 'normal';
      this.settings = {
        userName: '用户',
        dailyCalorieTarget: 2000,
      };
    },

    /**
     * 批量添加食物（用于快速录入）
     * @param dateStr 日期字符串
     * @param mealType 餐食类型
     * @param foodItems 食物项数组
     */
    addFoodsBatch(
      dateStr: string | undefined,
      mealType: MealType,
      foodItems: FoodItem[]
    ) {
      const targetDate = dateStr || getTodayDateStr();
      const record = this.ensureRecordExists(targetDate);
      
      // 查找或创建对应的餐食记录
      let mealRecord = record.meals.find((m) => m.mealType === mealType);
      
      if (!mealRecord) {
        mealRecord = {
          mealType,
          foods: [],
          timestamp: dayjs().valueOf(),
        };
        record.meals.push(mealRecord);
      }

      // 过滤有效的食物项并添加
      const validFoods = foodItems.filter(
        (food) => food.weightGrams > 0
      );
      
      mealRecord.foods.push(...validFoods);

      // 重新计算总营养
      this.recalculateDailyNutrition(targetDate);
    },
  },

  // Persist 配置
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'diet-tracker-store',
        storage: localStorage,
        // 序列化选项
        serializer: {
          serialize: (state) => {
            return JSON.stringify(state);
          },
          deserialize: (value) => {
            return JSON.parse(value);
          },
        },
        // 只持久化需要的字段
        paths: ['records', 'currentUserMode', 'settings'],
      },
    ],
  },
});
