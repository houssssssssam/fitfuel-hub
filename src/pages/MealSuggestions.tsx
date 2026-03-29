import { useState, useEffect, useCallback } from "react";
import { Plus, Flame, Beef, RefreshCw, Clock, ImageOff, X, ChefHat, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

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

interface MealDetails {
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: string;
  ingredients: { item: string; amount: string; note?: string }[];
  steps: { step: number; title: string; instruction: string }[];
  tips: string[];
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];
const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

const fetchMealPhoto = async (query: string): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } },
    );
    const data = await res.json();
    return data.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
};

const MealDetailModal = ({
  meal,
  onClose,
  onAdd,
}: {
  meal: Meal;
  onClose: () => void;
  onAdd: (meal: Meal) => void;
}) => {
  const { t } = useTranslation();
  const [details, setDetails] = useState<MealDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.post<MealDetails>("/api/meals/details", {
          name: meal.name,
          description: meal.description,
          foods: meal.foods,
        });
        setDetails(res.data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load meal details");
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [meal]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
        <div className="relative h-56 w-full overflow-hidden rounded-t-2xl">
          {meal.photo ? (
            <img src={meal.photo} alt={meal.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <ImageOff className="h-10 w-10 text-muted-foreground opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-12">
            <h2 className="text-2xl font-bold text-white">{meal.name}</h2>
            <p className="text-sm text-white/80 mt-1">{meal.description}</p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-secondary/50">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Flame className="h-4 w-4" />
                <span className="font-bold">{meal.calories}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Calories</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-accent">
                <Beef className="h-4 w-4" />
                <span className="font-bold">{meal.protein}g</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Protein</p>
            </div>
            <div className="text-center">
              <span className="font-bold text-warning">{meal.carbs}g</span>
              <p className="text-xs text-muted-foreground mt-1">Carbs</p>
            </div>
            <div className="text-center">
              <span className="font-bold text-destructive">{meal.fats}g</span>
              <p className="text-xs text-muted-foreground mt-1">Fats</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-secondary rounded w-1/3" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="h-3 bg-secondary rounded" />
                ))}
              </div>
            </div>
          ) : details ? (
            <>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm">{t("prepTime", { time: details.prepTime })}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-2">
                  <ChefHat className="h-4 w-4 text-accent" />
                  <span className="text-sm">{t("cookTime", { time: details.cookTime })}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-2">
                  <Users className="h-4 w-4 text-warning" />
                  <span className="text-sm">{t("serves", { count: details.servings })}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{details.difficulty}</span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">{t("ingredients")}</h3>
                <div className="space-y-2">
                  {details.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <span className="text-sm font-medium text-foreground">{ingredient.item}</span>
                        {ingredient.note && <span className="text-xs text-muted-foreground ml-2">({ingredient.note})</span>}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0 ml-2">
                        {ingredient.amount}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">{t("instructions")}</h3>
                <div className="space-y-3">
                  {details.steps.map((step) => (
                    <div key={step.step} className="flex gap-3">
                      <div className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                        {step.step}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{step.instruction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {details.tips?.length > 0 && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <h3 className="text-sm font-semibold text-primary mb-2">{t("chefTips")}</h3>
                  <ul className="space-y-1">
                    {details.tips.map((tip, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}

          <Button variant="gradient" className="w-full gap-2 h-11" onClick={() => { onAdd(meal); onClose(); }}>
            <Plus className="h-4 w-4" />
            {t("addToDailyIntake")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const MealSuggestions = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("breakfast");
  const [meals, setMeals] = useState<Record<string, Meal[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

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
      const res = await api.get<Meal[]>(`/api/meals/${userId}`, { params: { mealType } });
      const mealsWithPhotos = await Promise.all(
        res.data.map(async (meal) => ({
          ...meal,
          photo: await fetchMealPhoto(meal.searchQuery || meal.name),
        })),
      );
      setMeals((prev) => ({ ...prev, [mealType]: mealsWithPhotos }));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load meal suggestions");
    } finally {
      setLoading((prev) => ({ ...prev, [mealType]: false }));
    }
  }, []);

  useEffect(() => {
    if (!meals[activeTab] && !loading[activeTab]) {
      void fetchMeals(activeTab);
    }
  }, [activeTab, fetchMeals, loading, meals]);

  const handleAddMeal = async (meal: Meal) => {
    const userId = getUserId();
    if (!userId) {
      toast.error("Please log in");
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
      toast.success(`Added "${meal.name}"`, {
        description: `${meal.calories} cal • ${meal.protein}g protein`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to add meal");
    }
  };

  const MealCard = ({ meal }: { meal: Meal }) => (
    <div
      className="stat-card group overflow-hidden p-0 flex flex-col cursor-pointer hover:ring-2 hover:ring-primary transition-all duration-200"
      onClick={() => setSelectedMeal(meal)}
    >
      <div className="relative h-44 w-full bg-secondary overflow-hidden">
        {meal.photo ? (
          <img src={meal.photo} alt={meal.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8 opacity-40" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm gap-1">
            <Clock className="h-3 w-3" />
            {meal.prepTime}
          </Badge>
        </div>
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
            {t("viewRecipe")}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{meal.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{meal.description}</p>
        </div>

        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1.5">{t("ingredients")}:</p>
          <div className="flex flex-wrap gap-1.5">
            {meal.foods.map((food, index) => (
              <Badge key={index} variant="outline" className="bg-secondary/50 border-border text-foreground text-xs">
                {food}
              </Badge>
            ))}
          </div>
        </div>

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

        <div className="mt-auto">
          <Button
            variant="gradient"
            className="w-full gap-2 h-9 text-sm"
            onClick={(event) => {
              event.stopPropagation();
              void handleAddMeal(meal);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("addToDailyIntake")}
          </Button>
        </div>
      </div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className="stat-card p-0 overflow-hidden animate-pulse">
          <div className="h-44 bg-secondary w-full" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-secondary rounded w-3/4" />
            <div className="h-3 bg-secondary rounded w-full" />
            <div className="flex gap-2">
              {[1, 2, 3].map((key) => (
                <div key={key} className="h-5 bg-secondary rounded w-16" />
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
      {selectedMeal && (
        <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} onAdd={handleAddMeal} />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t("mealSuggestionsTitle")}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">{t("mealSuggestionsSubtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void fetchMeals(activeTab)} disabled={loading[activeTab]}>
          <RefreshCw className={`h-4 w-4 ${loading[activeTab] ? "animate-spin" : ""}`} />
          {t("regenerate")}
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
