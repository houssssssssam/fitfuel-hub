import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Check, ChevronRight, Calendar, Target, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

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
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Workout Plans</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Choose a predefined plan or build your own custom workouts
        </p>
      </div>

      <div className="grid gap-4 md:gap-6">
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
