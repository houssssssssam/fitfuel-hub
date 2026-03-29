import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Flame, Dumbbell, Scale, Activity, Sofa, User, Zap, FlameKindling, CheckCircle2, Loader2, ArrowRight, ArrowLeft } from "lucide-react";

type NumericField = number | "";

const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);

  const [data, setData] = useState({
    age: 25 as NumericField,
    gender: "Male" as "Male" | "Female" | "Other",
    height: 175 as NumericField,
    weight: 70 as NumericField,
    goal: "Lose Weight",
    activity: "Moderately Active",
  });

  const parseNumericField = (value: NumericField): number => typeof value === "number" ? value : 0;
  const isStep1Valid = data.age !== "" && data.height !== "" && data.weight !== "";

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login");
      return;
    }
    const userObj = JSON.parse(userStr);
    setUserId(userObj.id);
  }, [navigate]);

  const handleNext = () => setStep((p) => Math.min(p + 1, 4));
  const handleBack = () => setStep((p) => Math.max(p - 1, 1));
  const handleSkip = () => navigate("/dashboard");

  const calculateMacros = () => {
    const age = parseNumericField(data.age);
    const height = parseNumericField(data.height);
    const weight = parseNumericField(data.weight);

    let bmr = 10 * weight + 6.25 * height - 5 * age;
    if (data.gender === "Male") bmr += 5;
    else if (data.gender === "Female") bmr -= 161;
    else bmr -= 78; // average offset for 'Other'

    const multipliers: Record<string, number> = {
      "Sedentary": 1.2,
      "Lightly Active": 1.375,
      "Moderately Active": 1.55,
      "Very Active": 1.725,
      "Extremely Active": 1.9,
    };
    const tdee = bmr * multipliers[data.activity];

    let calories = tdee;
    if (data.goal === "Lose Weight") calories -= 500;
    else if (data.goal === "Build Muscle") calories += 300;
    
    calories = Math.round(calories);

    const protein = Math.round(weight * (data.goal === "Build Muscle" ? 2.2 : 1.8));
    const fats = Math.round((calories * 0.25) / 9);
    const carbs = Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4));

    return { calories, protein, carbs, fats };
  };

  const submitProfile = async () => {
    if (!userId) return;
    if (!isStep1Valid) {
      toast.error("Please complete age, height, and weight.");
      return;
    }
    setLoading(true);
    try {
      const targets = calculateMacros();
      await api.put(`/api/profile/${userId}`, {
        nutritionTargets: targets,
        fitnessGoal: data.goal,
        activityLevel: data.activity,
        age: parseNumericField(data.age),
        gender: data.gender,
        height: parseNumericField(data.height),
        weight: parseNumericField(data.weight)
      });
      toast.success("Profile setup complete!");
      navigate("/dashboard");
    } catch (err) {
      toast.error("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step Renderers ────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">About You</h2>
        <p className="text-white/60">Help us calculate your metabolic rate.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/80 ml-1">Age</Label>
          <Input 
            type="number" 
            value={data.age} 
            onChange={(e) => setData({ ...data, age: e.target.value === "" ? "" : Number(e.target.value) })}
            className="h-12 bg-white/5 border-white/10 text-white text-lg text-center"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80 ml-1">Gender</Label>
          <div className="flex gap-2">
            {["Male", "Female", "Other"].map((g) => (
              <button
                key={g}
                onClick={() => setData({ ...data, gender: g as any })}
                className={`flex-1 h-12 rounded-xl border text-sm font-medium transition-all ${data.gender === g ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/80 ml-1">Height (cm)</Label>
          <Input 
            type="number" 
            value={data.height} 
            onChange={(e) => setData({ ...data, height: e.target.value === "" ? "" : Number(e.target.value) })}
            className="h-12 bg-white/5 border-white/10 text-white text-lg text-center"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80 ml-1">Weight (kg)</Label>
          <Input 
            type="number" 
            value={data.weight} 
            onChange={(e) => setData({ ...data, weight: e.target.value === "" ? "" : Number(e.target.value) })}
            className="h-12 bg-white/5 border-white/10 text-white text-lg text-center"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const goals = [
      { id: "Lose Weight", icon: Flame, desc: "Burn fat and get lean" },
      { id: "Build Muscle", icon: Dumbbell, desc: "Gain strength and size" },
      { id: "Maintain Weight", icon: Scale, desc: "Stay at your current weight" },
      { id: "Improve Fitness", icon: Activity, desc: "Boost endurance and health" },
    ];
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Your Goal</h2>
          <p className="text-white/60">What are you trying to achieve?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => (
            <div
              key={g.id}
              onClick={() => setData({ ...data, goal: g.id })}
              className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 ${data.goal === g.id ? 'bg-cyan-500/10 border-cyan-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
            >
              <g.icon className={`h-8 w-8 mb-4 ${data.goal === g.id ? 'text-cyan-400' : 'text-white/40'}`} />
              <h3 className="text-white font-bold text-lg mb-1">{g.id}</h3>
              <p className="text-sm text-white/50">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const activities = [
      { id: "Sedentary", icon: Sofa, desc: "Little or no exercise" },
      { id: "Lightly Active", icon: User, desc: "Light exercise 1-3 days/week" },
      { id: "Moderately Active", icon: Activity, desc: "Moderate exercise 3-5 days/week" },
      { id: "Very Active", icon: FlameKindling, desc: "Hard exercise 6-7 days/week" },
      { id: "Extremely Active", icon: Zap, desc: "Very hard exercise, physical job" },
    ];
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Activity Level</h2>
          <p className="text-white/60">How active is your lifestyle?</p>
        </div>
        <div className="space-y-3">
          {activities.map((a) => (
            <div
              key={a.id}
              onClick={() => setData({ ...data, activity: a.id })}
              className={`flex items-center p-4 rounded-2xl cursor-pointer border-2 transition-all duration-300 ${data.activity === a.id ? 'bg-cyan-500/10 border-cyan-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
            >
              <div className={`mr-4 p-3 rounded-xl ${data.activity === a.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/40'}`}>
                <a.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-white font-bold">{a.id}</h3>
                <p className="text-sm text-white/50">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const targets = calculateMacros();
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Your Plan is Ready</h2>
          <p className="text-white/60">We've calculated your exact daily targets.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card bg-[#0F1C2E] border-white/5 p-4 rounded-2xl text-center shadow-lg">
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Calories</p>
            <p className="text-4xl font-extrabold text-cyan-400">{targets.calories}</p>
            <p className="text-white/40 text-xs mt-1">kcal / day</p>
          </div>
          <div className="stat-card bg-[#0F1C2E] border-white/5 p-4 rounded-2xl text-center shadow-lg">
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Protein</p>
            <p className="text-4xl font-extrabold text-green-400">{targets.protein}g</p>
            <p className="text-white/40 text-xs mt-1">{Math.round((targets.protein * 4 / targets.calories) * 100)}% of diet</p>
          </div>
          <div className="stat-card bg-[#0F1C2E] border-white/5 p-4 rounded-2xl text-center shadow-lg">
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Carbs</p>
            <p className="text-3xl font-extrabold text-yellow-400">{targets.carbs}g</p>
            <p className="text-white/40 text-xs mt-1">{Math.round((targets.carbs * 4 / targets.calories) * 100)}% of diet</p>
          </div>
          <div className="stat-card bg-[#0F1C2E] border-white/5 p-4 rounded-2xl text-center shadow-lg">
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Fats</p>
            <p className="text-3xl font-extrabold text-red-400">{targets.fats}g</p>
            <p className="text-white/40 text-xs mt-1">25% of diet</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/5 mt-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-cyan-400" />
            <h4 className="text-white font-semibold">Summary</h4>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            Based on your profile, your maintenance TDEE is roughly {Math.round(targets.calories + (data.goal === 'Lose Weight' ? 500 : data.goal === 'Build Muscle' ? -300 : 0))} kcal. 
            We've adjusted your intake targets to align with your goal to <strong className="text-white">{data.goal.toLowerCase()}</strong>.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 selection:bg-cyan-500/30">
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .slide-step { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      
      {/* Skip Button */}
      <button 
        onClick={handleSkip}
        className="absolute top-6 right-6 text-white/40 hover:text-white/80 font-medium transition-colors z-20"
      >
        Skip for now
      </button>

      {/* Progress Bar Container */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-700 ease-out"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <div className="w-full max-w-xl">
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
          
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div key={step} className="slide-step relative z-10">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </div>

          <Separator className="my-8 bg-white/10 relative z-10" />

          <div className="flex items-center justify-between relative z-10">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || loading}
              className={`text-white/60 hover:text-white hover:bg-white/10 ${step === 1 ? 'invisible' : ''}`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={step === 1 && !isStep1Valid}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-8"
              >
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={submitProfile}
                disabled={loading}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 text-white font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] px-8 transition-all"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {loading ? "Saving..." : "Start My Journey"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
