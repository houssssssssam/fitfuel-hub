import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";
import { syncService } from "@/lib/syncService";

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

interface FoodLibraryEntryPayload {
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

type AddFoodResult = {
  mode: "online" | "offline";
};

interface NutritionContextValue {
  foods: FoodItem[];
  intake: Intake;
  targets: Targets;
  dailyWater: number;
  currentStreak: number;
  loading: boolean;
  addFood: (payload: {
    food: FoodItem;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    foodLibraryEntry?: FoodLibraryEntryPayload;
  }) => Promise<AddFoodResult>;
  removeFood: (foodId: string) => Promise<void>;
  refreshNutrition: () => Promise<void>;
  updateWater: (amount: number) => Promise<void>;
}

const NutritionContext = createContext<NutritionContextValue | null>(null);

const DEFAULT_INTAKE: Intake = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
};

const DEFAULT_TARGETS: Targets = {
  calories: 2500,
  protein: 180,
  carbs: 300,
  fats: 80,
};

const sumIntakeFromFoods = (foods: FoodItem[]): Intake =>
  foods.reduce(
    (totals, food) => ({
      calories: totals.calories + (food.calories || 0),
      protein: totals.protein + (food.protein || 0),
      carbs: totals.carbs + (food.carbs || 0),
      fats: totals.fats + (food.fats || 0),
    }),
    { ...DEFAULT_INTAKE },
  );

