import { api } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Apple, Search } from "lucide-react";
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

interface FoodItem {
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

interface FoodSearchResult {
  _id: string;
  name: string;
  servingSize: { amount: number; unit: string };
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

// ─── Unit helpers ────────────────────────────────────────────────────────────

const getUnitOptions = (foodName: string): string[] => {
  const name = foodName.toLowerCase();
  if (!name) return ["g", "kg", "ml", "L", "oz", "tbsp", "tsp", "piece"];

  if (/(milk|juice|water|drink|smoothie|shake|tea|coffee|soup|broth|beverage)/i.test(name))
    return ["ml", "L", "fl oz"];

  if (/(oil|butter|ghee|cream|sauce|dressing|syrup|honey|jam|vinegar|mayo)/i.test(name))
    return ["tbsp", "tsp", "ml", "g"];

  if (/(egg)/i.test(name))
    return ["piece", "g"];

  if (/(yogurt|cottage cheese|hummus|peanut butter|almond butter)/i.test(name))
    return ["g", "tbsp", "cup"];

  if (/(rice|oat|cereal|granola|flour|powder|protein powder)/i.test(name))
    return ["g", "cup", "tbsp"];

  return ["g", "kg", "oz"];
};

const toGrams = (quantity: number, unit: string, foodName: string): number => {
  switch (unit) {
    case "kg":      return quantity * 1000;
    case "oz":      return quantity * 28.35;
    case "L":       return quantity * 1000;
    case "fl oz":   return quantity * 29.57;
    case "tbsp":    return quantity * 15;
    case "tsp":     return quantity * 5;
    case "cup":     return quantity * 240;
    case "piece": {
      // smarter piece weight based on food name
      const n = foodName.toLowerCase();
      if (n.includes("egg"))     return quantity * 50;
      if (n.includes("banana"))  return quantity * 120;
      if (n.includes("apple"))   return quantity * 180;
      if (n.includes("orange"))  return quantity * 150;
      return quantity * 100; // generic piece
    }
    default: return quantity; // g or ml (1:1)
  }
};

// ─────────────────────────────────────────────────────────────────────────────

const FoodTracking = () => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [intake, setIntake] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [targets, setTargets] = useState({ calories: 2500, protein: 180, carbs: 300, fats: 80 });
  const [newFood, setNewFood] = useState({ name: "", quantity: "", mealType: "breakfast" });
  const [selectedUnit, setSelectedUnit] = useState("g");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const updateDailyIntake = async (payload) => {
    const user = localStorage.getItem("user");
    if (!user) return null;
    const { id } = JSON.parse(user);
    try {
      const res = await api.put(`/api/profile/${id}/intake`, payload);
      return res.data as { dailyIntake: typeof intake; foods: FoodItem[] };
    } catch (err) {
      console.error("Failed to update intake", err);
      return null;
    }
  };

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) return;
    const { id } = JSON.parse(user);
    api
      .get(`/api/profile/${id}`)
      .then((res) => {
        setIntake(res.data.dailyIntake);
        setFoods(res.data.foods || []);
        setTargets(res.data.nutritionTargets || { calories: 2500, protein: 180, carbs: 300, fats: 80 });
      })
      .catch((err) => console.error(err));
  }, []);

  const totals = foods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.calories,
      protein:  acc.protein  + food.protein,
      carbs:    acc.carbs    + food.carbs,
      fats:     acc.fats     + food.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const remaining = {
    calories: targets.calories - totals.calories,
    protein:  targets.protein  - totals.protein,
    carbs:    targets.carbs    - totals.carbs,
    fats:     targets.fats     - totals.fats,
  };

  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await api.get<FoodSearchResult[]>("/api/foods/search", { params: { q: term } });
      setSearchResults(res.data);
    } catch (err) {
      console.error("Food search failed", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleAddFood = async () => {
    const selectedFood = searchResults.find((f) => f.name === newFood.name);
    if (!selectedFood || !newFood.quantity) return;

    const quantity = parseFloat(newFood.quantity);
    const quantityInGrams = toGrams(quantity, selectedUnit, newFood.name);
    const multiplier = quantityInGrams / selectedFood.servingSize.amount;

    const foodItem: FoodItem = {
      name:     newFood.name,
      quantity,
      unit:     selectedUnit,
      calories: Math.round(selectedFood.calories * multiplier),
      protein:  Math.round(selectedFood.protein  * multiplier),
      carbs:    Math.round(selectedFood.carbs     * multiplier),
      fats:     Math.round(selectedFood.fats      * multiplier),
      mealType: newFood.mealType,
    };

    const updated = await updateDailyIntake({
      calories: foodItem.calories,
      protein:  foodItem.protein,
      carbs:    foodItem.carbs,
      fats:     foodItem.fats,
      food:     foodItem,
    });

    if (updated) {
      setFoods(updated.foods || []);
      setIntake(updated.dailyIntake);
    }

    setNewFood({ name: "", quantity: "", mealType: "breakfast" });
    setSearchTerm("");
    setSelectedUnit("g");
  };

  const removeFood = async (foodId: string) => {
    const user = localStorage.getItem("user");
    if (!user) return;
    const { id } = JSON.parse(user);
    try {
      setFoods((prev) => prev.filter((f) => (f._id ?? f.id) !== foodId));
      const res = await api.delete(`/api/profile/${id}/food/${foodId}`);
      setFoods(res.data.foods || []);
      setIntake(res.data.dailyIntake);
    } catch (err) {
      console.error("Failed to delete food", err);
    }
  };

  const getMealFoods = (mealType: string) => foods.filter((f) => f.mealType === mealType);

  const mealTypes = [
    { id: "breakfast", label: "Breakfast", icon: "🌅" },
    { id: "lunch",     label: "Lunch",     icon: "☀️" },
    { id: "dinner",    label: "Dinner",    icon: "🌙" },
    { id: "snacks",    label: "Snacks",    icon: "🍎" },
  ];

  const unitOptions = getUnitOptions(newFood.name);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Food Tracking</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Track your daily nutrition with precision
        </p>
      </div>

      {/* Daily Summary */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-base md:text-lg font-semibold font-display text-foreground mb-4 md:mb-6">
            Daily Progress
          </h3>
          <div className="space-y-4 md:space-y-6">
            <ProgressBar label="Calories" current={intake.calories} target={targets.calories} variant="primary" />
            <ProgressBar label="Protein"  current={intake.protein}  target={targets.protein}  unit="g" variant="accent" />
            <ProgressBar label="Carbs"    current={intake.carbs}    target={targets.carbs}    unit="g" variant="warning" />
            <ProgressBar label="Fats"     current={intake.fats}     target={targets.fats}     unit="g" variant="destructive" />
          </div>
        </div>

        <div className="stat-card">
          <h3 className="text-base md:text-lg font-semibold font-display text-foreground mb-4">
            Remaining
          </h3>
          <div className="space-y-3 md:space-y-4">
            {(["calories", "protein", "carbs", "fats"] as const).map((key) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm md:text-base text-muted-foreground capitalize">{key}</span>
                <span className={`font-bold ${remaining[key] >= 0 ? "text-primary" : "text-destructive"}`}>
                  {remaining[key]}{key !== "calories" ? "g" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Food Form */}
      <div className="stat-card">
        <h3 className="text-base md:text-lg font-semibold font-display text-foreground mb-4">
          Add Food
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Search */}
          <div className="sm:col-span-2 space-y-2 relative">
            <Label className="text-sm">Search Food</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search foods..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setNewFood({ ...newFood, name: "" });
                  setSelectedUnit("g");
                  performSearch(e.target.value);
                }}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            {searchTerm && !newFood.name && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchLoading && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">Searching...</div>
                )}
                {!searchLoading && searchResults.length === 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">No foods found</div>
                )}
                {searchResults.map((food) => (
                  <button
                    key={food._id}
                    onClick={() => {
                      const autoUnit = getUnitOptions(food.name)[0];
                      setNewFood({ ...newFood, name: food.name });
                      setSearchTerm(food.name);
                      setSelectedUnit(autoUnit);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-secondary flex justify-between items-center text-sm"
                  >
                    <span>{food.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {food.calories} cal / {food.servingSize.amount}{food.servingSize.unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity + Unit */}
          <div className="space-y-2">
            <Label className="text-sm">Quantity</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="e.g., 150"
                value={newFood.quantity}
                onChange={(e) => setNewFood({ ...newFood, quantity: e.target.value })}
                className="bg-secondary border-border"
              />
              <Select
                value={selectedUnit}
                onValueChange={setSelectedUnit}
              >
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
            {/* Live macro preview */}
            {newFood.name && newFood.quantity && (() => {
              const food = searchResults.find((f) => f.name === newFood.name);
              if (!food) return null;
              const grams = toGrams(parseFloat(newFood.quantity), selectedUnit, newFood.name);
              const m = grams / food.servingSize.amount;
              return (
                <p className="text-xs text-muted-foreground">
                  ≈ {Math.round(food.calories * m)} cal •{" "}
                  {Math.round(food.protein * m)}p •{" "}
                  {Math.round(food.carbs * m)}c •{" "}
                  {Math.round(food.fats * m)}f
                </p>
              );
            })()}
          </div>

          {/* Meal Type */}
          <div className="space-y-2">
            <Label className="text-sm">Meal</Label>
            <Select value={newFood.mealType} onValueChange={(v) => setNewFood({ ...newFood, mealType: v })}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {mealTypes.map((meal) => (
                  <SelectItem key={meal.id} value={meal.id}>
                    {meal.icon} {meal.label}
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
          Add Food
        </Button>
      </div>

      {/* Meals */}
      <div className="grid gap-4 md:gap-6 sm:grid-cols-2">
        {mealTypes.map((meal) => (
          <div key={meal.id} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold font-display text-foreground">
                {meal.icon} {meal.label}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {getMealFoods(meal.id).reduce((acc, f) => acc + f.calories, 0)} cal
              </Badge>
            </div>
            <div className="space-y-2">
              {getMealFoods(meal.id).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No foods added</p>
              ) : (
                getMealFoods(meal.id).map((food) => {
                  const foodKey = (food._id ?? food.id) as string | undefined;
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
                            {food.quantity}{food.unit} • {food.protein}p • {food.carbs}c • {food.fats}f
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 shrink-0">
                        <span className="text-xs md:text-sm font-medium text-primary">{food.calories} cal</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                          onClick={() => foodKey && removeFood(foodKey)}
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
      </div>
    </div>
  );
};

export default FoodTracking;