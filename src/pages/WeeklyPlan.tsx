import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Calendar, ChevronRight, Clock, Flame, Loader2, RefreshCw, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import WeeklyMealModal, { type SelectedMeal } from "@/components/WeeklyMealModal";

type Meal = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prepTime: string;
  foods: string[];
};

type DayPlan = {
  day: string;
  meals: Record<string, Meal>;
  totalCalories: number;
  totalProtein: number;
};

type WeeklyData = {
  days: DayPlan[];
  targetCalories?: number;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SLOT_PREVIEWS: Record<number, string> = {
  2: "Lunch, Dinner",
  3: "Breakfast, Lunch, Dinner",
  4: "Breakfast, Lunch, Dinner, Snack",
  5: "Breakfast, Morning Snack, Lunch, Dinner, Evening Snack",
  6: "Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner, Late Snack",
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  morning_snack: "☕ Morning Snack",
  lunch: "☀️ Lunch",
  afternoon_snack: "🍎 Afternoon Snack",
  dinner: "🌙 Dinner",
  evening_snack: "🌆 Evening Snack",
  snack: "🍎 Snack",
  late_snack: "🌙 Late Snack",
  pre_workout: "⚡ Pre-Workout",
  post_workout: "💪 Post-Workout",
};

const DAY_TRANSLATION_KEYS: Record<string, string> = {
  Monday: "monday",
  Tuesday: "tuesday",
  Wednesday: "wednesday",
  Thursday: "thursday",
  Friday: "friday",
  Saturday: "saturday",
  Sunday: "sunday",
};

export default function WeeklyPlan() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = localStorage.getItem("user");
  const userId = user ? JSON.parse(user).id : null;

  const [plan, setPlan] = useState<WeeklyData | null>(null);
  const [activeDay, setActiveDay] = useState<string>("Monday");
  const [selectedMeal, setSelectedMeal] = useState<SelectedMeal | null>(null);
  const [mealCount, setMealCount] = useState<number>(() => parseInt(localStorage.getItem("meal_count_pref") || "4", 10));
  const [dirtyCount, setDirtyCount] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`weekly_plan_${userId}`);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as WeeklyData;
      if (parsed?.days?.length) {
        setPlan(parsed);
        setActiveDay(parsed.days[0].day);
      }
    } catch {
      // ignore invalid local cache
    }
  }, [userId]);

  const generatePlan = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/api/meals/${userId}/weekly-plan?mealCount=${mealCount}`);
      return res.data as WeeklyData;
    },
    onSuccess: (data) => {
      setPlan(data);
      if (data.days?.length > 0) {
        setActiveDay(data.days[0].day);
      }
      localStorage.setItem(`weekly_plan_${userId}`, JSON.stringify(data));
      setDirtyCount(false);
      toast.success("Active plan generated");
    },
    onError: () => toast.error("Failed to generate weekly plan"),
  });

  const addMealToToday = useMutation({
    mutationFn: async ({ meal, type }: { meal: Meal; type: string }) => {
      const foodItem = {
        name: meal.name,
        quantity: 1,
        unit: "serving",
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        mealType: type,
      };

      await api.put(`/api/profile/${userId}/intake`, {
        food: foodItem,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Meal logged to today's intake");
    },
    onError: () => toast.error("Failed to add meal"),
  });

  const getDayData = () => plan?.days?.find((day) => day.day === activeDay);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      <div className="stat-card border-dashed">
        <h3 className="text-lg font-bold text-foreground mb-4">{t("mealPreferences")}</h3>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("howManyMeals")}</span>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    setMealCount(count);
                    setDirtyCount(true);
                    localStorage.setItem("meal_count_pref", count.toString());
                  }}
                  className={`h-10 w-10 flex items-center justify-center rounded-xl font-bold transition-all ${
                    mealCount === count
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(34,211,238,0.4)] scale-110"
                      : "bg-secondary text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-secondary/50 p-4 rounded-xl border border-white/5">
              <span className="block text-xs font-bold text-primary mb-1 uppercase tracking-wider">{t("includes")}</span>
              <span className="text-sm text-white/80 font-medium leading-relaxed">{SLOT_PREVIEWS[mealCount]}</span>
            </div>
          </div>
        </div>

        {dirtyCount && (
          <div className="mt-4 text-sm text-yellow-400 flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Click generate to apply your new meal preferences
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            {t("weeklyMealMatrix")}
          </h2>
          <p className="text-muted-foreground mt-1">{t("weeklyPlanSubtitle")}</p>
        </div>

        <Button
          onClick={() => generatePlan.mutate()}
          disabled={generatePlan.isPending}
          className="gap-2 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all"
        >
          {generatePlan.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              Compiling...
            </>
          ) : (
            <>
              {plan ? <RefreshCw className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
              {plan ? t("regenerateWeek") : "Generate Week"}
            </>
          )}
        </Button>
      </div>

      {!plan && !generatePlan.isPending && (
        <div className="stat-card flex flex-col items-center justify-center py-20 border-dashed border-2 text-center space-y-4">
          <Utensils className="h-16 w-16 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-bold text-foreground">No Plan Generated</h3>
          <p className="text-muted-foreground max-w-md">Generate a weekly plan to build a 7-day meal matrix tailored to your targets.</p>
        </div>
      )}

      {generatePlan.isPending && (
        <div className="stat-card flex flex-col items-center justify-center py-32 space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-foreground animate-pulse">Running meal optimization...</h3>
            <p className="text-muted-foreground">This usually takes a few seconds.</p>
          </div>
        </div>
      )}

      {plan && !generatePlan.isPending && (
        <div className="space-y-6">
          <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
            <div className="flex gap-2 min-w-max">
              {DAYS.filter((day) => plan.days.some((entry) => entry.day === day)).map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 border ${
                    activeDay === day
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_20px_rgba(34,211,238,0.2)] scale-105"
                      : "bg-secondary border-border/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground hover:border-border"
                  }`}
                >
                  {t(DAY_TRANSLATION_KEYS[day] || day)}
                </button>
              ))}
            </div>
          </div>

          {getDayData() && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap gap-4">
                <div className="stat-card flex-1 min-w-[200px] border-primary/20 bg-primary/5">
                  <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">{t("dailyTotal")}</div>
                  <div className="text-3xl font-bold font-display text-foreground">
                    {(() => {
                      const day = getDayData()!;
                      const sum = Object.values(day.meals).reduce((total, meal) => total + (meal?.calories || 0), 0);
                      const target = plan.targetCalories || 0;
                      return (
                        <span>
                          {sum} <span className="text-lg text-muted-foreground">/ {target} kcal</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="stat-card flex-1 min-w-[200px]">
                  <div className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-1">{t("totalProtein")}</div>
                  <div className="text-3xl font-bold font-display text-foreground">
                    {getDayData()!.totalProtein} <span className="text-lg text-muted-foreground">g</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(getDayData()!.meals)
                  .filter(([, meal]) => Boolean(meal))
                  .map(([mealType, meal]) => {
                    const typedMeal = meal as Meal;

                    return (
                      <div
                        key={mealType}
                        onClick={() => setSelectedMeal({ ...typedMeal, mealType })}
                        className="stat-card group hover:border-primary/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] ring-0 hover:ring-2 ring-primary/30 flex flex-col justify-between h-full relative overflow-hidden"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">{MEAL_ICONS[mealType] || mealType}</div>
                              <h4 className="text-xl font-bold text-foreground font-display leading-tight">{typedMeal.name}</h4>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                              <Clock className="h-3 w-3" />
                              {typedMeal.prepTime}
                            </div>
                          </div>

                          <div className="flex gap-4 mb-4 text-sm font-medium bg-secondary/50 p-3 rounded-xl flex-wrap">
                            <div className="flex items-center gap-1 text-foreground">
                              <Flame className="h-4 w-4 text-red-400" />
                              {typedMeal.calories} kcal
                            </div>
                            <div className="text-blue-400">{typedMeal.protein}g P</div>
                            <div className="text-yellow-400">{typedMeal.carbs}g C</div>
                            <div className="text-purple-400">{typedMeal.fats}g F</div>
                          </div>

                          <div className="space-y-2 mb-10">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("ingredients")}</span>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-muted-foreground">
                              {typedMeal.foods.map((food, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                                  <span className="truncate" title={food}>
                                    {food.replace(/(?:[-–(]\s*)?~?\d+\s*k?cal(?:ies)?\s*\)?/gi, "").trim()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="absolute pl-4 pb-4 bottom-0 right-4 flex justify-end w-full bg-gradient-to-t from-card via-card/80 to-transparent">
                          <span className="text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300 flex items-center">
                            View Recipe <ChevronRight className="h-4 w-4 ml-1" />
                          </span>
                        </div>

                        <div className="px-4 pb-4">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={(event) => {
                              event.stopPropagation();
                              addMealToToday.mutate({ meal: typedMeal, type: mealType });
                            }}
                            disabled={addMealToToday.isPending}
                          >
                            {t("addToTodaysLog")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedMeal && <WeeklyMealModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />}
    </div>
  );
}
