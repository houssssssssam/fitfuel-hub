import { api } from "@/lib/api";
import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Apple,
  Search,
  Star,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Dumbbell,
  Coffee,
  CupSoda,
  UtensilsCrossed,
  X,
  Moon,
  ScanBarcode,
  RefreshCw,
  WifiOff,
  CloudUpload,
  History,
  BookTemplate,
  MoreVertical,
  BookmarkPlus,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import BarcodeScanner, { type ScannedFoodData, type PartialProductInfo } from "@/components/BarcodeScanner";
import { syncService } from "@/lib/syncService";

interface FoodSearchResult {
  _id: string;
  name: string;
  servingSize: { amount: number; unit: string };
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  externalId?: string;
}

interface SavedFood {
  _id?: string;
  name: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize?: { amount: number; unit: string };
  externalId?: string;
  addedAt?: string;
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

interface MealTemplate {
  _id: string;
  name: string;
  mealType: string;
  foods: Array<{
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }>;
  createdAt: string;
}

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

const toComparableAmount = (quantity: number, unit: string, foodName: string): number => {
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
    case "meal":
    case "serving":
      return quantity;
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

const getFoodEmoji = (name: string): string => {
  const n = name.toLowerCase();

  // Seafood (check before generic "fish")
  if (n.includes("shrimp") || n.includes("prawn")) return "🦐";
  if (n.includes("crab")) return "🦀";
  if (n.includes("lobster")) return "🦞";
  if (n.includes("oyster") || n.includes("clam") || n.includes("mussel")) return "🦪";
  if (n.includes("squid") || n.includes("calamari") || n.includes("octopus")) return "🦑";
  if (n.includes("salmon")) return "🍣";
  if (n.includes("sushi")) return "🍣";
  if (n.includes("sardine")) return "🐟";
  if (n.includes("tuna")) return "🐟";
  if (n.includes("fish") || n.includes("cod") || n.includes("tilapia") || n.includes("trout") || n.includes("halibut")) return "🐟";

  // Meats
  if (n.includes("chicken")) return "🍗";
  if (n.includes("turkey")) return "🦃";
  if (n.includes("duck")) return "🦆";
  if (n.includes("bacon")) return "🥓";
  if (n.includes("sausage") || n.includes("hot dog") || n.includes("frankfurter")) return "🌭";
  if (n.includes("ham") || n.includes("salami") || n.includes("pepperoni")) return "🥓";
  if (n.includes("steak")) return "🥩";
  if (n.includes("beef") || n.includes("veal") || n.includes("bison") || n.includes("lamb") || n.includes("pork")) return "🥩";

  // Eggs & Dairy
  if (n.includes("egg")) return "🥚";
  if (n.includes("cheese")) return "🧀";
  if (n.includes("butter") && !n.includes("peanut")) return "🧈";
  if (n.includes("yogurt")) return "🥛";
  if (n.includes("milk") || n.includes("cream")) return "🥛";
  if (n.includes("whey") || n.includes("protein powder") || n.includes("protein")) return "💪";
  if (n.includes("ice cream") || n.includes("gelato")) return "🍨";

  // Fruits
  if (n.includes("apple") && !n.includes("pineapple")) return "🍎";
  if (n.includes("banana")) return "🍌";
  if (n.includes("orange") && !n.includes("juice")) return "🍊";
  if (n.includes("mango")) return "🥭";
  if (n.includes("pineapple")) return "🍍";
  if (n.includes("strawberry")) return "🍓";
  if (n.includes("blueberry") || n.includes("berry")) return "🫐";
  if (n.includes("grape")) return "🍇";
  if (n.includes("watermelon") || n.includes("melon")) return "🍉";
  if (n.includes("peach")) return "🍑";
  if (n.includes("pear")) return "🍐";
  if (n.includes("cherry")) return "🍒";
  if (n.includes("lemon") || n.includes("lime")) return "🍋";
  if (n.includes("kiwi")) return "🥝";
  if (n.includes("coconut")) return "🥥";
  if (n.includes("pomegranate")) return "🫐";
  if (n.includes("avocado")) return "🥑";

  // Vegetables
  if (n.includes("broccoli")) return "🥦";
  if (n.includes("carrot")) return "🥕";
  if (n.includes("sweet potato")) return "🍠";
  if (n.includes("potato")) return "🥔";
  if (n.includes("tomato") || n.includes("salsa")) return "🍅";
  if (n.includes("cucumber") || n.includes("pickle")) return "🥒";
  if (n.includes("corn")) return "🌽";
  if (n.includes("eggplant") || n.includes("aubergine")) return "🍆";
  if (n.includes("pepper") || n.includes("chili") || n.includes("jalapeño")) return "🌶️";
  if (n.includes("mushroom")) return "🍄";
  if (n.includes("onion") || n.includes("garlic")) return "🧅";
  if (n.includes("lettuce") || n.includes("salad") || n.includes("spinach") || n.includes("kale") || n.includes("cabbage")) return "🥬";
  if (n.includes("peas") || n.includes("edamame")) return "🫛";
  if (n.includes("asparagus") || n.includes("celery") || n.includes("zucchini") || n.includes("artichoke")) return "🥬";
  if (n.includes("cauliflower") || n.includes("beet")) return "🥦";

  // Legumes
  if (n.includes("lentil") || n.includes("bean") || n.includes("chickpea") || n.includes("hummus")) return "🫘";
  if (n.includes("tofu") || n.includes("tempeh") || n.includes("soy")) return "🫘";

  // Nuts & Seeds & Butter
  if (n.includes("peanut butter") || n.includes("almond butter")) return "🥜";
  if (n.includes("almond") || n.includes("walnut") || n.includes("cashew") || n.includes("pistachio") || n.includes("pecan") || n.includes("peanut") || n.includes("nut")) return "🥜";
  if (n.includes("seed") || n.includes("chia") || n.includes("flax") || n.includes("sunflower")) return "🌻";

  // Grains & Carbs
  if (n.includes("rice")) return "🍚";
  if (n.includes("pasta") || n.includes("spaghetti") || n.includes("noodle") || n.includes("macaroni") || n.includes("couscous")) return "🍝";
  if (n.includes("bread") || n.includes("toast") || n.includes("muffin") || n.includes("pita") || n.includes("sourdough") || n.includes("rye")) return "🍞";
  if (n.includes("bagel") || n.includes("croissant")) return "🥐";
  if (n.includes("pancake") || n.includes("waffle") || n.includes("crepe")) return "🥞";
  if (n.includes("tortilla") || n.includes("wrap")) return "🌮";
  if (n.includes("cereal") || n.includes("granola") || n.includes("oat")) return "🥣";
  if (n.includes("quinoa") || n.includes("barley")) return "🌾";

  // Oils & Condiments
  if (n.includes("olive oil") || n.includes("oil") || n.includes("ghee")) return "🫙";
  if (n.includes("honey")) return "🍯";
  if (n.includes("jam") || n.includes("jelly") || n.includes("syrup")) return "🍯";
  if (n.includes("ketchup") || n.includes("mustard") || n.includes("mayo") || n.includes("sauce") || n.includes("dressing") || n.includes("vinegar")) return "🫙";
  if (n.includes("soy sauce") || n.includes("hot sauce")) return "🫙";

  // Sweets & Snacks
  if (n.includes("chocolate")) return "🍫";
  if (n.includes("cookie") || n.includes("biscuit")) return "🍪";
  if (n.includes("cake") || n.includes("pastry") || n.includes("donut") || n.includes("doughnut")) return "🍰";
  if (n.includes("candy") || n.includes("gummy")) return "🍬";
  if (n.includes("chip") || n.includes("crisp") || n.includes("dorito") || n.includes("pringle")) return "🍟";
  if (n.includes("popcorn")) return "🍿";
  if (n.includes("granola bar") || n.includes("protein bar") || n.includes("cliff bar") || n.includes("quest bar") || n.includes("kind bar")) return "🍫";
  if (n.includes("nutella") || n.includes("oreo")) return "🍫";

  // Fast Food & Meals
  if (n.includes("pizza")) return "🍕";
  if (n.includes("burger") || n.includes("hamburger")) return "🍔";
  if (n.includes("sandwich") || n.includes("sub") || n.includes("subway")) return "🥪";
  if (n.includes("taco")) return "🌮";
  if (n.includes("burrito")) return "🌯";
  if (n.includes("soup") || n.includes("broth") || n.includes("stew")) return "🥣";
  if (n.includes("curry") || n.includes("tajine") || n.includes("bastilla")) return "🍛";
  if (n.includes("fried rice") || n.includes("stir-fry") || n.includes("stir fry")) return "🍳";
  if (n.includes("fries") || n.includes("french fries")) return "🍟";

  // Drinks
  if (n.includes("coffee") || n.includes("espresso") || n.includes("latte") || n.includes("cappuccino")) return "☕";
  if (n.includes("tea")) return "🍵";
  if (n.includes("smoothie") || n.includes("shake")) return "🥤";
  if (n.includes("juice")) return "🧃";
  if (n.includes("water")) return "💧";
  if (n.includes("soda") || n.includes("cola") || n.includes("pepsi") || n.includes("sprite")) return "🥤";
  if (n.includes("energy") || n.includes("red bull") || n.includes("monster") || n.includes("gatorade") || n.includes("powerade")) return "⚡";
  if (n.includes("beer") || n.includes("wine") || n.includes("alcohol")) return "🍷";

  // Catch-all for "luncheon" and similar
  if (n.includes("luncheon")) return "🥩";
  if (n.includes("fromage")) return "🧀";

  return "🍽️";
};

const formatServingLabel = (food: SavedFood): string => {
  if (food.servingSize?.amount && food.servingSize.unit) {
    return `per ${food.servingSize.amount}${food.servingSize.unit}`;
  }

  if (food.unit && ["meal", "serving", "piece"].includes(food.unit.toLowerCase())) {
    return `per ${food.unit}`;
  }

  if (food.unit) {
    return `per 100${food.unit}`;
  }

  return "per serving";
};

const getSavedFoodBaseUnit = (food: SavedFood): string =>
  food.servingSize?.unit || food.unit || "g";

const getFallbackServingSize = (food: SavedFood): { amount: number; unit: string } => {
  const unit = getSavedFoodBaseUnit(food);
  return ["meal", "serving", "piece"].includes(unit.toLowerCase())
    ? { amount: 1, unit }
    : { amount: 100, unit };
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

const FoodLibraryCard = ({
  food,
  isFav,
  onQuickAdd,
  onToggleFavorite,
}: {
  food: SavedFood;
  isFav: boolean;
  onQuickAdd: () => void;
  onToggleFavorite: () => void;
}) => (
  <div className="group flex items-center gap-3 rounded-xl border border-transparent bg-secondary/50 p-3 transition-all duration-200 hover:border-border hover:bg-secondary">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base">
      {getFoodEmoji(food.name)}
    </div>

    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium capitalize text-foreground">{food.name}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="text-xs font-medium text-primary">{Math.round(food.calories)} cal</span>
        <span className="text-xs text-muted-foreground">{formatServingLabel(food)}</span>
      </div>
      <div className="mt-1 flex gap-1">
        <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">
          {Math.round(food.protein)}p
        </span>
        <span className="rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-400">
          {Math.round(food.carbs)}c
        </span>
        <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">
          {Math.round(food.fats)}f
        </span>
      </div>
    </div>

    <div className="flex shrink-0 flex-col gap-1">
      <button
        type="button"
        onClick={onQuickAdd}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
        title="Quick add"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          isFav
            ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
            : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-yellow-400"
        }`}
        title={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={`h-3.5 w-3.5 ${isFav ? "fill-yellow-400" : ""}`} />
      </button>
    </div>
  </div>
);

const FoodLibraryEmptyState = ({
  icon,
  title,
  description,
  accentClasses,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accentClasses: string;
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl border border-dashed p-6 text-center ${accentClasses}`}
  >
    <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-3xl" />
    <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
    <div className="relative">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-card/80 backdrop-blur">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  </div>
);

const TemplateCard = ({
  template,
  onLog,
  onDelete,
}: {
  template: MealTemplate;
  onLog: (t: MealTemplate) => void;
  onDelete: (id: string) => void;
}) => {
  const totalCal = template.foods.reduce((s, f) => s + (f.calories || 0), 0);
  const totalPro = template.foods.reduce((s, f) => s + (f.protein || 0), 0);
  const totalCarb = template.foods.reduce((s, f) => s + (f.carbs || 0), 0);
  const totalFat = template.foods.reduce((s, f) => s + (f.fats || 0), 0);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{template.name}</p>
          <p className="text-xs text-muted-foreground">{template.mealType}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive gap-2"
              onClick={() => onDelete(template._id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-0.5 mb-3 flex-1">
        {template.foods.slice(0, 3).map((food, idx) => (
          <p key={idx} className="text-xs text-muted-foreground truncate">
            · {food.name} ({food.quantity}{food.unit})
          </p>
        ))}
        {template.foods.length > 3 && (
          <p className="text-xs text-muted-foreground">+{template.foods.length - 3} more</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs mb-3 flex-wrap">
        <span className="font-semibold text-foreground">{totalCal} kcal</span>
        <span className="text-cyan-500">{totalPro.toFixed(0)}g P</span>
        <span className="text-orange-400">{totalCarb.toFixed(0)}g C</span>
        <span className="text-red-400">{totalFat.toFixed(0)}g F</span>
      </div>

      <Button size="sm" className="w-full gap-1.5" onClick={() => onLog(template)}>
        <Plus className="h-3.5 w-3.5" />
        Log Meal
      </Button>
    </div>
  );
};

const toLocalISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getToday = () => toLocalISO(new Date());

const formatDateLabel = (date: string): string => {
  const today = getToday();
  if (date === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === toLocalISO(yesterday)) return "Yesterday";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const FoodTracking = () => {
  const { t } = useTranslation();
  const { foods, intake, targets, addFood, removeFood, refreshNutrition } = useNutrition();
  const location = useLocation();
  const getUserId = useCallback((): string | null => {
    const user = localStorage.getItem("user");
    if (!user) return null;
    return JSON.parse(user).id as string;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [historyFoods, setHistoryFoods] = useState<FoodItem[]>([]);
  const [historyIntake, setHistoryIntake] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const isToday = selectedDate === getToday();

  // Must be declared early — referenced in useEffect dependency arrays below
  const effectiveFoods = isToday ? foods : historyFoods;
  const effectiveIntake = isToday ? intake : historyIntake;

  const [newFood, setNewFood] = useState({ name: "", quantity: "", mealType: getInitialMealType() });
  const [selectedUnit, setSelectedUnit] = useState("g");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [recentFoods, setRecentFoods] = useState<SavedFood[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<SavedFood[]>([]);
  const [activeLibraryTab, setActiveLibraryTab] = useState<"recent" | "favorites">("recent");
  const [libraryExpanded, setLibraryExpanded] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncingOfflineFoods, setIsSyncingOfflineFoods] = useState(false);
  const [customMeals, setCustomMeals] = useState<MealOption[]>([]);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [customMealName, setCustomMealName] = useState("");
  const [customMealPreset, setCustomMealPreset] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const offlineLibraryToastShownRef = useRef(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const historyPopupRef = useRef<HTMLDivElement>(null);

  // Meal Templates state
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateMealType, setTemplateMealType] = useState("Breakfast");
  const [templateSelectedFoods, setTemplateSelectedFoods] = useState<FoodItem[]>([]);

  const handleScanSuccess = useCallback(
    (foodData: ScannedFoodData) => {
      // Auto-fill the food name
      setNewFood((prev) => ({ ...prev, name: foodData.name }));
      setSearchTerm(foodData.name);
      setSelectedUnit("g");

      // Inject scanned product into search results so existing form logic works
      setSearchResults([
        {
          _id: `scan_${foodData.barcode}`,
          name: foodData.name,
          servingSize: { amount: 100, unit: "g" },
          calories: foodData.calories,
          protein: foodData.protein,
          carbs: foodData.carbs,
          fats: foodData.fats,
        },
      ]);

      setShowScanner(false);
      toast.success(`Scanned: ${foodData.name}${foodData.brand ? ` (${foodData.brand})` : ""}`);

      // Focus quantity input after a short delay
      window.setTimeout(() => {
        document.getElementById("quantity-input")?.focus();
      }, 300);
    },
    []
  );

  const handleManualEntry = useCallback((product: PartialProductInfo) => {
    const displayName = product.brand
      ? `${product.brand} ${product.name}`
      : product.name;
    setSearchTerm(displayName);
    setNewFood((prev) => ({ ...prev, name: "" }));
    setSearchResults([]);
    toast.info(`"${product.name}" — enter the nutrition values manually`, { duration: 4000 });
    window.setTimeout(() => {
      document.getElementById("food-search-input")?.focus();
    }, 300);
  }, []);

  const refreshOfflineStatus = useCallback(async () => {
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    const count = await syncService.getPendingSyncCount();
    setPendingSyncCount(count);
  }, []);

  const fetchFoodLibrary = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const res = await api.get<{ recentFoods?: SavedFood[]; favoriteFoods?: SavedFood[] }>(
        `/api/profile/${userId}/food-library`
      );
      const nextRecentFoods = res.data.recentFoods || [];
      const nextFavoriteFoods = res.data.favoriteFoods || [];

      setRecentFoods(nextRecentFoods);
      setFavoriteFoods(nextFavoriteFoods);
      await syncService.cacheRecentFoods(nextRecentFoods, userId);
      await syncService.cacheFavoriteFoods(nextFavoriteFoods, userId);
      offlineLibraryToastShownRef.current = false;
    } catch (error) {
      const [cachedRecentFoods, cachedFavoriteFoods] = await Promise.all([
        syncService.getCachedRecentFoods(userId),
        syncService.getCachedFavoriteFoods(userId),
      ]);

      setRecentFoods(cachedRecentFoods);
      setFavoriteFoods(cachedFavoriteFoods);

      if (!offlineLibraryToastShownRef.current && (cachedRecentFoods.length > 0 || cachedFavoriteFoods.length > 0)) {
        toast.info("Showing cached foods while offline");
        offlineLibraryToastShownRef.current = true;
      }

      console.error("Failed to fetch food library", error);
    }
  }, [getUserId]);

  const fetchMealTemplates = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    try {
      const res = await api.get<{ templates: MealTemplate[] }>(`/api/profile/${userId}/meal-templates`);
      setMealTemplates(res.data.templates || []);
    } catch {
      // silently fail — templates are non-critical
    }
  }, [getUserId]);

  const handleCreateTemplate = useCallback(async () => {
    const userId = getUserId();
    if (!userId || !templateName || templateSelectedFoods.length === 0) return;
    try {
      const res = await api.post<{ template: MealTemplate }>(`/api/profile/${userId}/meal-templates`, {
        name: templateName,
        mealType: templateMealType,
        foods: templateSelectedFoods.map((f) => ({
          name: f.name,
          quantity: f.quantity,
          unit: f.unit,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fats: f.fats,
        })),
      });
      setMealTemplates((prev) => [...prev, res.data.template]);
      setShowCreateTemplateDialog(false);
      setTemplateName("");
      setTemplateMealType("Breakfast");
      setTemplateSelectedFoods([]);
      toast.success("Meal saved!");
    } catch {
      toast.error("Failed to save meal");
    }
  }, [getUserId, templateName, templateMealType, templateSelectedFoods]);

  const handleLogTemplate = useCallback(async (template: MealTemplate) => {
    const userId = getUserId();
    if (!userId) return;
    try {
      await api.post(`/api/profile/${userId}/meal-templates/${template._id}/log`);
      await refreshNutrition();
      toast.success(`Logged "${template.name}"!`);
    } catch {
      toast.error("Failed to log meal");
    }
  }, [getUserId, refreshNutrition]);

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    const userId = getUserId();
    if (!userId) return;
    try {
      await api.delete(`/api/profile/${userId}/meal-templates/${templateId}`);
      setMealTemplates((prev) => prev.filter((t) => t._id !== templateId));
      toast.success("Meal deleted");
    } catch {
      toast.error("Failed to delete meal");
    }
  }, [getUserId]);

