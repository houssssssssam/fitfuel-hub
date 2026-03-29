import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FoodItem {
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

interface Intake {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface NutritionContextValue {
  foods: FoodItem[];
  intake: Intake;
  targets: Targets;
  dailyWater: number;
  currentStreak: number;
  loading: boolean;
  addFood: (payload: { food: FoodItem; calories: number; protein: number; carbs: number; fats: number }) => Promise<void>;
  removeFood: (foodId: string) => Promise<void>;
  refreshNutrition: () => Promise<void>;
  updateWater: (amount: number) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const NutritionContext = createContext<NutritionContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export const NutritionProvider = ({ children }: { children: ReactNode }) => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [intake, setIntake] = useState<Intake>({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [targets, setTargets] = useState<Targets>({ calories: 2500, protein: 180, carbs: 300, fats: 80 });
  const [dailyWater, setDailyWater] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const getUserId = (): string | null => {
    const user = localStorage.getItem("user");
    if (!user) return null;
    return JSON.parse(user).id;
  };

  const refreshNutrition = useCallback(async () => {
    const id = getUserId();
    if (!id) return;
    try {
      const res = await api.get(`/api/profile/${id}`);
      setIntake(res.data.dailyIntake ?? { calories: 0, protein: 0, carbs: 0, fats: 0 });
      setFoods(res.data.foods ?? []);
      setTargets(res.data.nutritionTargets ?? { calories: 2500, protein: 180, carbs: 300, fats: 80 });
      setDailyWater(res.data.dailyWater || 0);
      setCurrentStreak(res.data.currentStreak || 0);
    } catch (err) {
      console.error("Failed to refresh nutrition", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    refreshNutrition().finally(() => setLoading(false));
  }, [refreshNutrition]);

  // ── Add food ────────────────────────────────────────────────────────────────
  const addFood = useCallback(async (payload: { food: FoodItem; calories: number; protein: number; carbs: number; fats: number }) => {
    const id = getUserId();
    if (!id) return;
    try {
      const res = await api.put(`/api/profile/${id}/intake`, payload);
      setFoods(res.data.foods ?? []);
      setIntake(res.data.dailyIntake);
      setCurrentStreak(res.data.currentStreak || 0);
    } catch (err) {
      console.error("Failed to add food", err);
    }
  }, []);

  // ── Remove food ─────────────────────────────────────────────────────────────
  const removeFood = useCallback(async (foodId: string) => {
    const id = getUserId();
    if (!id) return;

    // Optimistic update
    const prevFoods = foods;
    const prevIntake = intake;
    setFoods((prev) => prev.filter((f) => (f._id ?? f.id) !== foodId));

    try {
      const res = await api.delete(`/api/profile/${id}/food/${foodId}`);
      // Sync with the authoritative server response
      setFoods(res.data.foods ?? []);
      setIntake(res.data.dailyIntake);
    } catch (err) {
      console.error("Failed to delete food", err);
      // Rollback on failure
      setFoods(prevFoods);
      setIntake(prevIntake);
    }
  }, [foods, intake]);

  // ── Update Water ────────────────────────────────────────────────────────────
  const updateWater = useCallback(async (amount: number) => {
    const id = getUserId();
    if (!id) return;
    try {
      const res = await api.put(`/api/profile/${id}/water`, { amount });
      setDailyWater(res.data.dailyWater);
    } catch (err) {
      console.error("Failed to update water", err);
    }
  }, []);

  return (
    <NutritionContext.Provider value={{ foods, intake, targets, dailyWater, currentStreak, loading, addFood, removeFood, refreshNutrition, updateWater }}>
      {children}
    </NutritionContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useNutrition = (): NutritionContextValue => {
  const ctx = useContext(NutritionContext);
  if (!ctx) throw new Error("useNutrition must be used inside <NutritionProvider>");
  return ctx;
};
