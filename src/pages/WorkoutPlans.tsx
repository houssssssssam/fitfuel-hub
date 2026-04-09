import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Check, ChevronRight, Calendar, Target, Dumbbell, Sparkles, Loader2, Clock, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  restSeconds: number;
  notes: string;
  targetMuscle: string;
}

interface GeneratedWorkout {
  name: string;
  focusMuscles: string[];
  estimatedDuration: number;
  exercises: GeneratedExercise[];
  warmup: string;
  cooldown: string;
  generatedAt: string;
  recentMuscles: string[];
  suggestedFocus: string[];
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  daysPerWeek: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  focus: string[];
  schedule: { day: string; muscles: string[]; exercises: string[] }[];
}

const workoutPlans: WorkoutPlan[] = [
  {
    id: "ppl",
    name: "Push / Pull / Legs (PPL)",
    description: "Classic 6-day split targeting each muscle group twice per week for maximum hypertrophy.",
    daysPerWeek: 6,
    level: "Intermediate",
    focus: ["Hypertrophy", "Strength"],
    schedule: [
      { day: "Monday", muscles: ["Chest", "Shoulders", "Triceps"], exercises: ["Bench Press", "OHP", "Dips"] },
      { day: "Tuesday", muscles: ["Back", "Biceps"], exercises: ["Deadlift", "Rows", "Pull-ups"] },
      { day: "Wednesday", muscles: ["Quads", "Hamstrings", "Calves"], exercises: ["Squats", "RDL", "Leg Press"] },
      { day: "Thursday", muscles: ["Chest", "Shoulders", "Triceps"], exercises: ["Incline Press", "Lateral Raises", "Pushdowns"] },
      { day: "Friday", muscles: ["Back", "Biceps"], exercises: ["Barbell Rows", "Lat Pulldown", "Curls"] },
      { day: "Saturday", muscles: ["Quads", "Hamstrings", "Calves"], exercises: ["Front Squats", "Lunges", "Leg Curls"] },
    ],
  },
  {
    id: "brosplit",
    name: "Bro Split",
    description: "One muscle group per day, perfect for high volume training and muscle isolation.",
    daysPerWeek: 5,
    level: "Intermediate",
    focus: ["Hypertrophy", "Isolation"],
    schedule: [
      { day: "Monday", muscles: ["Chest"], exercises: ["Bench Press", "Incline DB", "Flyes", "Cable Crossover"] },
      { day: "Tuesday", muscles: ["Back"], exercises: ["Deadlift", "Rows", "Pull-ups", "Lat Pulldown"] },
      { day: "Wednesday", muscles: ["Shoulders"], exercises: ["OHP", "Lateral Raises", "Face Pulls", "Shrugs"] },
      { day: "Thursday", muscles: ["Legs"], exercises: ["Squats", "Leg Press", "RDL", "Calf Raises"] },
      { day: "Friday", muscles: ["Arms"], exercises: ["Barbell Curls", "Tricep Dips", "Hammer Curls", "Skull Crushers"] },
    ],
  },
  {
    id: "upperlower",
    name: "Upper / Lower Split",
    description: "4-day split alternating between upper and lower body for balanced development.",
    daysPerWeek: 4,
    level: "Beginner",
    focus: ["Strength", "Balance"],
    schedule: [
      { day: "Monday", muscles: ["Chest", "Back", "Shoulders", "Arms"], exercises: ["Bench", "Rows", "OHP", "Curls"] },
      { day: "Tuesday", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"], exercises: ["Squats", "RDL", "Lunges", "Calf Raises"] },
      { day: "Thursday", muscles: ["Chest", "Back", "Shoulders", "Arms"], exercises: ["Incline Press", "Pull-ups", "Lateral Raises", "Dips"] },
      { day: "Friday", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"], exercises: ["Front Squats", "Hip Thrusts", "Leg Press", "Nordic Curls"] },
    ],
  },
  {
    id: "fullbody",
    name: "Full Body (Beginner)",
    description: "3-day full body routine ideal for beginners learning compound movements.",
    daysPerWeek: 3,
    level: "Beginner",
    focus: ["Strength", "Foundation"],
    schedule: [
      { day: "Monday", muscles: ["Full Body"], exercises: ["Squats", "Bench Press", "Rows", "OHP"] },
      { day: "Wednesday", muscles: ["Full Body"], exercises: ["Deadlift", "Incline Press", "Pull-ups", "Lunges"] },
      { day: "Friday", muscles: ["Full Body"], exercises: ["Front Squats", "Dips", "Barbell Rows", "RDL"] },
    ],
  },
];

const WorkoutPlans = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // AI Generator state
  const [generating, setGenerating] = useState(false);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [workoutType, setWorkoutType] = useState("hypertrophy");
  const [focusMuscles, setFocusMuscles] = useState<string[]>([]);

  const allMuscleOptions = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];

  const toggleMuscle = (muscle: string) => {
    setFocusMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const handleGenerate = async () => {
    const user = localStorage.getItem("user");
    if (!user) return;
    const { id } = JSON.parse(user);

    setGenerating(true);
    try {
      const res = await api.post(`/api/workout-generator/${id}/generate`, {
        workoutType,
        focusMuscles: focusMuscles.length > 0 ? focusMuscles : undefined,
      });
      setGeneratedWorkout(res.data);
      toast.success("Workout generated!");
    } catch {
      toast.error("Failed to generate workout");
    } finally {
      setGenerating(false);
    }
  };

  const handleStartWorkout = async () => {
    if (!generatedWorkout) return;
    const user = localStorage.getItem("user");
    if (!user) return;
    const { id } = JSON.parse(user);

    try {
      const exercises = generatedWorkout.exercises.map((ex) => ({
        name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({
          reps: parseInt(ex.reps) || 10,
          weight: parseInt(ex.weight) || 0,
        })),
      }));

      const totalVolume = exercises.reduce(
        (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
        0
      );

      await api.post(`/api/profile/${id}/workout`, {
        name: generatedWorkout.name,
        duration: generatedWorkout.estimatedDuration,
        exercises,
        totalVolume,
      });

      toast.success("Workout logged! 💪");
      navigate("/workouts");
    } catch {
      toast.error("Failed to save workout");
    }
  };

  const saveWorkoutPlan = async (planId: string) => {
  const user = localStorage.getItem("user");
  if (!user) return;

  const { id } = JSON.parse(user);

  await api.put(`/api/profile/${id}`, { selectedWorkoutPlan: planId });

  setSelectedPlan(planId);
};
useEffect(() => {
  const user = localStorage.getItem("user");
  if (!user) return;

  const { id } = JSON.parse(user);

  api
    .get(`/api/profile/${id}`)
    .then((res) => {
      setSelectedPlan(res.data.selectedWorkoutPlan);
    });
}, []);


  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-accent/20 text-accent border-accent/30";
      case "Intermediate":
        return "bg-warning/20 text-warning border-warning/30";
      case "Advanced":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h1 data-page-title-anchor className="text-2xl md:text-3xl font-bold font-display text-foreground">Workout Plans</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Choose a predefined plan, or let AI generate a custom session
        </p>
      </div>

      {/* ── AI Workout Generator ── */}
      <div className="stat-card border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">AI Workout Generator</h2>
            <p className="text-xs text-muted-foreground">Generate a personalized session based on your goals and training history</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Workout Type */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Workout Type</label>
            <div className="flex gap-2 flex-wrap">
              {["hypertrophy", "strength", "endurance"].map((type) => (
                <button
                  key={type}
                  onClick={() => setWorkoutType(type)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all border",
                    workoutType === type
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Focus Muscles */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
              Focus Muscles <span className="text-primary font-normal">(optional — AI will pick if empty)</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {allMuscleOptions.map((muscle) => (
                <button
                  key={muscle}
                  onClick={() => toggleMuscle(muscle)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border",
                    focusMuscles.includes(muscle)
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-secondary/30 text-muted-foreground border-border/50 hover:bg-secondary/60"
                  )}
                >
                  {muscle}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg shadow-primary/20"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate Workout</>
            )}
          </Button>
        </div>

        {/* Generated Workout Display */}
        {generatedWorkout && (
          <div className="mt-6 pt-6 border-t border-primary/20 space-y-4 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">{generatedWorkout.name}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {generatedWorkout.estimatedDuration} min</span>
                  <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {generatedWorkout.focusMuscles?.join(", ")}</span>
                </div>
              </div>
              <Button onClick={handleStartWorkout} className="gap-2 shrink-0 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white">
                <Zap className="h-4 w-4" /> Log & Start
              </Button>
            </div>

            {/* Warmup */}
            {generatedWorkout.warmup && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm">
                <span className="text-orange-400 font-semibold text-xs uppercase tracking-wider">Warmup</span>
                <p className="text-foreground/80 mt-1">{generatedWorkout.warmup}</p>
              </div>
            )}

            {/* Exercises */}
            <div className="space-y-3">
              {generatedWorkout.exercises.map((ex, i) => (
                <div key={i} className="p-4 rounded-xl bg-secondary/40 border border-white/5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{ex.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[10px]">
                            {ex.sets} sets × {ex.reps}
                          </Badge>
                          <span>{ex.weight}</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {ex.restSeconds}s rest
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize text-[10px] shrink-0">
                      {ex.targetMuscle}
                    </Badge>
                  </div>
                  {ex.notes && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/[0.03] p-2.5">
                      <Brain className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">{ex.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Cooldown */}
            {generatedWorkout.cooldown && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
                <span className="text-blue-400 font-semibold text-xs uppercase tracking-wider">Cooldown</span>
                <p className="text-foreground/80 mt-1">{generatedWorkout.cooldown}</p>
              </div>
            )}

            {/* Context */}
            {generatedWorkout.recentMuscles?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold">Recently trained:</span>
                {generatedWorkout.recentMuscles.map((m) => (
                  <Badge key={m} variant="outline" className="text-[10px] capitalize border-white/10">{m}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Predefined Plans ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-display text-foreground">Predefined Plans</h2>
        {workoutPlans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "stat-card cursor-pointer transition-all duration-300",
              selectedPlan === plan.id && "border-primary glow-primary",
              expandedPlan === plan.id && "border-primary/50"
            )}
          >
            <div
              className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg md:text-xl font-bold font-display text-foreground">
                    {plan.name}
                  </h3>
                  <Badge variant="outline" className={getLevelColor(plan.level)}>
                    {plan.level}
                  </Badge>
                  {selectedPlan === plan.id && (
                    <Badge className="bg-primary text-primary-foreground">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm md:text-base text-muted-foreground">{plan.description}</p>
                <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>{plan.daysPerWeek} days/week</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="h-4 w-4 shrink-0" />
                    <span>{plan.focus.join(", ")}</span>
                  </div>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform shrink-0 hidden sm:block",
                  expandedPlan === plan.id && "rotate-90"
                )}
              />
            </div>

            {expandedPlan === plan.id && (
              <div className="mt-6 pt-6 border-t border-border space-y-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  Weekly Schedule
                </h4>
                <div className="grid gap-3">
                  {plan.schedule.map((day, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 md:p-4 rounded-lg bg-secondary/50"
                    >
                      <div className="w-full sm:w-28 shrink-0">
                        <span className="font-medium text-foreground">{day.day}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {day.muscles.map((muscle) => (
                            <Badge key={muscle} variant="secondary" className="bg-primary/20 text-primary text-xs">
                              {muscle}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {day.exercises.join(" • ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant={selectedPlan === plan.id ? "outline" : "gradient"}
                    className="w-full sm:w-auto"
                    onClick={(e) => {
                              e.stopPropagation();
                              saveWorkoutPlan(plan.id);
                            }}
                  >
                    {selectedPlan === plan.id ? "Deselect Plan" : "Select as Active"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkoutPlans;