  const handleQuickSaveMeal = useCallback(async (mealLabel: string, mealId: string, mealFoods: FoodItem[]) => {
    const userId = getUserId();
    if (!userId || mealFoods.length === 0) return;
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const name = `My ${mealLabel} - ${date}`;
    try {
      const res = await api.post<{ template: MealTemplate }>(`/api/profile/${userId}/meal-templates`, {
        name,
        mealType: mealLabel,
        foods: mealFoods.map((f) => ({
          name: f.name,
          quantity: f.quantity,
          unit: f.unit,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fats: f.fats,
        })),
      });
      setMealTemplates((prev) => [...prev, res.data.template]);
      toast.success(`Saved as "${name}"`);
    } catch {
      toast.error("Failed to save meal");
    }
  }, [getUserId]);

  const fetchHistoryForDate = useCallback(async (date: string) => {
    const userId = getUserId();
    if (!userId) return;
    setHistoryLoading(true);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setHistoryFoods([]);
      setHistoryIntake({ calories: 0, protein: 0, carbs: 0, fats: 0 });
      setHistoryLoading(false);
      return;
    }

    try {
      const res = await api.get(`/api/profile/${userId}/history/${date}`);
      setHistoryFoods(res.data.foods ?? []);
      setHistoryIntake({
        calories: res.data.calories ?? 0,
        protein: res.data.protein ?? 0,
        carbs: res.data.carbs ?? 0,
        fats: res.data.fats ?? 0,
      });
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [getUserId]);

  // Date-aware add food
  const handleAddFoodForDate = useCallback(async (payload: Parameters<typeof addFood>[0]) => {
    const userId = getUserId();
    if (!userId) return;
    if (isToday) {
      return addFood(payload);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Offline mode only supports logging foods for today.");
      return;
    }

    const res = await api.put(`/api/profile/${userId}/history/${selectedDate}/food`, payload);
    setHistoryFoods(res.data.foods ?? []);
    setHistoryIntake(res.data.dailyIntake);
    return { mode: "online" as const };
  }, [addFood, getUserId, isToday, selectedDate]);

  // Date-aware remove food
  const handleRemoveFoodForDate = useCallback(async (foodId: string) => {
    const userId = getUserId();
    if (!userId) return;
    if (isToday) {
      if (!isOnline && !foodId.startsWith("offline:")) {
        toast.error("You can only remove foods that were logged offline while disconnected.");
        return;
      }

      await removeFood(foodId);
    } else {
      if (!isOnline) {
        toast.error("History edits require an internet connection.");
        return;
      }

      const prevFoods = historyFoods;
      const prevIntake = historyIntake;
      setHistoryFoods((prev) => prev.filter((f) => (f._id ?? f.id) !== foodId));
      try {
        const res = await api.delete(`/api/profile/${userId}/history/${selectedDate}/food/${foodId}`);
        setHistoryFoods(res.data.foods ?? []);
        setHistoryIntake(res.data.dailyIntake);
      } catch (err) {
        console.error("Failed to delete food from history", err);
        setHistoryFoods(prevFoods);
        setHistoryIntake(prevIntake);
      }
    }
  }, [getUserId, historyFoods, historyIntake, isOnline, isToday, removeFood, selectedDate]);

  useEffect(() => {
    void refreshOfflineStatus();
  }, [refreshOfflineStatus]);

  useEffect(() => {
    const handleConnectivityChange = () => {
      void refreshOfflineStatus();
    };

    const handleQueueChange = () => {
      void refreshOfflineStatus();
    };

    const handleSyncComplete = (event: Event) => {
      const wasManualSync = isSyncingOfflineFoods;
      setIsSyncingOfflineFoods(false);
      void refreshOfflineStatus();

      const detail = (event as CustomEvent<{ syncedCount?: number; failedCount?: number }>).detail;
      if (!detail) return;

      if (wasManualSync) return;

      if ((detail.syncedCount || 0) > 0) {
        toast.success(`Synced ${detail.syncedCount} food${detail.syncedCount === 1 ? "" : "s"}`);
      } else if ((detail.failedCount || 0) > 0) {
        toast.error("Some offline foods could not be synced yet.");
      }
    };

    window.addEventListener("online", handleConnectivityChange);
    window.addEventListener("offline", handleConnectivityChange);
    window.addEventListener(syncService.getQueueChangedEventName(), handleQueueChange);
    window.addEventListener(syncService.getSyncCompletedEventName(), handleSyncComplete);

    return () => {
      window.removeEventListener("online", handleConnectivityChange);
      window.removeEventListener("offline", handleConnectivityChange);
      window.removeEventListener(syncService.getQueueChangedEventName(), handleQueueChange);
      window.removeEventListener(syncService.getSyncCompletedEventName(), handleSyncComplete);
    };
  }, [isSyncingOfflineFoods, refreshOfflineStatus]);

  useEffect(() => {
    void Promise.all([refreshNutrition(), fetchFoodLibrary(), fetchMealTemplates()]);
  }, [fetchFoodLibrary, fetchMealTemplates, location.pathname, refreshNutrition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (historyPopupRef.current && !historyPopupRef.current.contains(e.target as Node)) {
        setShowHistoryPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      void Promise.all([refreshNutrition(), fetchFoodLibrary()]);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchFoodLibrary, refreshNutrition]);

  useEffect(() => {
    const handleAIFoodLog = (event: Event) => {
      const customEvent = event as CustomEvent<AIFoodLogEventDetail>;
      if (!customEvent.detail?.foodLogged) return;

      void Promise.all([refreshNutrition(), fetchFoodLibrary()]).then(() => {
        toast.success("FuelBot logged a food for you!", {
          description: "Check your food log below",
        });
      });
    };

    window.addEventListener("foodLoggedByAI", handleAIFoodLog);
    return () => window.removeEventListener("foodLoggedByAI", handleAIFoodLog);
  }, [fetchFoodLibrary, refreshNutrition]);

  useEffect(() => {
    if (!isToday) {
      void fetchHistoryForDate(selectedDate);
    }
  }, [selectedDate, isToday, fetchHistoryForDate]);

  useEffect(() => {
    if (effectiveFoods.length === 0) {
      localStorage.removeItem(REMOVED_MEAL_SECTIONS_KEY);
    }
  }, [effectiveFoods]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  useEffect(() => {
    const defaultMealIds = DEFAULT_MEALS.map((meal) => meal.id);
    const removedSections = getRemovedMealSections();
    const extraMealTypes = [...new Set(effectiveFoods.map((food) => food.mealType))].filter(
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
  }, [effectiveFoods]);

  const allMealTypes = useMemo(() => [...DEFAULT_MEALS, ...customMeals], [customMeals]);
  const selectedMealValue = allMealTypes.some((meal) => meal.id === newFood.mealType)
    ? newFood.mealType
    : "breakfast";
  const favoriteFoodNames = useMemo(
    () => new Set(favoriteFoods.map((food) => food.name.trim().toLowerCase())),
    [favoriteFoods]
  );
  const isFavorite = useCallback(
    (foodName: string) => favoriteFoodNames.has(foodName.trim().toLowerCase()),
    [favoriteFoodNames]
  );

  useEffect(() => {
    if (newFood.mealType !== selectedMealValue) {
      setNewFood((prev) => ({ ...prev, mealType: selectedMealValue }));
    }
  }, [newFood.mealType, selectedMealValue]);

  const remaining = {
    calories: targets.calories - effectiveIntake.calories,
    protein: targets.protein - effectiveIntake.protein,
    carbs: targets.carbs - effectiveIntake.carbs,
    fats: targets.fats - effectiveIntake.fats,
  };

  const getMealFoods = useCallback(
    (mealType: string): FoodItem[] => effectiveFoods.filter((food) => food.mealType === mealType),
    [effectiveFoods],
  );

  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    if (!isOnline) {
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
  }, [isOnline]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setShowSuggestions(true);
      setNewFood((prev) => ({ ...prev, name: "" }));
      setSelectedUnit("g");

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void performSearch(value);
      }, 300);
    },
    [performSearch],
  );

