import { api } from "@/lib/api";
import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Apple, Search, Zap, Dumbbell, Coffee, CupSoda, UtensilsCrossed, X, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProgressBar from "@/components/dashboard/ProgressBar";
import { useNutrition, type FoodItem } from "@/context/NutritionContext";
import { useTranslation } from "react-i18next";

interface FoodSearchResult {
  _id: string;
  name: string;
  servingSize: { amount: number; unit: string };
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

type AIFoodLogEventDetail = {
  foodLogged?: FoodItem | null;
  updatedIntake?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
};

type MealOption = {
  id: string;
  label: string;
  iconNode: ReactNode;
  isCustom?: boolean;
  isAuto?: boolean;
};

const REMOVED_MEAL_SECTIONS_KEY = "removedMealSections";

const getUnitOptions = (foodName: string): string[] => {
  const name = foodName.toLowerCase();
  if (!name) return ["g", "kg", "ml", "L", "oz", "tbsp", "tsp", "piece"];
  if (/(milk|juice|water|drink|smoothie|shake|tea|coffee|soup|broth|beverage)/i.test(name)) {
    return ["ml", "L", "fl oz"];
  }
  if (/(oil|butter|ghee|cream|sauce|dressing|syrup|honey|jam|vinegar|mayo)/i.test(name)) {
    return ["tbsp", "tsp", "ml", "g"];
  }
  if (/(egg)/i.test(name)) return ["piece", "g"];
  if (/(yogurt|cottage cheese|hummus|peanut butter|almond butter)/i.test(name)) {
    return ["g", "tbsp", "cup"];
  }
  if (/(rice|oat|cereal|granola|flour|powder|protein powder)/i.test(name)) {
    return ["g", "cup", "tbsp"];
  }
  return ["g", "kg", "oz"];
};

const toGrams = (quantity: number, unit: string, foodName: string): number => {
  switch (unit) {
    case "kg":
      return quantity * 1000;
    case "oz":
      return quantity * 28.35;
    case "L":
      return quantity * 1000;
    case "fl oz":
      return quantity * 29.57;
    case "tbsp":
      return quantity * 15;
    case "tsp":
      return quantity * 5;
    case "cup":
      return quantity * 240;
    case "piece": {
      const name = foodName.toLowerCase();
      if (name.includes("egg")) return quantity * 50;
      if (name.includes("banana")) return quantity * 120;
      if (name.includes("apple")) return quantity * 180;
      if (name.includes("orange")) return quantity * 150;
      return quantity * 100;
    }
    default:
      return quantity;
  }
};

const getRemovedMealSections = (): string[] => {
  try {
    const stored = localStorage.getItem(REMOVED_MEAL_SECTIONS_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
};

const setRemovedMealSections = (sections: string[]) => {
  if (sections.length === 0) {
    localStorage.removeItem(REMOVED_MEAL_SECTIONS_KEY);
    return;
  }
  localStorage.setItem(REMOVED_MEAL_SECTIONS_KEY, JSON.stringify(sections));
};

const clearRemovedMealSection = (mealId: string) => {
  setRemovedMealSections(getRemovedMealSections().filter((section) => section !== mealId));
};

const rememberRemovedMealSection = (mealId: string) => {
  const removedSections = getRemovedMealSections();
  if (removedSections.includes(mealId)) return;
  setRemovedMealSections([...removedSections, mealId]);
};

const getDefaultMealByTime = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 12) return "morning_snack";
  if (hour >= 12 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "afternoon_snack";
  if (hour >= 18 && hour < 21) return "dinner";
  return "snacks";
};

const getInitialMealType = () => {
  const mealType = getDefaultMealByTime();
  return getRemovedMealSections().includes(mealType) ? "snacks" : mealType;
};

const DEFAULT_MEALS: MealOption[] = [
  { id: "breakfast", label: "Breakfast", iconNode: <span>🌅</span> },
  { id: "lunch", label: "Lunch", iconNode: <span>☀️</span> },
  { id: "dinner", label: "Dinner", iconNode: <span>🌙</span> },
  { id: "snacks", label: "Snacks", iconNode: <span>🍎</span> },
];

const PRESET_MEALS: MealOption[] = [
  { id: "pre_workout", label: "Pre-Workout", iconNode: <Zap className="h-5 w-5 text-yellow-400" />, isCustom: true },
  { id: "post_workout", label: "Post-Workout", iconNode: <Dumbbell className="h-5 w-5 text-green-400" />, isCustom: true },
  { id: "late_night_snack", label: "Late Night Snack", iconNode: <Moon className="h-5 w-5 text-purple-400" />, isCustom: true },
  { id: "morning_snack", label: "Morning Snack", iconNode: <Coffee className="h-5 w-5 text-orange-400" />, isCustom: true },
  { id: "afternoon_tea", label: "Afternoon Tea", iconNode: <CupSoda className="h-5 w-5 text-teal-400" />, isCustom: true },
];

const AUTO_MEAL_META: Record<string, Omit<MealOption, "id">> = {
  morning_snack: { label: "Morning Snack", iconNode: <Coffee className="h-5 w-5 text-orange-400" />, isCustom: true, isAuto: true },
  afternoon_snack: { label: "Afternoon Snack", iconNode: <Apple className="h-5 w-5 text-red-400" />, isCustom: true, isAuto: true },
  evening_snack: { label: "Evening Snack", iconNode: <CupSoda className="h-5 w-5 text-purple-400" />, isCustom: true, isAuto: true },
  late_snack: { label: "Late Snack", iconNode: <Moon className="h-5 w-5 text-indigo-400" />, isCustom: true, isAuto: true },
  pre_workout: { label: "Pre-Workout", iconNode: <Zap className="h-5 w-5 text-yellow-400" />, isCustom: true, isAuto: true },
  post_workout: { label: "Post-Workout", iconNode: <Dumbbell className="h-5 w-5 text-green-400" />, isCustom: true, isAuto: true },
  late_night_snack: { label: "Late Night Snack", iconNode: <Moon className="h-5 w-5 text-purple-400" />, isCustom: true, isAuto: true },
};

const FoodTracking = () => {
  const { t } = useTranslation();
  const { foods, intake, targets, addFood, removeFood, refreshNutrition } = useNutrition();
  const location = useLocation();

  const [newFood, setNewFood] = useState({ name: "", quantity: "", mealType: getInitialMealType() });
  const [selectedUnit, setSelectedUnit] = useState("g");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customMeals, setCustomMeals] = useState<MealOption[]>([]);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [customMealName, setCustomMealName] = useState("");
  const [customMealPreset, setCustomMealPreset] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    void refreshNutrition();
  }, [location.pathname, refreshNutrition]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshNutrition();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshNutrition]);

  useEffect(() => {
    const handleAIFoodLog = (event: Event) => {
      const customEvent = event as CustomEvent<AIFoodLogEventDetail>;
      if (!customEvent.detail?.foodLogged) return;

      void refreshNutrition().then(() => {
        toast.success("FuelBot logged a food for you!", {
          description: "Check your food log below",
        });
      });
    };

    window.addEventListener("foodLoggedByAI", handleAIFoodLog);
    return () => window.removeEventListener("foodLoggedByAI", handleAIFoodLog);
  }, [refreshNutrition]);

  useEffect(() => {
    if (foods.length === 0) {
      localStorage.removeItem(REMOVED_MEAL_SECTIONS_KEY);
    }
  }, [foods]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  useEffect(() => {
    const defaultMealIds = DEFAULT_MEALS.map((meal) => meal.id);
    const removedSections = getRemovedMealSections();
    const extraMealTypes = [...new Set(foods.map((food) => food.mealType))].filter(
      (mealType): mealType is string =>
        Boolean(mealType) && !defaultMealIds.includes(mealType) && !removedSections.includes(mealType),
    );

    const autoSections = extraMealTypes.map((mealType) => ({
      id: mealType,
      label: AUTO_MEAL_META[mealType]?.label || mealType.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      iconNode: AUTO_MEAL_META[mealType]?.iconNode || <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />,
      isCustom: true,
      isAuto: true,
    }));

    setCustomMeals((prev) => {
      const keptManual = prev.filter((meal) => !meal.isAuto);
      const mergedIds = new Set(keptManual.map((meal) => meal.id));
      const merged = [...keptManual];

      for (const section of autoSections) {
        if (!mergedIds.has(section.id)) {
          merged.push(section);
          mergedIds.add(section.id);
        }
      }

      return merged;
    });
  }, [foods]);

  const allMealTypes = useMemo(() => [...DEFAULT_MEALS, ...customMeals], [customMeals]);
  const selectedMealValue = allMealTypes.some((meal) => meal.id === newFood.mealType)
    ? newFood.mealType
    : "breakfast";

  useEffect(() => {
    if (newFood.mealType !== selectedMealValue) {
      setNewFood((prev) => ({ ...prev, mealType: selectedMealValue }));
    }
  }, [newFood.mealType, selectedMealValue]);

  const remaining = {
    calories: targets.calories - intake.calories,
    protein: targets.protein - intake.protein,
    carbs: targets.carbs - intake.carbs,
    fats: targets.fats - intake.fats,
  };

  const getMealFoods = useCallback(
    (mealType: string): FoodItem[] => foods.filter((food) => food.mealType === mealType),
    [foods],
  );

  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await api.get<FoodSearchResult[]>("/api/foods/search", { params: { q: term } });
      setSearchResults(res.data);
    } catch (error) {
      console.error("Food search failed", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setNewFood((prev) => ({ ...prev, name: "" }));
      setSelectedUnit("g");

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void performSearch(value);
      }, 300);
    },
    [performSearch],
  );

  const handleAddFood = async () => {
    const selectedFood = searchResults.find((food) => food.name === newFood.name);
    if (!selectedFood || !newFood.quantity) return;

    const quantity = parseFloat(newFood.quantity);
    const quantityInGrams = toGrams(quantity, selectedUnit, newFood.name);
    const multiplier = quantityInGrams / selectedFood.servingSize.amount;

    await addFood({
      calories: Math.round(selectedFood.calories * multiplier),
      protein: Math.round(selectedFood.protein * multiplier),
      carbs: Math.round(selectedFood.carbs * multiplier),
      fats: Math.round(selectedFood.fats * multiplier),
      food: {
        name: newFood.name,
        quantity,
        unit: selectedUnit,
        calories: Math.round(selectedFood.calories * multiplier),
        protein: Math.round(selectedFood.protein * multiplier),
        carbs: Math.round(selectedFood.carbs * multiplier),
        fats: Math.round(selectedFood.fats * multiplier),
        mealType: newFood.mealType,
      },
    });

    clearRemovedMealSection(newFood.mealType);
    setNewFood({ name: "", quantity: "", mealType: getInitialMealType() });
    setSearchTerm("");
    setSelectedUnit("g");
    setSearchResults([]);
  };

  const handleAddCustomMeal = () => {
    let name = customMealName.trim();
    let id = "";
    let iconNode: ReactNode = <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />;

    if (customMealPreset && customMealPreset !== "custom") {
      const preset = PRESET_MEALS.find((meal) => meal.id === customMealPreset);
      if (preset) {
        name = preset.label;
        id = preset.id;
        iconNode = preset.iconNode;
      }
    } else if (name) {
      id = name.toLowerCase().replace(/\s+/g, "_");
    }

    if (!name || !id) return;
    if (allMealTypes.some((meal) => meal.id === id)) {
      setCustomMealName("");
      setCustomMealPreset("");
      setShowAddMealModal(false);
      return;
    }

    clearRemovedMealSection(id);
    setCustomMeals((prev) => [...prev, { id, label: name, iconNode, isCustom: true }]);
    setShowAddMealModal(false);
    setCustomMealName("");
    setCustomMealPreset("");
  };

  const removeCustomMeal = async (mealId: string) => {
    const user = localStorage.getItem("user");
    if (!user) return;
    const { id } = JSON.parse(user) as { id: string };
    const sectionFoods = getMealFoods(mealId);

    if (sectionFoods.length > 0 && confirmRemoveId !== mealId) {
      setConfirmRemoveId(mealId);
      return;
    }

    try {
      for (const food of sectionFoods) {
        const foodId = food._id ?? food.id;
        if (foodId) {
          await api.delete(`/api/profile/${id}/food/${foodId}`);
        }
      }

      if (sectionFoods.length > 0) {
        await refreshNutrition();
      }

      rememberRemovedMealSection(mealId);
      setCustomMeals((prev) => prev.filter((meal) => meal.id !== mealId));
      setConfirmRemoveId(null);
      setNewFood((prev) => (prev.mealType === mealId ? { ...prev, mealType: "snacks" } : prev));
      toast.success("Meal section removed");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove section");
    }
  };

  const unitOptions = getUnitOptions(newFood.name);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t("foodTracking")}</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Track your food intake and macros.</p>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-base md:text-lg font-semibold font-display text-foreground mb-4 md:mb-6">{t("dailyProgress")}</h3>
          <div className="space-y-4 md:space-y-6">
            <ProgressBar label="Calories" current={intake.calories} target={targets.calories} variant="primary" />
            <ProgressBar label="Protein" current={intake.protein} target={targets.protein} unit="g" variant="accent" />
            <ProgressBar label="Carbs" current={intake.carbs} target={targets.carbs} unit="g" variant="warning" />
            <ProgressBar label="Fats" current={intake.fats} target={targets.fats} unit="g" variant="destructive" />
          </div>
        </div>

        <div className="stat-card">
          <h3 className="text-base md:text-lg font-semibold font-display text-foreground mb-4">{t("remaining")}</h3>
          <div className="space-y-3 md:space-y-4">
            {(["calories", "protein", "carbs", "fats"] as const).map((key) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm md:text-base text-muted-foreground capitalize">{key}</span>
                <span className={`font-bold ${remaining[key] >= 0 ? "text-primary" : "text-destructive"}`}>
                  {remaining[key]}
                  {key === "calories" ? "" : "g"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="text-base md:text-lg font-semibold font-display text-foreground mb-4">{t("addFoodButton")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 space-y-2 relative">
            <Label className="text-sm">{t("searchFood")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchFoodPlaceholder")}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>

            {searchTerm && !newFood.name && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchLoading && <div className="px-4 py-2 text-sm text-muted-foreground">{t("searching")}</div>}
                {!searchLoading && searchResults.length === 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">{t("noFoodsFound")}</div>
                )}
                {searchResults.map((food) => (
                  <button
                    key={food._id}
                    onClick={() => {
                      setNewFood((prev) => ({ ...prev, name: food.name }));
                      setSearchTerm(food.name);
                      setSelectedUnit(getUnitOptions(food.name)[0]);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-secondary flex justify-between items-center text-sm"
                  >
                    <span>{food.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {food.calories} cal / {food.servingSize.amount}
                      {food.servingSize.unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("quantity")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="150"
                value={newFood.quantity}
                onChange={(e) => setNewFood((prev) => ({ ...prev, quantity: e.target.value }))}
                className="bg-secondary border-border"
              />
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-24 bg-secondary border-border shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newFood.name && newFood.quantity && (() => {
              const selectedFood = searchResults.find((food) => food.name === newFood.name);
              if (!selectedFood) return null;

              const grams = toGrams(parseFloat(newFood.quantity), selectedUnit, newFood.name);
              const multiplier = grams / selectedFood.servingSize.amount;

              return (
                <p className="text-xs text-muted-foreground">
                  ≈ {Math.round(selectedFood.calories * multiplier)} cal • {Math.round(selectedFood.protein * multiplier)}p •{" "}
                  {Math.round(selectedFood.carbs * multiplier)}c • {Math.round(selectedFood.fats * multiplier)}f
                </p>
              );
            })()}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("meal")}</Label>
            <Select value={selectedMealValue} onValueChange={(value) => setNewFood((prev) => ({ ...prev, mealType: value }))}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select meal..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {allMealTypes.map((meal) => (
                  <SelectItem key={meal.id} value={meal.id}>
                    <span className="flex items-center gap-2">
                      {meal.iconNode}
                      {meal.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="gradient"
          className="mt-4 gap-2 w-full sm:w-auto"
          onClick={handleAddFood}
          disabled={!newFood.name || !newFood.quantity}
        >
          <Plus className="h-4 w-4" />
          {t("addFoodButton")}
        </Button>
      </div>

      <div className="grid gap-4 md:gap-6 sm:grid-cols-2">
        {allMealTypes.map((meal) => (
          <div key={meal.id} className={`stat-card relative ${meal.isCustom ? "border-dashed border-2 bg-secondary/10" : ""}`}>
            <div className="flex items-center justify-between mb-4 w-full">
              <h3 className="text-base md:text-lg font-semibold font-display text-foreground flex items-center gap-2">
                {meal.iconNode}
                {meal.label}
                {meal.isAuto && (
                  <Badge variant="outline" className="ml-2 text-[10px] bg-primary/10 text-primary border-primary/20">
                    Auto
                  </Badge>
                )}
              </h3>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getMealFoods(meal.id).reduce((total, food) => total + food.calories, 0)} cal
                </Badge>
                {meal.isCustom && (
                  confirmRemoveId === meal.id ? (
                    <div className="flex items-center gap-2 bg-secondary/50 px-2 py-1 rounded-md ml-1">
                      <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                        {getMealFoods(meal.id).length > 0 ? `Delete ${getMealFoods(meal.id).length} items?` : "Remove meal"}
                      </span>
                      <button
                        onClick={() => void removeCustomMeal(meal.id)}
                        className="text-[10px] md:text-xs text-destructive hover:underline font-medium whitespace-nowrap"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="text-[10px] md:text-xs text-muted-foreground hover:underline whitespace-nowrap"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(meal.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded ml-1"
                      title="Remove this meal section"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              {getMealFoods(meal.id).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("noFoodsAdded")}</p>
              ) : (
                getMealFoods(meal.id).map((food) => {
                  const foodKey = food._id ?? food.id;

                  return (
                    <div
                      key={foodKey ?? `${food.name}-${food.quantity}-${food.mealType}`}
                      className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-secondary/50 group gap-2"
                    >
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <Apple className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{food.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {food.quantity}
                            {food.unit} • {food.protein}p • {food.carbs}c • {food.fats}f
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 md:gap-2 shrink-0">
                        <span className="text-xs md:text-sm font-medium text-primary">{food.calories} cal</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                          onClick={() => foodKey && void removeFood(foodKey)}
                          disabled={!foodKey}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}

        {customMeals.length < 3 && (
          <div className="col-span-full border border-dashed rounded-2xl flex items-center justify-center p-6 bg-secondary/10 hover:bg-secondary/20 transition-colors">
            {!showAddMealModal ? (
              <Button onClick={() => setShowAddMealModal(true)} variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                <Plus className="h-5 w-5" />
                Add Meal {customMeals.length > 0 && `(${customMeals.length} custom)`}
              </Button>
            ) : (
              <div className="flex flex-col md:flex-row gap-4 w-full max-w-xl">
                <Select value={customMealPreset} onValueChange={setCustomMealPreset}>
                  <SelectTrigger className="w-full md:w-1/2">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_MEALS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex items-center gap-2">
                          {preset.iconNode}
                          {preset.label}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Type custom name</SelectItem>
                  </SelectContent>
                </Select>

                {customMealPreset === "custom" && (
                  <Input
                    value={customMealName}
                    onChange={(e) => setCustomMealName(e.target.value)}
                    placeholder="e.g. Pre-workout"
                    className="w-full bg-secondary"
                  />
                )}

                <div className="flex gap-2">
                  <Button onClick={handleAddCustomMeal} disabled={customMealPreset === "custom" && !customMealName.trim()}>
                    Add Meal Section
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAddMealModal(false);
                      setCustomMealPreset("");
                      setCustomMealName("");
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodTracking;
