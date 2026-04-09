import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  RefreshCw,
  Utensils,
  Save,
  Edit3,
  Trash2,
  Copy,
  Check,
  X,
  History,
  RotateCcw,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import WeeklyMealModal, { type SelectedMeal } from "@/components/WeeklyMealModal";
import { useNutrition } from "@/context/NutritionContext";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  dayName?: string;
  meals: Record<string, Meal>;
  totalCalories: number;
  totalProtein: number;
};

type WeeklyData = {
  days: DayPlan[];
  targetCalories?: number;
};

type SavedPlan = {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  mealCount: number;
  targetCalories: number;
  nutritionTargets: { calories: number; protein: number; carbs: number; fats: number };
  days: DayPlan[];
  createdAt: string;
  updatedAt: string;
};

type PlanSummary = Omit<SavedPlan, "days">;

type TabMode = "plan" | "history";

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Utility ───────────────────────────────────────────────────────────────────

const getUserId = (): string | null => {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  return JSON.parse(raw).id;
};

const formatDateRange = (start: string, end: string): string => {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en", opts)} – ${e.toLocaleDateString("en", opts)}`;
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function WeeklyPlan() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = getUserId();
  const { refreshNutrition } = useNutrition();

  // ── State ───────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabMode>("plan");
  const [unsavedPlan, setUnsavedPlan] = useState<WeeklyData | null>(null);
  const [activeDay, setActiveDay] = useState<string>("Monday");
  const [selectedMeal, setSelectedMeal] = useState<SelectedMeal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [mealCount, setMealCount] = useState<number>(() =>
    parseInt(localStorage.getItem("meal_count_pref") || "4", 10)
  );
  const [dirtyCount, setDirtyCount] = useState(false);
  const [regeneratingDay, setRegeneratingDay] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewingPlan, setViewingPlan] = useState<SavedPlan | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: activePlan,
    isLoading: loadingActive,
    refetch: refetchActive,
  } = useQuery<SavedPlan | null>({
    queryKey: ["mealPlan", "active"],
    queryFn: async () => {
      const res = await api.get("/api/meal-plans/active");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: planHistory,
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = useQuery<PlanSummary[]>({
    queryKey: ["mealPlan", "history"],
    queryFn: async () => {
      const res = await api.get("/api/meal-plans");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: tab === "history",
  });

  // Set active day when plan loads
  useEffect(() => {
    const plan = activePlan;
    if (plan?.days?.length && !unsavedPlan) {
      const firstName = plan.days[0].dayName || plan.days[0].day;
      if (firstName) setActiveDay(firstName);
    }
  }, [activePlan, unsavedPlan]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const generatePlan = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/api/meals/${userId}/weekly-plan?mealCount=${mealCount}`);
      return res.data as WeeklyData;
    },
    onSuccess: (data) => {
      setUnsavedPlan(data);
      if (data.days?.length > 0) {
        setActiveDay(data.days[0].day);
      }
      setDirtyCount(false);
      setEditMode(false);
      toast.success("Plan generated! Click Save to keep it.");
    },
    onError: () => toast.error("Failed to generate weekly plan"),
  });

  const savePlan = useMutation({
    mutationFn: async (planData: WeeklyData) => {
      const res = await api.post("/api/meal-plans", {
        days: planData.days,
        mealCount,
        targetCalories: planData.targetCalories,
        nutritionTargets: {
          calories: planData.targetCalories || 2500,
          protein: 180,
          carbs: 300,
          fats: 80,
        },
      });
      return res.data;
    },
    onSuccess: () => {
      setUnsavedPlan(null);
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
      toast.success("Meal plan saved!");
    },
    onError: () => toast.error("Failed to save meal plan"),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: DayPlan[] }) => {
      const res = await api.put(`/api/meal-plans/${id}`, { days });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
      toast.success("Plan updated");
    },
    onError: () => toast.error("Failed to update plan"),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/meal-plans/${id}`);
    },
    onSuccess: () => {
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
      toast.success("Meal plan deleted");
    },
    onError: () => toast.error("Failed to delete meal plan"),
  });

  const activatePlan = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/api/meal-plans/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
      setViewingPlan(null);
      setTab("plan");
      toast.success("Plan activated!");
    },
    onError: () => toast.error("Failed to activate plan"),
  });

  const logMeal = useMutation({
    mutationFn: async ({
      planId, mealName, mealType, calories, protein, carbs, fats,
    }: {
      planId: string;
      mealName: string;
      mealType: string;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    }) => {
      const res = await api.post(`/api/meal-plans/${planId}/log-meal`, {
        mealName, mealType, calories, protein, carbs, fats,
      });
      return res.data;
    },
    onSuccess: (data) => {
      refreshNutrition();
      toast.success(data.message || "Meal logged!");
    },
    onError: () => toast.error("Failed to log meal"),
  });

  const regenerateDay = useCallback(
    async (planId: string, dayName: string) => {
      setRegeneratingDay(dayName);
      try {
        await api.post(`/api/meal-plans/${planId}/regenerate-day`, { dayName });
        queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
        toast.success(`${dayName} regenerated!`);
      } catch {
        toast.error("Failed to regenerate day");
      } finally {
        setRegeneratingDay(null);
      }
    },
    [queryClient]
  );

  // ── Fetch full plan for history view ────────────────────────────────────────
  const viewFullPlan = useCallback(async (id: string) => {
    try {
      const res = await api.get(`/api/meal-plans/${id}`);
      setViewingPlan(res.data);
    } catch {
      toast.error("Failed to load plan");
    }
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  const currentPlan = unsavedPlan || (activePlan ? {
    days: activePlan.days.map(d => ({ ...d, day: d.dayName || d.day })),
    targetCalories: activePlan.targetCalories,
  } : null);

  const getDayData = () =>
    currentPlan?.days?.find((d) => (d.dayName || d.day) === activeDay);

  const removeMealFromDay = (dayName: string, mealType: string) => {
    if (!activePlan) return;

    const updatedDays = activePlan.days.map((d) => {
      if ((d.dayName || d.day) !== dayName) return d;
      const newMeals = { ...d.meals };
      delete newMeals[mealType];
      const totalCal = Object.values(newMeals).reduce((s, m: any) => s + (m?.calories || 0), 0);
      const totalProt = Object.values(newMeals).reduce((s, m: any) => s + (m?.protein || 0), 0);
      return { ...d, meals: newMeals, totalCalories: totalCal, totalProtein: totalProt };
    });

    updatePlan.mutate({ id: activePlan._id, days: updatedDays });
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2
            data-page-title-anchor
            className="text-3xl font-display font-bold text-foreground flex items-center gap-3"
          >
            <Calendar className="h-8 w-8 text-primary" />
            {t("weeklyMealMatrix")}
          </h2>
          <p className="text-muted-foreground mt-1">{t("weeklyPlanSubtitle")}</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-secondary/50 p-1 rounded-xl border border-white/5 gap-1">
          <button
            onClick={() => { setTab("plan"); setViewingPlan(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              tab === "plan"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <BookOpen className="h-4 w-4" /> Active Plan
          </button>
          <button
            onClick={() => { setTab("history"); refetchHistory(); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              tab === "history"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <History className="h-4 w-4" /> History
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: PLAN                                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "plan" && (
        <>
          {/* Preferences */}
          <div className="stat-card border-dashed">
            <h3 className="text-lg font-bold text-foreground mb-4">{t("mealPreferences")}</h3>
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("howManyMeals")}
                </span>
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
                  <span className="block text-xs font-bold text-primary mb-1 uppercase tracking-wider">
                    {t("includes")}
                  </span>
                  <span className="text-sm text-white/80 font-medium leading-relaxed">
                    {SLOT_PREVIEWS[mealCount]}
                  </span>
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

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => generatePlan.mutate()}
              disabled={generatePlan.isPending}
              className="gap-2 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all"
            >
              {generatePlan.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {currentPlan ? t("regenerateWeek") : "Generate Week"}
                </>
              )}
            </Button>

            {unsavedPlan && (
              <Button
                onClick={() => savePlan.mutate(unsavedPlan)}
                disabled={savePlan.isPending}
                className="gap-2 bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              >
                {savePlan.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Plan
              </Button>
            )}

            {activePlan && !unsavedPlan && (
              <Button
                variant="outline"
                onClick={() => setEditMode(!editMode)}
                className={`gap-2 transition-all ${
                  editMode
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {editMode ? <Check className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                {editMode ? "Done Editing" : "Edit Plan"}
              </Button>
            )}
          </div>

          {/* ── Plan Metadata Badge ──────────────────────────────────────────── */}
          {activePlan && !unsavedPlan && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full">
                {activePlan.name}
              </span>
              <span className="bg-secondary text-muted-foreground px-3 py-1.5 rounded-full">
                {formatDateRange(activePlan.startDate, activePlan.endDate)}
              </span>
              <span className="bg-secondary text-muted-foreground px-3 py-1.5 rounded-full">
                {activePlan.mealCount} meals/day
              </span>
            </div>
          )}

          {/* ── Loading ─────────────────────────────────────────────────────── */}
          {loadingActive && !currentPlan && (
            <div className="stat-card flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading meal plan...</p>
            </div>
          )}

          {/* ── Empty State ─────────────────────────────────────────────────── */}
          {!currentPlan && !generatePlan.isPending && !loadingActive && (
            <div className="stat-card flex flex-col items-center justify-center py-20 border-dashed border-2 text-center space-y-4">
              <Utensils className="h-16 w-16 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-bold text-foreground">No Plan Generated</h3>
              <p className="text-muted-foreground max-w-md">
                Generate a weekly plan to build a 7-day meal matrix tailored to your targets.
              </p>
            </div>
          )}

          {/* ── Generating Spinner ──────────────────────────────────────────── */}
          {generatePlan.isPending && (
            <div className="stat-card flex flex-col items-center justify-center py-32 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-foreground animate-pulse">
                  Running meal optimization...
                </h3>
                <p className="text-muted-foreground">This usually takes a few seconds.</p>
              </div>
            </div>
          )}

          {/* ── Unsaved Banner ──────────────────────────────────────────────── */}
          {unsavedPlan && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-xl text-sm font-medium">
              <Sparkles className="h-5 w-5 shrink-0" />
              <span className="flex-1">This plan hasn't been saved yet. Click <strong>Save Plan</strong> to keep it.</span>
              <button
                onClick={() => setUnsavedPlan(null)}
                className="text-yellow-500/60 hover:text-yellow-300 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Plan Content ────────────────────────────────────────────────── */}
          {currentPlan && !generatePlan.isPending && (
            <div className="space-y-6">
              {/* Day Tabs */}
              <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
                <div className="flex gap-2 min-w-max">
                  {DAYS.filter((day) =>
                    currentPlan.days.some((entry) => (entry.dayName || entry.day) === day)
                  ).map((day) => (
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

              {/* Day Content */}
              {getDayData() && (
                <div className="space-y-6 animate-fade-in">
                  {/* Day Stats Row */}
                  <div className="flex flex-wrap gap-4">
                    <div className="stat-card flex-1 min-w-[200px] border-primary/20 bg-primary/5">
                      <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
                        {t("dailyTotal")}
                      </div>
                      <div className="text-3xl font-bold font-display text-foreground">
                        {(() => {
                          const day = getDayData()!;
                          const sum = Object.values(day.meals).reduce(
                            (total, meal: any) => total + (meal?.calories || 0),
                            0
                          );
                          const target = currentPlan.targetCalories || 0;
                          return (
                            <span>
                              {sum}{" "}
                              <span className="text-lg text-muted-foreground">/ {target} kcal</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="stat-card flex-1 min-w-[200px]">
                      <div className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-1">
                        {t("totalProtein")}
                      </div>
                      <div className="text-3xl font-bold font-display text-foreground">
                        {getDayData()!.totalProtein}{" "}
                        <span className="text-lg text-muted-foreground">g</span>
                      </div>
                    </div>

                    {/* Edit: Regenerate Day button */}
                    {editMode && activePlan && (
                      <Button
                        variant="outline"
                        disabled={regeneratingDay === activeDay}
                        onClick={() => regenerateDay(activePlan._id, activeDay)}
                        className="gap-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 self-center"
                      >
                        {regeneratingDay === activeDay ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Regenerate {activeDay}
                      </Button>
                    )}
                  </div>

                  {/* Meal Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(getDayData()!.meals)
                      .filter(([, meal]) => Boolean(meal))
                      .map(([mealType, meal]) => {
                        const typedMeal = meal as Meal;
                        const planId = activePlan?._id;

                        return (
                          <div
                            key={mealType}
                            className="stat-card group hover:border-primary/50 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] ring-0 hover:ring-2 ring-primary/30 flex flex-col justify-between h-full relative overflow-hidden"
                          >
                            {/* Edit overlay: remove button */}
                            {editMode && (
                              <button
                                onClick={() => removeMealFromDay(activeDay, mealType)}
                                className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500/40 transition-colors"
                                title="Remove meal"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            <div
                              onClick={() =>
                                !editMode && setSelectedMeal({ ...typedMeal, mealType })
                              }
                              className={!editMode ? "cursor-pointer" : ""}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                                    {MEAL_ICONS[mealType] || mealType}
                                  </div>
                                  <h4 className="text-xl font-bold text-foreground font-display leading-tight">
                                    {typedMeal.name}
                                  </h4>
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

                              <div className="space-y-2 mb-4">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {t("ingredients")}
                                </span>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-muted-foreground">
                                  {typedMeal.foods?.slice(0, 6).map((food, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                                      <span className="truncate" title={food}>
                                        {food
                                          .replace(
                                            /(?:[-–(]\s*)?~?\d+\s*k?cal(?:ies)?\s*\)?/gi,
                                            ""
                                          )
                                          .trim()}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Bottom Actions */}
                            <div className="flex gap-2 mt-auto pt-2">
                              {planId && !unsavedPlan && (
                                <Button
                                  variant="outline"
                                  className="flex-1 gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    logMeal.mutate({
                                      planId,
                                      mealName: typedMeal.name,
                                      mealType,
                                      calories: typedMeal.calories,
                                      protein: typedMeal.protein,
                                      carbs: typedMeal.carbs,
                                      fats: typedMeal.fats,
                                    });
                                  }}
                                  disabled={logMeal.isPending}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  {t("addToTodaysLog")}
                                </Button>
                              )}

                              {!editMode && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-primary shrink-0"
                                  onClick={() => setSelectedMeal({ ...typedMeal, mealType })}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: HISTORY                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "history" && !viewingPlan && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Meal Plan History
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                All your saved meal plans
              </p>
            </div>
          </div>

          {loadingHistory && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}

          {!loadingHistory && (!planHistory || planHistory.length === 0) && (
            <div className="stat-card flex flex-col items-center justify-center py-20 border-dashed border-2 text-center space-y-4">
              <History className="h-16 w-16 text-muted-foreground opacity-30" />
              <h3 className="text-xl font-bold text-foreground">No Saved Plans</h3>
              <p className="text-muted-foreground max-w-md">
                Generate and save a meal plan to see it here.
              </p>
              <Button onClick={() => setTab("plan")} className="gap-2">
                <Sparkles className="h-4 w-4" /> Go Generate
              </Button>
            </div>
          )}

          {planHistory && planHistory.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planHistory.map((plan) => (
                <div
                  key={plan._id}
                  className={`stat-card group transition-all duration-300 hover:scale-[1.01] relative overflow-hidden ${
                    plan.isActive
                      ? "border-primary/40 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                      : "hover:border-border"
                  }`}
                >
                  {plan.isActive && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-primary/30">
                        Active
                      </span>
                    </div>
                  )}

                  <h4 className="text-lg font-bold text-foreground font-display mb-1 pr-16">
                    {plan.name}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {formatDateRange(plan.startDate, plan.endDate)}
                  </p>

                  <div className="flex gap-3 text-xs font-medium text-muted-foreground mb-4">
                    <span className="bg-secondary px-2 py-1 rounded">
                      {plan.mealCount} meals/day
                    </span>
                    <span className="bg-secondary px-2 py-1 rounded">
                      {plan.targetCalories} kcal
                    </span>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => viewFullPlan(plan._id)}
                    >
                      <BookOpen className="h-3.5 w-3.5" /> View
                    </Button>

                    {!plan.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => activatePlan.mutate(plan._id)}
                        disabled={activatePlan.isPending}
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Activate
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-500/10 px-2"
                      onClick={() => setDeleteConfirmId(plan._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── History: View Full Plan ─────────────────────────────────────────── */}
      {tab === "history" && viewingPlan && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewingPlan(null)}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h3 className="text-xl font-bold text-foreground">{viewingPlan.name}</h3>
              <p className="text-sm text-muted-foreground">
                {formatDateRange(viewingPlan.startDate, viewingPlan.endDate)}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {!viewingPlan.isActive && (
                <Button
                  onClick={() => activatePlan.mutate(viewingPlan._id)}
                  disabled={activatePlan.isPending}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" /> Set as Active
                </Button>
              )}
            </div>
          </div>

          {/* Day Tabs for viewed plan */}
          <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
            <div className="flex gap-2 min-w-max">
              {viewingPlan.days.map((d) => {
                const dn = d.dayName || d.day;
                return (
                  <button
                    key={dn}
                    onClick={() => setActiveDay(dn!)}
                    className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 border ${
                      activeDay === dn
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_20px_rgba(34,211,238,0.2)]"
                        : "bg-secondary border-border/50 text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {dn}
                  </button>
                );
              })}
            </div>
          </div>

          {(() => {
            const vDay = viewingPlan.days.find(
              (d) => (d.dayName || d.day) === activeDay
            );
            if (!vDay) return null;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(vDay.meals)
                  .filter(([, meal]) => Boolean(meal))
                  .map(([mealType, meal]) => {
                    const m = meal as Meal;
                    return (
                      <div key={mealType} className="stat-card">
                        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                          {MEAL_ICONS[mealType] || mealType}
                        </div>
                        <h4 className="text-lg font-bold text-foreground mb-3">{m.name}</h4>
                        <div className="flex gap-4 text-sm font-medium bg-secondary/50 p-3 rounded-xl flex-wrap mb-3">
                          <div className="flex items-center gap-1 text-foreground">
                            <Flame className="h-4 w-4 text-red-400" />
                            {m.calories} kcal
                          </div>
                          <div className="text-blue-400">{m.protein}g P</div>
                          <div className="text-yellow-400">{m.carbs}g C</div>
                          <div className="text-purple-400">{m.fats}g F</div>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {m.foods?.slice(0, 5).map((f, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="absolute inset-0"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-foreground mb-2">Delete Meal Plan?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone. This meal plan will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => deletePlan.mutate(deleteConfirmId)}
                disabled={deletePlan.isPending}
              >
                {deletePlan.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Meal Detail Modal ──────────────────────────────────────────────── */}
      {selectedMeal && (
        <WeeklyMealModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
      )}
    </div>
  );
}