export const NutritionProvider = ({ children }: { children: ReactNode }) => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [intake, setIntake] = useState<Intake>({ ...DEFAULT_INTAKE });
  const [targets, setTargets] = useState<Targets>({ ...DEFAULT_TARGETS });
  const [dailyWater, setDailyWater] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const getUserId = () => {
    const user = localStorage.getItem("user");
    if (!user) return null;
    return JSON.parse(user).id as string;
  };

  const cacheTodaySnapshot = useCallback(async (nextState: {
    foods: FoodItem[];
    intake: Intake;
    targets: Targets;
    dailyWater: number;
    currentStreak: number;
  }) => {
    await syncService.cacheTodaySnapshot(nextState);
  }, []);

  const refreshNutrition = useCallback(async () => {
    const id = getUserId();
    if (!id) return;

    try {
      const res = await api.get(`/api/profile/${id}`);

      const nextFoods = res.data.foods ?? [];
      const nextIntake = res.data.dailyIntake ?? { ...DEFAULT_INTAKE };
      const nextTargets = res.data.nutritionTargets ?? { ...DEFAULT_TARGETS };
      const nextDailyWater = res.data.dailyWater || 0;
      const nextCurrentStreak = res.data.currentStreak || 0;

      setFoods(nextFoods);
      setIntake(nextIntake);
      setTargets(nextTargets);
      setDailyWater(nextDailyWater);
      setCurrentStreak(nextCurrentStreak);

      await cacheTodaySnapshot({
        foods: nextFoods,
        intake: nextIntake,
        targets: nextTargets,
        dailyWater: nextDailyWater,
        currentStreak: nextCurrentStreak,
      });
    } catch (error) {
      const cachedSnapshot = await syncService.getTodaySnapshot(id);

      if (cachedSnapshot) {
        setFoods(cachedSnapshot.foods ?? []);
        setIntake(cachedSnapshot.intake ?? { ...DEFAULT_INTAKE });
        setTargets(cachedSnapshot.targets ?? { ...DEFAULT_TARGETS });
        setDailyWater(cachedSnapshot.dailyWater || 0);
        setCurrentStreak(cachedSnapshot.currentStreak || 0);
        return;
      }

      console.error("Failed to refresh nutrition", error);
    }
  }, [cacheTodaySnapshot]);

  useEffect(() => {
    setLoading(true);
    refreshNutrition().finally(() => setLoading(false));
  }, [refreshNutrition]);

  useEffect(() => {
    const handleOfflineSync = () => {
      void refreshNutrition();
    };

    window.addEventListener(syncService.getSyncCompletedEventName(), handleOfflineSync);
    return () => window.removeEventListener(syncService.getSyncCompletedEventName(), handleOfflineSync);
  }, [refreshNutrition]);

  const addFood = useCallback(async (payload: {
    food: FoodItem;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    foodLibraryEntry?: FoodLibraryEntryPayload;
  }) => {
    const id = getUserId();
    if (!id) return { mode: "online" as const };

    const saveOffline = async (): Promise<AddFoodResult> => {
      const queuedFood = await syncService.addOfflineFood(payload);
      const nextFoods = [...foods, queuedFood.food];
      const nextIntake = {
        calories: intake.calories + Number(payload.calories || 0),
        protein: intake.protein + Number(payload.protein || 0),
        carbs: intake.carbs + Number(payload.carbs || 0),
        fats: intake.fats + Number(payload.fats || 0),
      };
      const nextCurrentStreak = currentStreak > 0 ? currentStreak : 1;

      setFoods(nextFoods);
      setIntake(nextIntake);
      setCurrentStreak(nextCurrentStreak);

      await cacheTodaySnapshot({
        foods: nextFoods,
        intake: nextIntake,
        targets,
        dailyWater,
        currentStreak: nextCurrentStreak,
      });

      return { mode: "offline" };
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return saveOffline();
    }

    try {
      const res = await api.put(`/api/profile/${id}/intake`, payload);

      const nextFoods = res.data.foods ?? [];
      const nextIntake = res.data.dailyIntake ?? { ...DEFAULT_INTAKE };
      const nextCurrentStreak = res.data.currentStreak || 0;

      setFoods(nextFoods);
      setIntake(nextIntake);
      setCurrentStreak(nextCurrentStreak);

      if (res.data.recentFoods) {
        await syncService.cacheRecentFoods(res.data.recentFoods, id);
      }

      await cacheTodaySnapshot({
        foods: nextFoods,
        intake: nextIntake,
        targets,
        dailyWater,
        currentStreak: nextCurrentStreak,
      });

      return { mode: "online" };
    } catch (error) {
      console.error("Failed to add food online, saving offline instead", error);
      return saveOffline();
    }
  }, [cacheTodaySnapshot, currentStreak, dailyWater, foods, intake, targets]);

  const removeFood = useCallback(async (foodId: string) => {
    const id = getUserId();
    if (!id) return;

    if (foodId.startsWith("offline:")) {
      const nextFoods = foods.filter((food) => (food._id ?? food.id) !== foodId);
      const nextIntake = sumIntakeFromFoods(nextFoods);

      await syncService.removeOfflineFood(foodId);
      setFoods(nextFoods);
      setIntake(nextIntake);

      await cacheTodaySnapshot({
        foods: nextFoods,
        intake: nextIntake,
        targets,
        dailyWater,
        currentStreak,
      });
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.error("Cannot remove synced foods while offline");
      return;
    }

    const previousFoods = foods;
    const previousIntake = intake;
    setFoods((currentFoods) => currentFoods.filter((food) => (food._id ?? food.id) !== foodId));

    try {
      const res = await api.delete(`/api/profile/${id}/food/${foodId}`);
      const nextFoods = res.data.foods ?? [];
      const nextIntake = res.data.dailyIntake ?? { ...DEFAULT_INTAKE };

      setFoods(nextFoods);
      setIntake(nextIntake);

      await cacheTodaySnapshot({
        foods: nextFoods,
        intake: nextIntake,
        targets,
        dailyWater,
        currentStreak,
      });
    } catch (error) {
      console.error("Failed to delete food", error);
      setFoods(previousFoods);
      setIntake(previousIntake);
    }
  }, [cacheTodaySnapshot, currentStreak, dailyWater, foods, intake, targets]);

  const updateWater = useCallback(async (amount: number) => {
    const id = getUserId();
    if (!id) return;

    try {
      const res = await api.put(`/api/profile/${id}/water`, { amount });
      setDailyWater(res.data.dailyWater);

      await cacheTodaySnapshot({
        foods,
        intake,
        targets,
        dailyWater: res.data.dailyWater,
        currentStreak,
      });
    } catch (error) {
      console.error("Failed to update water", error);
    }
  }, [cacheTodaySnapshot, currentStreak, foods, intake, targets]);

  return (
    <NutritionContext.Provider
      value={{
        foods,
        intake,
        targets,
        dailyWater,
        currentStreak,
        loading,
        addFood,
        removeFood,
        refreshNutrition,
        updateWater,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
};

export const useNutrition = (): NutritionContextValue => {
  const ctx = useContext(NutritionContext);
  if (!ctx) throw new Error("useNutrition must be used inside <NutritionProvider>");
  return ctx;
};
