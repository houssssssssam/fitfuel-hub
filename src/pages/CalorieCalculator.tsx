import { useEffect, useState } from "react";
import { Calculator, Save, Target, Flame, Beef, Wheat, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const CalorieCalculator = () => {
  const [formData, setFormData] = useState({
    weight: "",
    height: "",
    age: "",
    gender: "male",
    activityLevel: "moderate",
    goal: "maintain",
  });

  const [results, setResults] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null>(null);

  const activityLevels = [
    { value: "sedentary", label: "Sedentary (little or no exercise)", multiplier: 1.2 },
    { value: "light", label: "Lightly active (1-3 days/week)", multiplier: 1.375 },
    { value: "moderate", label: "Moderately active (3-5 days/week)", multiplier: 1.55 },
    { value: "active", label: "Very active (6-7 days/week)", multiplier: 1.725 },
    { value: "extreme", label: "Extremely active (athlete)", multiplier: 1.9 },
  ];

  const goals = [
    { value: "cut", label: "Cut (Lose fat)", calorieAdjust: -500 },
    { value: "maintain", label: "Maintain", calorieAdjust: 0 },
    { value: "bulk", label: "Bulk (Build muscle)", calorieAdjust: 300 },
    { value: "aggressive-bulk", label: "Aggressive Bulk", calorieAdjust: 500 },
  ];

  const calculateMacros = () => {
    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height);
    const age = parseInt(formData.age);

    if (!weight || !height || !age) {
      toast.error("Please fill in all fields");
      return;
    }

    // Calculate BMR using Mifflin-St Jeor equation
    let bmr: number;
    if (formData.gender === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Apply activity multiplier
    const activity = activityLevels.find((a) => a.value === formData.activityLevel);
    const tdee = bmr * (activity?.multiplier || 1.55);

    // Apply goal adjustment
    const goal = goals.find((g) => g.value === formData.goal);
    const targetCalories = Math.round(tdee + (goal?.calorieAdjust || 0));

    // Calculate macros
    // Protein: 2g per kg for bodybuilding
    const protein = Math.round(weight * 2);
    // Fats: 25% of calories
    const fats = Math.round((targetCalories * 0.25) / 9);
    // Carbs: remaining calories
    const carbCalories = targetCalories - protein * 4 - fats * 9;
    const carbs = Math.round(carbCalories / 4);

    setResults({
      calories: targetCalories,
      protein,
      carbs,
      fats,
    });
  };

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) return;

    const { id } = JSON.parse(user);
    api
      .get(`/api/profile/${id}`)
      .then((res) => {
        const profile = res.data;
        setFormData((prev) => ({
          ...prev,
          weight: profile.weight?.toString?.() ?? prev.weight,
          height: profile.height?.toString?.() ?? prev.height,
          age: profile.age?.toString?.() ?? prev.age,
          gender: profile.gender ?? prev.gender,
          activityLevel: profile.activityLevel ?? prev.activityLevel,
          goal: profile.goal ?? prev.goal,
        }));
      })
      .catch(() => {
        // ignore: calculator still works without prefill
      });
  }, []);

  const saveTargets = async () => {
    if (!results) return;

    const user = localStorage.getItem("user");
    if (!user) {
      toast.error("Please log in to save targets");
      return;
    }

    const { id } = JSON.parse(user);

    try {
      await api.put(`/api/profile/${id}`, {
        nutritionTargets: results,
        // keep profile aligned with inputs used for the calculation
        weight: Number(formData.weight) || undefined,
        height: Number(formData.height) || undefined,
        age: Number(formData.age) || undefined,
        gender: formData.gender,
        activityLevel: formData.activityLevel,
        goal: formData.goal,
      });

      toast.success("Targets saved to your profile!", {
        description: `${results.calories} cal, ${results.protein}g protein`,
      });
    } catch (err) {
      toast.error("Failed to save targets");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Calorie Calculator</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Calculate your daily calorie and macro targets
        </p>
      </div>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
        {/* Calculator Form */}
        <div className="stat-card space-y-4 md:space-y-6">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-base md:text-lg font-semibold font-display text-foreground">
              Your Details
            </h2>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Weight (kg)</Label>
              <Input
                type="number"
                placeholder="e.g., 80"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Height (cm)</Label>
              <Input
                type="number"
                placeholder="e.g., 180"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Age</Label>
              <Input
                type="number"
                placeholder="e.g., 25"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Activity Level</Label>
            <Select value={formData.activityLevel} onValueChange={(v) => setFormData({ ...formData, activityLevel: v })}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {activityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Fitness Goal</Label>
            <Select value={formData.goal} onValueChange={(v) => setFormData({ ...formData, goal: v })}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {goals.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    {goal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="gradient" size="lg" className="w-full gap-2" onClick={calculateMacros}>
            <Calculator className="h-5 w-5" />
            Calculate Targets
          </Button>
        </div>

        {/* Results */}
        <div className="space-y-4 md:space-y-6">
          {results ? (
            <>
              <div className="stat-card border-primary/30 glow-primary">
                <div className="flex items-center gap-2 mb-4 md:mb-6">
                  <Target className="h-5 w-5 text-primary" />
                  <h2 className="text-base md:text-lg font-semibold font-display text-foreground">
                    Your Daily Targets
                  </h2>
                </div>

                <div className="grid gap-3 md:gap-4 grid-cols-2">
                  <div className="p-4 md:p-6 rounded-xl bg-secondary/50 text-center">
                    <Flame className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl md:text-4xl font-bold font-display text-primary">
                      {results.calories}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Daily Calories</p>
                  </div>
                  <div className="p-4 md:p-6 rounded-xl bg-secondary/50 text-center">
                    <Beef className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-accent" />
                    <p className="text-2xl md:text-4xl font-bold font-display text-accent">
                      {results.protein}g
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Protein</p>
                  </div>
                  <div className="p-4 md:p-6 rounded-xl bg-secondary/50 text-center">
                    <Wheat className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-warning" />
                    <p className="text-2xl md:text-4xl font-bold font-display text-warning">
                      {results.carbs}g
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Carbohydrates</p>
                  </div>
                  <div className="p-4 md:p-6 rounded-xl bg-secondary/50 text-center">
                    <Droplet className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-destructive" />
                    <p className="text-2xl md:text-4xl font-bold font-display text-destructive">
                      {results.fats}g
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Fats</p>
                  </div>
                </div>

                <Button variant="success" size="lg" className="w-full mt-4 md:mt-6 gap-2" onClick={saveTargets}>
                  <Save className="h-5 w-5" />
                  Save to Profile
                </Button>
              </div>

              <div className="stat-card">
                <h3 className="font-semibold text-foreground mb-4 text-sm md:text-base">Macro Breakdown</h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Protein ({results.protein}g × 4 cal)</span>
                    <span className="text-foreground">{results.protein * 4} cal ({Math.round((results.protein * 4 / results.calories) * 100)}%)</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Carbs ({results.carbs}g × 4 cal)</span>
                    <span className="text-foreground">{results.carbs * 4} cal ({Math.round((results.carbs * 4 / results.calories) * 100)}%)</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Fats ({results.fats}g × 9 cal)</span>
                    <span className="text-foreground">{results.fats * 9} cal ({Math.round((results.fats * 9 / results.calories) * 100)}%)</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="stat-card flex flex-col items-center justify-center py-12 md:py-16 text-center">
              <Calculator className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">
                Ready to Calculate
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Fill in your details and click calculate to get your personalized daily targets.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalorieCalculator;
