import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  X, ImageOff, Clock, Flame, Info, CheckCircle2, 
  Circle, ChevronRight, Loader2, Plus, ArrowRight, Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WeeklyMealDetails {
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: string;
  ingredients: { item: string; amount: string; note?: string }[];
  steps: { step: number; title: string; instruction: string }[];
  tips: string[];
}

export interface SelectedMeal {
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prepTime: string;
  foods: string[];
  mealType: string;
}

interface ModalProps {
  meal: SelectedMeal;
  onClose: () => void;
}

export default function WeeklyMealModal({ meal, onClose }: ModalProps) {
  const queryClient = useQueryClient();
  const userStr = localStorage.getItem("user");
  const userId = userStr ? JSON.parse(userStr).id : null;

  const [activeTab, setActiveTab] = useState<"ingredients" | "instructions" | "tips">("ingredients");
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState<number>(1);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  // 1. Lock Body Scroll & Keyboard Esc
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  // 2. Fetch Unsplash Photo
  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const query = encodeURIComponent(meal.name + " food");
        const res = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=1`, {
          headers: {
            Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`
          }
        });
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setImgUrl(data.results[0].urls.regular);
        }
      } catch (err) {
        console.error("Unsplash error", err);
      }
    };
    fetchPhoto();
  }, [meal.name]);

  // 3. Fetch Advanced Details from Backend
  const { data: details, isLoading } = useQuery<WeeklyMealDetails>({
    queryKey: ["mealDetails", meal.name],
    queryFn: async () => {
      const res = await api.post("/api/meals/details", {
        name: meal.name,
        description: meal.description || meal.name,
        foods: meal.foods
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // 4. Add to Logger
  const addMealToToday = useMutation({
    mutationFn: async () => {
      const foodItem = {
        name: meal.name,
        quantity: 1,
        unit: "serving",
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        mealType: meal.mealType,
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
      toast.success(`${meal.name} logged to today's intake!`);
      onClose();
    },
    onError: () => toast.error("Failed to add meal"),
  });

  const toggleCheck = (idx: number) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setCheckedItems(newSet);
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[85vh] md:max-w-6xl bg-[#0B0F19] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10 animate-in zoom-in-95 duration-300">
        
        {/* Left Column - Sticky Info (40%) */}
        <div className="w-full md:w-[40%] bg-secondary/30 flex flex-col relative shrink-0">
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 md:hidden bg-black/50 text-white p-2 rounded-full backdrop-blur-md"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative h-64 md:h-80 w-full bg-secondary shrink-0 overflow-hidden">
            {imgUrl ? (
              <img src={imgUrl} alt={meal.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
            ) : (
              <div className="flex items-center justify-center h-full w-full opacity-20">
                <ImageOff className="h-16 w-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/60 to-transparent" />
            
            <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md">
              {meal.mealType}
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight mb-2 drop-shadow-md">
                {meal.name}
              </h2>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 scrollbar-none flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Macros */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <div className="text-red-400 font-bold text-xl">{meal.calories}</div>
                  <div className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mt-1">Kcal</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                  <div className="text-blue-400 font-bold text-xl">{meal.protein}g</div>
                  <div className="text-[10px] text-blue-500/70 uppercase font-bold tracking-wider mt-1">Prot</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                  <div className="text-yellow-400 font-bold text-xl">{meal.carbs}g</div>
                  <div className="text-[10px] text-yellow-500/70 uppercase font-bold tracking-wider mt-1">Carb</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                  <div className="text-purple-400 font-bold text-xl">{meal.fats}g</div>
                  <div className="text-[10px] text-purple-500/70 uppercase font-bold tracking-wider mt-1">Fat</div>
                </div>
              </div>

              {/* Meta */}
              <div className="bg-white/5 rounded-2xl p-4 flex justify-between items-center text-sm font-medium">
                <div className="flex flex-col items-center">
                  <span className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Prep</span>
                  <span className="text-white">{details?.prepTime || meal.prepTime || "-- min"}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Cook</span>
                  <span className="text-white">{details?.cookTime || "-- min"}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Serves</span>
                  <span className="text-white">{details?.servings || 1}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Level</span>
                  <span className="text-white capitalize">{details?.difficulty || "Easy"}</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => addMealToToday.mutate()}
              disabled={addMealToToday.isPending}
              className="w-full h-14 mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
            >
              {addMealToToday.isPending ? <Loader2 className="h-5 w-5 animate-spin mx-auto"/> : (
                <>
                  <Plus className="h-5 w-5 mr-2" /> Add to Today's Log
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column - Scrolling Content (60%) */}
        <div className="w-full md:w-[60%] h-full flex flex-col bg-background/50 relative">
          
          <button 
            onClick={onClose}
            className="hidden md:flex absolute top-4 right-4 z-20 text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Tabs */}
          <div className="flex items-center gap-6 px-6 md:px-10 pt-8 border-b border-border/50 shrink-0 overflow-x-auto scrollbar-none">
            {["ingredients", "instructions", "tips"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap relative ${
                  activeTab === tab 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-t-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                )}
              </button>
            ))}
          </div>

          {/* Scrolling Tab Content */}
          <div className="p-6 md:p-10 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-white/10 relative">
            
            {isLoading && (
              <div className="absolute inset-0 flex flex-col p-10 space-y-4">
                <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
                <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && details && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* INGREDIENTS */}
                {activeTab === "ingredients" && (
                  <div className="space-y-3">
                    {details.ingredients.map((ing, idx) => {
                      const isChecked = checkedItems.has(idx);
                      return (
                        <div 
                          key={idx}
                          onClick={() => toggleCheck(idx)}
                          className={`group flex items-center justify-between p-4 rounded-xl border border-white/5 transition-all cursor-pointer ${
                            isChecked 
                              ? "bg-primary/10 border-primary/20 opacity-60" 
                              : "bg-white/[0.02] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                              isChecked ? "bg-primary text-primary-foreground" : "bg-white/10 text-transparent border border-white/20"
                            }`}>
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <div>
                              <div className={`font-semibold text-white/90 transition-all ${isChecked ? "line-through text-white/50" : ""}`}>
                                {ing.item}
                              </div>
                              {ing.note && (
                                <div className="text-xs text-white/40 mt-0.5">{ing.note}</div>
                              )}
                            </div>
                          </div>
                          <div className="bg-white/10 px-3 py-1 rounded-md text-sm font-bold text-white/80">
                            {ing.amount}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* INSTRUCTIONS */}
                {activeTab === "instructions" && (
                  <div className="relative pl-4 border-l-2 border-primary/20 space-y-8 py-2">
                    {details.steps.map((stepData) => {
                      const isActive = activeStep === stepData.step;
                      return (
                        <div 
                          key={stepData.step}
                          onClick={() => setActiveStep(stepData.step)}
                          className={`relative pl-8 cursor-pointer group transition-all duration-300 ${
                            isActive ? "opacity-100 scale-100" : "opacity-50 hover:opacity-80 scale-[0.98]"
                          }`}
                        >
                          <div className={`absolute top-0 -left-[27px] h-12 w-12 rounded-full border-4 border-background flex items-center justify-center font-bold text-lg transition-colors ${
                            isActive 
                              ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(34,211,238,0.5)]" 
                              : "bg-secondary text-white/50"
                          }`}>
                            {stepData.step}
                          </div>
                          
                          <h3 className={`text-xl font-bold font-display mb-2 transition-colors ${
                            isActive ? "text-primary" : "text-white/80"
                          }`}>
                            {stepData.title}
                          </h3>
                          
                          <p className={`text-sm leading-relaxed ${isActive ? "text-white/80" : "text-white/40"}`}>
                            {stepData.instruction}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TIPS & NUTRITION */}
                {activeTab === "tips" && (
                  <div className="space-y-6">
                    {/* Nutrition Breakdown Bar */}
                    <div className="stat-card">
                      <h4 className="font-bold text-white/80 mb-4 flex items-center gap-2">
                        <Flame className="h-4 w-4 text-primary" /> Macro Visualizer
                      </h4>
                      <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden flex">
                        <div 
                          title={`Protein: ${meal.protein}g`}
                          className="h-full bg-blue-500 hover:brightness-110 transition-all cursor-pointer" 
                          style={{ width: `${(meal.protein * 4 / meal.calories) * 100}%` }} 
                        />
                        <div 
                          title={`Carbs: ${meal.carbs}g`}
                          className="h-full bg-yellow-500 hover:brightness-110 transition-all cursor-pointer" 
                          style={{ width: `${(meal.carbs * 4 / meal.calories) * 100}%` }} 
                        />
                        <div 
                          title={`Fats: ${meal.fats}g`}
                          className="h-full bg-purple-500 hover:brightness-110 transition-all cursor-pointer" 
                          style={{ width: `${(meal.fats * 9 / meal.calories) * 100}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-3 font-semibold uppercase tracking-widest text-white/50">
                        <span className="text-blue-400">Protein</span>
                        <span className="text-yellow-400">Carbs</span>
                        <span className="text-purple-400">Fats</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {details.tips.map((tip, idx) => (
                        <div key={idx} className="flex gap-4 bg-white/5 p-4 rounded-xl border-l-4 border-l-yellow-400">
                          <Lightbulb className="h-6 w-6 text-yellow-400 shrink-0" />
                          <p className="text-sm text-white/70 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
