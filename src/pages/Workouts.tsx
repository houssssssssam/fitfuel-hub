import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Plus, Calendar, Dumbbell, Trash2, Save, Clock, Pencil, TrendingUp, Trophy, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Exercise {
  _id?: string;
  id?: string;
  name: string;
  sets: { reps: number; weight: number }[];
}

interface Workout {
  _id?: string;
  id?: string;
  name: string;
  date: string;
  duration: number;
  exercises: Exercise[];
  totalVolume: number;
}

// ── Analytics Helpers ─────────────────────────────────────────────────────────

const detectMuscle = (name: string): string => {
  const n = name.toLowerCase();
  if (/bench|press|fly|flye|pec|push-up|pushup|chest/.test(n)) return "Chest";
  if (/row|pull-up|pullup|lat|deadlift|pull down|pulldown|back/.test(n)) return "Back";
  if (/shoulder|ohp|overhead|lateral raise|military|delt|face pull/.test(n)) return "Shoulders";
  if (/curl|bicep|hammer/.test(n)) return "Biceps";
  if (/tricep|pushdown|skull|extension|dip/.test(n)) return "Triceps";
  if (/squat|leg|lunge|calf|hamstring|quad|rdl|hip thrust|glute/.test(n)) return "Legs";
  if (/ab|crunch|plank|sit-up|situp|core|oblique/.test(n)) return "Core";
  return "Other";
};

