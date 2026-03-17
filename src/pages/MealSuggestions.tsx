import { useState, useEffect, useCallback } from "react";
import { Plus, Flame, Beef, RefreshCw, Clock, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Meal {
  id: string;
  name: string;
  description: string;
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prepTime: string;
  searchQuery: string;
  photo?: string;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];
const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

const fetchMealPhoto = async (query: string): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );
    const data = await res.json();
    return data.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
};

const MealSuggestions = () => {
  const [activeTab, setActiveTab] = useState("breakfast");
  const [meals, setMeals] = useState<Record<string, Meal[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const getUserId = () => {
    const user = localStorage.getItem("user");
    if (!user) return null;
    return JSON.parse(user).id;
  };

  const fetchMeals = useCallback(async (mealType: string) => {
    const userId = getUserId();
    if (!userId) return;

    setLoading((prev) => ({ ...prev, [mealType]: true }));
    try {
      const res = await api.get<Meal[]>(`/api/meals/${userId}`, {
        params: { mealType },
      });

      // Fetch photos in parallel for all meals
      const mealsWithPhotos = await Promise.all(
        res.data.map(async (meal) => {
          const photo = await fetchMealPhoto(meal.searchQuery || meal.name);
          return { ...meal, photo };
        })
      );

      setMeals((prev) => ({ ...prev, [mealType]: mealsWithPhotos }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load meal suggestions");
    } finally {
      setLoading((prev) => ({ ...prev, [mealType]: false }));
    }
  }, []);

  useEffect(() => {
    if (!meals[activeTab] && !loading[activeTab]) {
      fetchMeals(activeTab);
    }
  }, [activeTab]);

  const handleAddMeal = async (meal: Meal) => {
    const userId = getUserId();
    if (!userId) {
      toast.error("Please log in to add meals");
      return;
    }
    try {
      await api.put(`/api/profile/${userId}/intake`, {
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        food: {
          name: meal.name,
          quantity: 1,
          unit: "meal",
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fats: meal.fats,
          mealType: activeTab,
        },
      });
      toast.success(`Added "${meal.name}" to today's intake`, {
        description: `${meal.calories} cal • ${meal.protein}g protein`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to add meal to intake");
    }
  };

  const MealCard = ({ meal }: { meal: Meal }) => (
    <div className="stat-card group overflow-hidden p-0 flex flex-col">
      {/* Photo */}
      <div className="relative h-44 w-full bg-secondary overflow-hidden">
        {meal.photo ? (
          <img
            src={meal.photo}
            alt={meal.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8 opacity-40" />
          </div>
        )}
        {/* Prep time badge over image */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm gap-1">
            <Clock className="h-3 w-3" />
            {meal.prepTime}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
            {meal.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{meal.description}</p>
        </div>

        {/* Ingredients */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1.5">Ingredients:</p>
          <div className="flex flex-wrap gap-1.5">
            {meal.foods.map((food, i) => (
              <Badge
                key={i}
                variant="outline"
                className="bg-secondary/50 border-border text-foreground text-xs"
              >
                {food}
              </Badge>
            ))}
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-secondary/50 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 text-primary">
              <Flame className="h-3 w-3" />
              <span className="font-bold text-sm">{meal.calories}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Cal</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 text-accent">
              <Beef className="h-3 w-3" />
              <span className="font-bold text-sm">{meal.protein}g</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Protein</p>
          </div>
          <div className="text-center">
            <span className="font-bold text-sm text-warning">{meal.carbs}g</span>
            <p className="text-xs text-muted-foreground mt-0.5">Carbs</p>
          </div>
          <div className="text-center">
            <span className="font-bold text-sm text-destructive">{meal.fats}g</span>
            <p className="text-xs text-muted-foreground mt-0.5">Fats</p>
          </div>
        </div>

        {/* Button pinned to bottom */}
        <div className="mt-auto">
          <Button
            variant="gradient"
            className="w-full gap-2 h-9 text-sm"
            onClick={() => handleAddMeal(meal)}
          >
            <Plus className="h-4 w-4" />
            Add to Daily Intake
          </Button>
        </div>
      </div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="stat-card p-0 overflow-hidden animate-pulse">
          <div className="h-44 bg-secondary w-full" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-secondary rounded w-3/4" />
            <div className="h-3 bg-secondary rounded w-full" />
            <div className="flex gap-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-5 bg-secondary rounded w-16" />
              ))}
            </div>
            <div className="h-12 bg-secondary rounded" />
            <div className="h-9 bg-secondary rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
            Meal Suggestions
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            AI-generated meals personalized to your macro targets
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fetchMeals(activeTab)}
          disabled={loading[activeTab]}
        >
          <RefreshCw className={`h-4 w-4 ${loading[activeTab] ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-secondary/50 h-auto p-1">
          {MEAL_TYPES.map((type) => (
            <TabsTrigger
              key={type}
              value={type}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 capitalize"
            >
              {type}
            </TabsTrigger>
          ))}
        </TabsList>

        {MEAL_TYPES.map((type) => (
          <TabsContent key={type} value={type} className="mt-4 md:mt-6">
            {loading[type] ? (
              <LoadingSkeleton />
            ) : meals[type] ? (
              <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {meals[type].map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default MealSuggestions;