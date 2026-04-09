import Dexie, { type Table } from "dexie";

export interface OfflineFoodItem {
  _id?: string;
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealType: string;
}

export interface FoodLibraryEntry {
  _id?: string;
  name: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize?: {
    amount: number;
    unit: string;
  };
  externalId?: string;
  addedAt?: string;
}

export interface OfflineFoodPayload {
  food: OfflineFoodItem;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  foodLibraryEntry?: FoodLibraryEntry;
}

export interface OfflineFoodRecord extends OfflineFoodPayload {
  id: string;
  userId: string;
  diaryDate: string;
  createdAt: string;
  synced: boolean;
  syncError?: string | null;
}

export interface CachedFoodLibraryRecord extends FoodLibraryEntry {
  id?: number;
  userId: string;
  cachedAt: string;
}

export interface NutritionSnapshot {
  userId: string;
  date: string;
  foods: OfflineFoodItem[];
  intake: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyWater: number;
  currentStreak: number;
  updatedAt: string;
}

class FitFuelDB extends Dexie {
  offlineFoods!: Table<OfflineFoodRecord, string>;
  recentFoods!: Table<CachedFoodLibraryRecord, number>;
  favoriteFoods!: Table<CachedFoodLibraryRecord, number>;
  dailySnapshots!: Table<NutritionSnapshot, [string, string]>;

  constructor() {
    super("FitFuelDB");

    this.version(1).stores({
      offlineFoods: "&id, userId, synced, createdAt, diaryDate",
      recentFoods: "++id, userId, name, cachedAt",
      favoriteFoods: "++id, userId, name, cachedAt",
      dailySnapshots: "&[userId+date], userId, date, updatedAt",
    });
  }
}

export const db = new FitFuelDB();