  const buildFoodLibraryEntry = useCallback(
    (food: SavedFood | FoodSearchResult): SavedFood => {
      const servingSize = "servingSize" in food && food.servingSize ? food.servingSize : undefined;
      const externalId = "externalId" in food ? food.externalId : undefined;

      return {
        name: food.name,
        unit: servingSize?.unit || ("unit" in food ? food.unit : "g"),
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        servingSize,
        externalId,
      };
    },
    []
  );

  const clearHistory = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    try {
      await api.delete(`/api/profile/${userId}/food-library/recent`);
      setRecentFoods([]);
      await syncService.cacheRecentFoods([], userId);
      toast.success("History cleared");
    } catch (error) {
      console.error("Failed to clear history", error);
      toast.error("Failed to clear history");
    }
  }, [getUserId]);

  const toggleFavorite = useCallback(
    async (food: SavedFood | FoodSearchResult) => {
      const userId = getUserId();
      if (!userId) return;

      if (!isOnline) {
        toast.info("Favorites can be viewed offline, but updates need a connection.");
        return;
      }

      try {
        const res = await api.post<{ favoriteFoods: SavedFood[]; isFavorite: boolean }>(
          `/api/profile/${userId}/favorite-food`,
          buildFoodLibraryEntry(food)
        );

        setFavoriteFoods(res.data.favoriteFoods || []);
        await syncService.cacheFavoriteFoods(res.data.favoriteFoods || [], userId);

        if (res.data.isFavorite) {
          toast.success(`Added ${food.name} to favorites`);
        } else {
          toast.success(`Removed ${food.name} from favorites`);
        }
      } catch (error) {
        console.error("Failed to update favorites", error);
        toast.error("Failed to update favorites");
      }
    },
    [buildFoodLibraryEntry, getUserId, isOnline]
  );

  const quickAddFromLibrary = useCallback(
    (food: SavedFood) => {
      const servingSize = food.servingSize || getFallbackServingSize(food);
      const baseUnit = getSavedFoodBaseUnit(food);

      setSearchTerm(food.name);
      setNewFood((prev) => ({ ...prev, name: food.name, quantity: "" }));
      setSelectedUnit(baseUnit);
      setSearchResults([
        {
          _id: food.externalId || food._id || food.name,
          name: food.name,
          servingSize,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fats: food.fats,
          externalId: food.externalId,
        },
      ]);

      document.getElementById("add-food-section")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      window.setTimeout(() => {
        document.getElementById("quantity-input")?.focus();
      }, 500);
    },
    []
  );

  const handleAddFood = async () => {
    const selectedFood = searchResults.find((food) => food.name === newFood.name);
    if (!selectedFood || !newFood.quantity) return;

    const quantity = parseFloat(newFood.quantity);
    const quantityAmount = toComparableAmount(quantity, selectedUnit, newFood.name);
    const referenceAmount = toComparableAmount(
      selectedFood.servingSize.amount,
      selectedFood.servingSize.unit,
      selectedFood.name
    );
    const multiplier = quantityAmount / referenceAmount;

    const result = await handleAddFoodForDate({
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
      foodLibraryEntry: buildFoodLibraryEntry(selectedFood),
    });

    if (!result) {
      return;
    }

    clearRemovedMealSection(newFood.mealType);
    setNewFood({ name: "", quantity: "", mealType: getInitialMealType() });
    setSearchTerm("");
    setSelectedUnit("g");
    setSearchResults([]);

    if (result?.mode === "offline") {
      toast.success("Food logged offline. It will sync when you're back online.");
    } else {
      toast.success("Food logged successfully.");
    }

    await Promise.all([fetchFoodLibrary(), refreshOfflineStatus()]);
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
    const sectionFoods = getMealFoods(mealId);

    if (sectionFoods.length > 0 && confirmRemoveId !== mealId) {
      setConfirmRemoveId(mealId);
      return;
    }

    try {
      for (const food of sectionFoods) {
        const foodId = food._id ?? food.id;
        if (foodId) {
          await handleRemoveFoodForDate(foodId);
        }
      }

      if (sectionFoods.length > 0 && isToday) {
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

  const unitOptions = useMemo(() => {
    const options = getUnitOptions(newFood.name);
    return selectedUnit && !options.includes(selectedUnit) ? [...options, selectedUnit] : options;
  }, [newFood.name, selectedUnit]);

  const handleManualSync = useCallback(async () => {
    if (!isOnline || pendingSyncCount === 0 || isSyncingOfflineFoods) return;

    setIsSyncingOfflineFoods(true);

    try {
      const result = await syncService.syncOfflineFoods();
      await refreshOfflineStatus();

      if (result.syncedCount > 0) {
        toast.success(`Synced ${result.syncedCount} offline food${result.syncedCount === 1 ? "" : "s"}.`);
      } else if (result.failedCount > 0) {
        toast.error("Sync started, but some foods still need attention.");
      } else {
        toast.info("Nothing to sync right now.");
      }
    } finally {
      setIsSyncingOfflineFoods(false);
    }
  }, [isOnline, isSyncingOfflineFoods, pendingSyncCount, refreshOfflineStatus]);

  return (
    <>
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 data-page-title-anchor className="text-2xl md:text-3xl font-bold font-display text-foreground">{t("foodTracking")}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Track your food intake and macros.</p>
        </div>

        {/* Date navigator */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-secondary/60 rounded-xl p-1 border border-border">
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate + "T00:00:00");
              d.setDate(d.getDate() - 1);
              const newDate = toLocalISO(d);
              const minDate = new Date();
              minDate.setDate(minDate.getDate() - 90);
              if (d >= minDate) setSelectedDate(newDate);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(getToday())}
            className={`min-w-[110px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isToday
                ? "bg-primary/15 text-primary"
                : "text-foreground hover:bg-secondary"
            }`}
          >
            {formatDateLabel(selectedDate)}
          </button>

          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate + "T00:00:00");
              d.setDate(d.getDate() + 1);
              const newDate = toLocalISO(d);
              if (newDate <= getToday()) setSelectedDate(newDate);
            }}
            disabled={isToday}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isToday && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Viewing <strong>{formatDateLabel(selectedDate)}</strong> — you can add or remove foods for this day.
          </span>
          {historyLoading && <span className="ml-auto text-xs text-muted-foreground">Loading...</span>}
        </div>
      )}

      {!isOnline && (
        <div className="flex flex-col gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-200">Offline Mode</p>
              <p className="mt-1 text-xs text-yellow-100/80">
                You can log foods for today from cached Recent or Favorites. We will sync everything when you are back online.
              </p>
            </div>
          </div>
          {!isToday && (
            <p className="text-xs text-yellow-100/80">
              Historical diary changes still need a connection.
            </p>
          )}
        </div>
      )}

      {pendingSyncCount > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CloudUpload className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
            <div>
              <p className="font-medium text-blue-100">
                {pendingSyncCount} food{pendingSyncCount === 1 ? "" : "s"} pending sync
              </p>
              <p className="mt-1 text-xs text-blue-100/80">
                Your offline food logs are queued safely in this browser.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => void handleManualSync()}
            disabled={!isOnline || pendingSyncCount === 0 || isSyncingOfflineFoods}
            className="gap-2 border-blue-400/30 bg-blue-500/5 text-blue-100 hover:bg-blue-500/15 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingOfflineFoods ? "animate-spin" : ""}`} />
            Sync Now ({pendingSyncCount})
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-base md:text-lg font-semibold font-display text-foreground mb-4 md:mb-6">{t("dailyProgress")}</h3>
          <div className="space-y-4 md:space-y-6">
            <ProgressBar label="Calories" current={effectiveIntake.calories} target={targets.calories} variant="primary" />
            <ProgressBar label="Protein" current={effectiveIntake.protein} target={targets.protein} unit="g" variant="accent" />
            <ProgressBar label="Carbs" current={effectiveIntake.carbs} target={targets.carbs} unit="g" variant="warning" />
            <ProgressBar label="Fats" current={effectiveIntake.fats} target={targets.fats} unit="g" variant="destructive" />
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

      <div className="stat-card" id="add-food-section">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold font-display text-foreground">Add Food</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Search and manage your favorites</p>
          </div>
          <div className="relative" ref={historyPopupRef}>
            <button
              type="button"
              onClick={() => setShowHistoryPopup((prev) => !prev)}
              title="Recent foods"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200 ${
                showHistoryPopup
                  ? "border-primary/40 bg-primary/15 text-primary shadow-[0_0_16px_rgba(34,211,238,0.15)]"
                  : "border-border bg-secondary/60 text-muted-foreground hover:border-primary/30 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
              {recentFoods.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {recentFoods.length}
                </span>
              )}
            </button>

            <div className={`absolute right-0 top-[calc(100%+8px)] z-30 w-72 rounded-2xl border border-border bg-card shadow-2xl shadow-black/30 transition-all duration-200 ease-out origin-top-right ${
                showHistoryPopup
                  ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                  : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
              }`}>
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Recently Used</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {recentFoods.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void clearHistory()}
                        className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Clear history"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowHistoryPopup(false)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                  {recentFoods.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No foods logged yet</p>
                    </div>
                  ) : (
                    recentFoods.slice(0, 8).map((food, index) => (
                      <div
                        key={food._id || food.name}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/70"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-base">
                          {getFoodEmoji(food.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium capitalize text-foreground">{food.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-semibold text-primary">{Math.round(food.calories)} cal</span>
                            <span className="text-xs text-muted-foreground">{formatServingLabel(food)}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void toggleFavorite(food); }}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 hover:scale-110 ${
                              isFavorite(food.name)
                                ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                                : "bg-secondary text-muted-foreground hover:text-yellow-400"
                            }`}
                            title={isFavorite(food.name) ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Star className={`h-3.5 w-3.5 ${isFavorite(food.name) ? "fill-yellow-400" : ""}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              quickAddFromLibrary(food);
                              setShowHistoryPopup(false);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-200 hover:bg-primary/25"
                            title="Quick add"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 space-y-2 relative" ref={searchContainerRef}>
            <Label className="text-sm">{t("searchFood")}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="food-search-input"
                  placeholder={t("searchFoodPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScanner(true)}
                className="gap-2 shrink-0 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                title="Scan product barcode"
              >
                <ScanBarcode className="h-4 w-4" />
                <span className="hidden sm:inline">Scan</span>
              </Button>
            </div>

            {!isOnline && (
              <p className="text-xs text-muted-foreground">
                Food search needs internet. Use cached Recent or Favorites for offline logging.
              </p>
            )}

            {searchTerm && !newFood.name && showSuggestions && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchLoading && <div className="px-4 py-2 text-sm text-muted-foreground">{t("searching")}</div>}
                {!searchLoading && searchResults.length === 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">{t("noFoodsFound")}</div>
                )}
                {searchResults.map((food) => (
                  <div
                    key={food._id}
                    className="group flex items-center justify-between px-4 py-2 text-sm hover:bg-secondary"
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => {
                        setNewFood((prev) => ({ ...prev, name: food.name }));
                        setSearchTerm(food.name);
                        setSelectedUnit(food.servingSize.unit || getUnitOptions(food.name)[0]);
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="capitalize">{food.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {food.calories} cal / {food.servingSize.amount}
                        {food.servingSize.unit}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void toggleFavorite(food);
                      }}
                      className="ml-2 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          isFavorite(food.name)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground hover:text-yellow-400"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("quantity")}</Label>
            <div className="flex gap-2">
              <Input
                id="quantity-input"
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

              const quantityAmount = toComparableAmount(parseFloat(newFood.quantity), selectedUnit, newFood.name);
              const referenceAmount = toComparableAmount(
                selectedFood.servingSize.amount,
                selectedFood.servingSize.unit,
                selectedFood.name
              );
              const multiplier = quantityAmount / referenceAmount;

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

        <div className="flex justify-center mt-4">
        <Button
          variant="gradient"
          className="gap-2 w-full sm:w-48"
          onClick={handleAddFood}
          disabled={!newFood.name || !newFood.quantity}
        >
          <Plus className="h-4 w-4" />
          {t("addFoodButton")}
        </Button>
        </div>

        {/* Favorites + Templates tabbed section */}
        <div className="mt-6 border-t border-border pt-5">
          <Tabs defaultValue="favorites">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="favorites" className="gap-1.5" onClick={() => setLibraryExpanded(true)}>
                  <Star className="h-3.5 w-3.5" />
                  Favorites
                  {favoriteFoods.length > 0 && (
                    <span className="rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 ml-0.5">
                      {favoriteFoods.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-1.5" onClick={() => setLibraryExpanded(true)}>
                  <BookTemplate className="h-3.5 w-3.5" />
                  Meals
                  {mealTemplates.length > 0 && (
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary ml-0.5">
                      {mealTemplates.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1.5 text-xs transition-all duration-300 ${libraryExpanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  onClick={() => setShowCreateTemplateDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Meal
                </Button>
                <button
                  type="button"
                  aria-expanded={libraryExpanded}
                  onClick={() => setLibraryExpanded((prev) => !prev)}
                  className={`rounded-full border p-1.5 transition-all duration-300 ${
                    libraryExpanded
                      ? "border-primary/30 bg-primary/10 text-primary shadow-[0_0_16px_rgba(34,211,238,0.12)]"
                      : "border-border bg-secondary/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-500 ease-out ${libraryExpanded ? "rotate-180" : "rotate-0"}`}
                  />
                </button>
              </div>
            </div>

            <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${libraryExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"}`}>
            <div className="overflow-hidden">

            <TabsContent value="favorites" className="mt-0">
              {favoriteFoods.length === 0 ? (
                <FoodLibraryEmptyState
                  icon={<Star className="h-5 w-5 text-yellow-400" />}
                  title="Your favorites shelf is empty"
                  description="Star foods from search results to build a shortlist of meals and staples you reach for all the time."
                  accentClasses="border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-card to-card"
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {favoriteFoods.map((food) => (
                    <FoodLibraryCard
                      key={food._id || food.name}
                      food={food}
                      isFav={true}
                      onQuickAdd={() => quickAddFromLibrary(food)}
                      onToggleFavorite={() => void toggleFavorite(food)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              {mealTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-xl bg-secondary/10">
                  <BookTemplate className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">No saved meals yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Save groups of foods to log complete meals in one click</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowCreateTemplateDialog(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    New Meal
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mealTemplates.map((template) => (
                    <TemplateCard
                      key={template._id}
                      template={template}
                      onLog={handleLogTemplate}
                      onDelete={handleDeleteTemplate}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            </div>{/* end overflow-hidden */}
            </div>{/* end grid collapse wrapper */}
          </Tabs>
        </div>

        {/* Create Template Dialog */}
        <Dialog open={showCreateTemplateDialog} onOpenChange={setShowCreateTemplateDialog}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Meal</DialogTitle>
              <DialogDescription>
                Save a group of foods to log as a complete meal instantly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Meal Name</Label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="e.g. Post-Workout, Quick Breakfast"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Meal Type</Label>
                <Select value={templateMealType} onValueChange={setTemplateMealType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Snacks">Snacks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Select Foods</Label>
                <p className="text-xs text-muted-foreground">Choose from today's logged foods or your favorites</p>
                <Tabs defaultValue="today" className="mt-2">
                  <TabsList className="h-8 text-xs">
                    <TabsTrigger value="today" className="text-xs px-3">Today's Foods</TabsTrigger>
                    <TabsTrigger value="fav" className="text-xs px-3">Favorites</TabsTrigger>
                  </TabsList>
                  <TabsContent value="today" className="mt-2">
                    {foods.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3">No foods logged today yet</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {foods.map((food, idx) => {
                          const checked = templateSelectedFoods.some((f) => f.name === food.name && f.quantity === food.quantity);
                          return (
                            <label key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(val) => {
                                  if (val) setTemplateSelectedFoods((prev) => [...prev, food]);
                                  else setTemplateSelectedFoods((prev) => prev.filter((_, i) => i !== idx || prev[i] !== food));
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{food.name}</p>
                                <p className="text-xs text-muted-foreground">{food.quantity}{food.unit} · {food.calories} kcal</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="fav" className="mt-2">
                    {favoriteFoods.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3">No favorites yet</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {favoriteFoods.map((food, idx) => {
                          const asItem: FoodItem = { name: food.name, quantity: food.servingSize?.amount ?? 100, unit: food.unit, calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats, mealType: templateMealType };
                          const checked = templateSelectedFoods.some((f) => f.name === food.name);
                          return (
                            <label key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(val) => {
                                  if (val) setTemplateSelectedFoods((prev) => [...prev, asItem]);
                                  else setTemplateSelectedFoods((prev) => prev.filter((f) => f.name !== food.name));
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{food.name}</p>
                                <p className="text-xs text-muted-foreground">{food.calories} kcal per serving</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {templateSelectedFoods.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-foreground mb-2">Selected ({templateSelectedFoods.length})</p>
                  <div className="space-y-1">
                    {templateSelectedFoods.map((food, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-foreground truncate">{food.name}</span>
                        <button
                          onClick={() => setTemplateSelectedFoods((prev) => prev.filter((_, i) => i !== idx))}
                          className="ml-2 text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-border text-xs font-medium text-foreground">
                    Total: {templateSelectedFoods.reduce((s, f) => s + (f.calories || 0), 0)} kcal ·{" "}
                    {templateSelectedFoods.reduce((s, f) => s + (f.protein || 0), 0).toFixed(0)}g P ·{" "}
                    {templateSelectedFoods.reduce((s, f) => s + (f.carbs || 0), 0).toFixed(0)}g C ·{" "}
                    {templateSelectedFoods.reduce((s, f) => s + (f.fats || 0), 0).toFixed(0)}g F
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateTemplateDialog(false)}>Cancel</Button>
              <Button
                onClick={() => void handleCreateTemplate()}
                disabled={!templateName.trim() || templateSelectedFoods.length === 0}
              >
                Save Meal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                {getMealFoods(meal.id).length > 0 && isToday && (
                  <button
                    onClick={() => void handleQuickSaveMeal(meal.label, meal.id, getMealFoods(meal.id))}
                    className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-primary/10"
                    title={`Save ${meal.label} as a meal`}
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Save</span>
                  </button>
                )}
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
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm">{getFoodEmoji(food.name)}</span>
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
                          onClick={() => foodKey && void handleRemoveFoodForDate(foodKey)}
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

    {showScanner && (
      <BarcodeScanner
        onScanSuccess={handleScanSuccess}
        onClose={() => setShowScanner(false)}
        onManualEntry={handleManualEntry}
      />
    )}
    </>
  );
};

export default FoodTracking;
