import type { ProductCode } from "./inventory/types";

export type Role = "customer" | "coach" | "admin";

export type PlanLength = 60 | 90;

export interface TrendPoint {
  label: string;
  value: number;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  done: boolean;
  icon: string;
}

export interface MealMisuItem {
  productCode: ProductCode;
  quantity: number;
}

export interface MealFoodItem {
  id: string;
  name: string;
  category: string;
  portionLabel: string;
  gram: number;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber: number;
  isCustom?: boolean;
}

export interface MealEntry {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack" | "bedtime";
  misuItems?: MealMisuItem[];
  foodItems?: MealFoodItem[];
  name: string;
  time: string;
  photoEmoji: string;
  /** Storage path in the private meal-photos bucket; null when the upload was
   * lost (a mid-flow reload) or the meal predates photo storage. */
  photoPath: string | null;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** 1-5 stars, deterministic 211-ratio score (not an AI guess) */
  misuScore: number;
  goodPoints: string[];
  improvePoints: string[];
  aiAdvice: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  avatar: string;
  planLength: PlanLength;
  currentDay: number;
  startDate: string;
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
  startWaist: number;
  currentWaist: number;
  height: number;
  age: number;
  gender: "female" | "male";
  phone: string;
  coachId: string;
  streakDays: number;
  todayCompletionRate: number;
  todayMisuScore: number;
  weightTrend: TrendPoint[];
  waistTrend: TrendPoint[];
  scoreTrend: TrendPoint[];
  nutritionTargets: NutritionTargets;
  nutritionToday: NutritionTargets & { water: number; waterTarget: number };
  tasks: DailyTask[];
  meals: MealEntry[];
  checkinRate: number;
  tags: string[];
  lastCheckIn: string;
  productStock: "ok" | "low" | "out";
}

export interface CoachProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;
  bio: string;
  phone: string;
  wechat: string;
  referralCode: string;
  totalCustomers: number;
  activeThisWeek: number;
  yearsExperience: number;
  rating: number;
  specialties: string[];
}

export interface AlertItem {
  id: string;
  customerId: string;
  customerName: string;
  avatar: string;
  type: "no-checkin" | "weight-stall" | "low-stock" | "low-score";
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  daysAgo: number;
}

export interface MessageThread {
  id: string;
  customerId: string;
  customerName: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
}