const WorkoutAnalytics = ({ workouts }: { workouts: Workout[] }) => {
  const analytics = useMemo(() => {
    if (workouts.length === 0) return null;

    const totalSessions = workouts.length;
    const totalVolume = workouts.reduce((s, w) => s + (w.totalVolume || 0), 0);
    const avgVolume = Math.round(totalVolume / totalSessions);

    // Volume over time
    const volumeData = [...workouts]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((w) => ({
        date: new Date(w.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        volume: w.totalVolume || 0,
        name: w.name,
      }));

    // Muscle distribution
    const muscles: Record<string, number> = {};
    for (const w of workouts) {
      for (const ex of w.exercises) {
        const m = detectMuscle(ex.name);
        muscles[m] = (muscles[m] || 0) + 1;
      }
    }

    // Personal records
    const prMap: Record<string, { exercise: string; weight: number; reps: number; date: string }> = {};
    for (const w of workouts) {
      for (const ex of w.exercises) {
        const key = ex.name.toLowerCase().trim();
        if (!key) continue;
        for (const set of ex.sets) {
          if (set.weight > 0 && (!prMap[key] || set.weight > prMap[key].weight)) {
            prMap[key] = { exercise: ex.name, weight: set.weight, reps: set.reps, date: w.date };
          }
        }
      }
    }
    const prs = Object.values(prMap).sort((a, b) => b.weight - a.weight).slice(0, 6);

    // Top exercise by frequency
    const exFreq: Record<string, number> = {};
    for (const w of workouts) {
      for (const ex of w.exercises) {
        const key = ex.name.toLowerCase().trim();
        exFreq[key] = (exFreq[key] || 0) + 1;
      }
    }
    const topExercise = Object.entries(exFreq).sort(([, a], [, b]) => b - a)[0];

    return { totalSessions, avgVolume, volumeData, muscles, prs, topExercise };
  }, [workouts]);

  if (!analytics) return null;

  const muscleColors: Record<string, string> = {
    Chest: "#06b6d4", Back: "#22c55e", Shoulders: "#f59e0b", Legs: "#ef4444",
    Biceps: "#8b5cf6", Triceps: "#ec4899", Core: "#14b8a6", Other: "#64748b",
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{analytics.totalSessions}</p>
        </div>

        <div className="stat-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-orange-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Avg Volume</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{analytics.avgVolume.toLocaleString()} <span className="text-sm text-muted-foreground">lbs</span></p>
        </div>

        <div className="stat-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-yellow-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Top Lift</span>
          </div>
          <p className="text-sm font-bold text-foreground truncate capitalize">{analytics.topExercise?.[0] || "-"}</p>
          <p className="text-xs text-muted-foreground">{analytics.topExercise ? `${analytics.topExercise[1]}× logged` : ""}</p>
        </div>

        <div className="stat-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <Activity className="h-4 w-4 text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Muscles</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{Object.keys(analytics.muscles).length} <span className="text-sm text-muted-foreground">groups</span></p>
        </div>
      </div>

      {/* Volume Chart + PRs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Volume Chart */}
        <div className="lg:col-span-3 stat-card">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Volume Progression
          </h3>
          {analytics.volumeData.length > 1 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.volumeData}>
                  <defs>
                    <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number) => [`${value.toLocaleString()} lbs`, "Volume"]}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#06b6d4" fillOpacity={1} fill="url(#colorVol)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl text-sm">
              Log more workouts to see progression trends
            </div>
          )}

          {/* Muscle Tags */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50">
            {Object.entries(analytics.muscles).sort(([, a], [, b]) => b - a).map(([m, count]) => (
              <span
                key={m}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: muscleColors[m] || muscleColors.Other }} />
                {m}: {count}
              </span>
            ))}
          </div>
        </div>

        {/* Personal Records */}
        <div className="lg:col-span-2 stat-card">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            Personal Records
          </h3>
          {analytics.prs.length > 0 ? (
            <div className="space-y-2">
              {analytics.prs.map((pr, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-yellow-500/10 hover:border-yellow-500/30 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                    <span className="text-sm">🏆</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground capitalize truncate">{pr.exercise}</p>
                    <p className="text-xs text-muted-foreground">{new Date(pr.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-yellow-400">{pr.weight} lbs</p>
                    <p className="text-xs text-muted-foreground">{pr.reps} reps</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Trophy className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm text-muted-foreground">Start logging weighted exercises to track PRs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Workouts = () => {
  const { t } = useTranslation();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [newWorkout, setNewWorkout] = useState<{
    name: string;
    exercises: { name: string; sets: { reps: string; weight: string }[] }[];
  }>({
    name: "",
    exercises: [{ name: "", sets: [{ reps: "", weight: "" }] }],
  });

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) return;

    const { id } = JSON.parse(user) as { id: string };
    void api.get(`/api/profile/${id}/workouts`).then((res) => setWorkouts(res.data));
  }, []);

  const resetForm = () => {
    setEditingWorkout(null);
    setNewWorkout({
      name: "",
      exercises: [{ name: "", sets: [{ reps: "", weight: "" }] }],
    });
  };

  const addExercise = () => {
    setNewWorkout((prev) => ({
      ...prev,
      exercises: [...prev.exercises, { name: "", sets: [{ reps: "", weight: "" }] }],
    }));
  };

  const addSet = (exerciseIndex: number) => {
    setNewWorkout((prev) => {
      const exercises = [...prev.exercises];
      exercises[exerciseIndex].sets.push({ reps: "", weight: "" });
      return { ...prev, exercises };
    });
  };

  const removeExercise = (index: number) => {
    setNewWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handleSaveWorkout = async () => {
    const user = localStorage.getItem("user");
    if (!user) return;

    const { id } = JSON.parse(user) as { id: string };
    let totalVolume = 0;

    const exercises = newWorkout.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets.map((set) => {
        const reps = Number(set.reps) || 0;
        const weight = Number(set.weight) || 0;
        totalVolume += reps * weight;
        return { reps, weight };
      }),
    }));

    const workout = {
      name: newWorkout.name,
      duration: 0,
      exercises,
      totalVolume,
    };

    if (editingWorkout) {
      await api.put(`/api/profile/${id}/workout/${editingWorkout._id || editingWorkout.id}`, workout);
    } else {
      await api.post(`/api/profile/${id}/workout`, workout);
    }

    const res = await api.get(`/api/profile/${id}/workouts`);
    setWorkouts(res.data);
    setIsCreating(false);
    resetForm();
    toast.success("Workout saved successfully");
  };

  const handleEditWorkout = (workout: Workout) => {
    setNewWorkout({
      name: workout.name,
      exercises: workout.exercises.map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets.map((set) => ({
          reps: String(set.reps),
          weight: String(set.weight),
        })),
      })),
    });
    setEditingWorkout(workout);
    setIsCreating(true);
  };

  const handleDeleteWorkout = async (workoutId: string, workoutName: string) => {
    const user = localStorage.getItem("user");
    if (!user) return;

    const { id } = JSON.parse(user) as { id: string };

    try {
      await api.delete(`/api/profile/${id}/workout/${workoutId}`);
      setWorkouts((prev) => prev.filter((workout) => (workout._id || workout.id) !== workoutId));
      toast.success(`"${workoutName}" deleted successfully`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete workout");
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 data-page-title-anchor className="text-2xl md:text-3xl font-bold font-display text-foreground">{t("workoutsTitle")}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">{t("workoutsSubtitle")}</p>
        </div>

        <Dialog
          open={isCreating}
          onOpenChange={(open) => {
            setIsCreating(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="gradient"
              className="gap-2 w-full sm:w-auto"
              onClick={() => {
                resetForm();
                setIsCreating(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("newWorkout")}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border mx-4">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingWorkout ? "Edit Workout" : "Create Workout"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Workout Name</Label>
                <Input
                  placeholder="e.g., Push Day, Upper Body"
                  value={newWorkout.name}
                  onChange={(e) => setNewWorkout((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-base">{t("exercises")}</Label>
                  <Button variant="outline" size="sm" onClick={addExercise}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("addExercise")}
                  </Button>
                </div>

                {newWorkout.exercises.map((exercise, exerciseIndex) => (
                  <div key={exerciseIndex} className="p-4 rounded-lg bg-secondary/50 space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChange={(e) => {
                          const exercises = [...newWorkout.exercises];
                          exercises[exerciseIndex].name = e.target.value;
                          setNewWorkout((prev) => ({ ...prev, exercises }));
                        }}
                        className="bg-card border-border"
                      />

                      {newWorkout.exercises.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExercise(exerciseIndex)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {exercise.sets.map((set, setIndex) => (
                        <div key={setIndex} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <span className="text-sm text-muted-foreground w-12 sm:w-16 shrink-0">Set {setIndex + 1}</span>
                          <Input
                            placeholder="Reps"
                            type="number"
                            value={set.reps}
                            onChange={(e) => {
                              const exercises = [...newWorkout.exercises];
                              exercises[exerciseIndex].sets[setIndex].reps = e.target.value;
                              setNewWorkout((prev) => ({ ...prev, exercises }));
                            }}
                            className="w-20 sm:w-24 bg-card border-border"
                          />
                          <span className="text-muted-foreground">×</span>
                          <Input
                            placeholder="Weight"
                            type="number"
                            value={set.weight}
                            onChange={(e) => {
                              const exercises = [...newWorkout.exercises];
                              exercises[exerciseIndex].sets[setIndex].weight = e.target.value;
                              setNewWorkout((prev) => ({ ...prev, exercises }));
                            }}
                            className="w-20 sm:w-24 bg-card border-border"
                          />
                          <span className="text-sm text-muted-foreground">lbs</span>
                        </div>
                      ))}

                      <Button variant="ghost" size="sm" onClick={() => addSet(exerciseIndex)} className="text-primary">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Set
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="gradient" onClick={handleSaveWorkout} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {editingWorkout ? "Update Workout" : t("saveWorkout")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Analytics Section ── */}
      <WorkoutAnalytics workouts={workouts} />

      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-semibold font-display text-foreground">Workout History</h2>
        <div className="grid gap-4">
          {workouts.length === 0 ? (
            <div className="stat-card text-center py-12">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t("noWorkouts")}. {t("startFirstWorkout")}!</p>
            </div>
          ) : (
            workouts.map((workout) => (
              <div key={workout._id || workout.id} className="stat-card group">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground truncate">{workout.name}</h3>
                    <div className="flex items-center gap-3 sm:gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 shrink-0" />
                        {new Date(workout.date).toLocaleDateString()}
                      </span>
                      {workout.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 shrink-0" />
                          {workout.duration} min
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                      {workout.totalVolume.toLocaleString()} lbs
                    </Badge>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditWorkout(workout)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent className="bg-card border-border mx-4">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Workout</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{workout.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <button
                              onClick={() => handleDeleteWorkout(workout._id || workout.id || "", workout.name)}
                              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded"
                            >
                              {t("delete")}
                            </button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-3">
                  {workout.exercises.map((exercise) => (
                    <div key={exercise._id || exercise.id} className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 rounded-lg bg-secondary/50">
                      <Dumbbell className="h-4 w-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground block sm:inline">{exercise.name}</span>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {exercise.sets.map((set, index) => (
                            <span key={index} className="text-xs text-muted-foreground">
                              {set.reps}×{set.weight}lbs
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Workouts;
