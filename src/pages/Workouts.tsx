  import { useState, useEffect } from "react";
  import { api } from "@/lib/api";
  import { Plus, Calendar, Dumbbell, Trash2, Save, Clock, Pencil } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
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

  const mockWorkouts: Workout[] = [
    {
      id: "1",
      name: "Push Day",
      date: "2024-01-14",
      duration: 65,
      exercises: [
        { id: "1", name: "Bench Press", sets: [{ reps: 8, weight: 185 }, { reps: 8, weight: 185 }, { reps: 6, weight: 195 }] },
        { id: "2", name: "Overhead Press", sets: [{ reps: 10, weight: 95 }, { reps: 8, weight: 105 }, { reps: 8, weight: 105 }] },
        { id: "3", name: "Incline Dumbbell Press", sets: [{ reps: 12, weight: 60 }, { reps: 10, weight: 65 }, { reps: 10, weight: 65 }] },
      ],
      totalVolume: 12450,
    },
    {
      id: "2",
      name: "Pull Day",
      date: "2024-01-13",
      duration: 55,
      exercises: [
        { id: "1", name: "Deadlift", sets: [{ reps: 5, weight: 315 }, { reps: 5, weight: 315 }, { reps: 5, weight: 315 }] },
        { id: "2", name: "Barbell Rows", sets: [{ reps: 8, weight: 155 }, { reps: 8, weight: 155 }, { reps: 8, weight: 155 }] },
        { id: "3", name: "Pull-ups", sets: [{ reps: 10, weight: 0 }, { reps: 8, weight: 0 }, { reps: 8, weight: 0 }] },
      ],
      totalVolume: 8475,
    },
    {
      id: "3",
      name: "Leg Day",
      date: "2024-01-12",
      duration: 70,
      exercises: [
        { id: "1", name: "Squats", sets: [{ reps: 8, weight: 225 }, { reps: 8, weight: 225 }, { reps: 6, weight: 245 }] },
        { id: "2", name: "Romanian Deadlift", sets: [{ reps: 10, weight: 185 }, { reps: 10, weight: 185 }, { reps: 10, weight: 185 }] },
        { id: "3", name: "Leg Press", sets: [{ reps: 12, weight: 360 }, { reps: 12, weight: 360 }, { reps: 10, weight: 380 }] },
      ],
      totalVolume: 18720,
    },
  ];

  const Workouts = () => {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

    useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) return;

    const { id } = JSON.parse(user);

    api
      .get(`/api/profile/${id}/workouts`)
      .then((res) => setWorkouts(res.data));
  }, []);

    const [newWorkout, setNewWorkout] = useState<{
      name: string;
      exercises: { name: string; sets: { reps: string; weight: string }[] }[];
    }>({
      name: "",
      exercises: [{ name: "", sets: [{ reps: "", weight: "" }] }],
    });

    const addExercise = () => {
      setNewWorkout({
        ...newWorkout,
        exercises: [...newWorkout.exercises, { name: "", sets: [{ reps: "", weight: "" }] }],
      });
    };

    const addSet = (exerciseIndex: number) => {
      const updated = [...newWorkout.exercises];
      updated[exerciseIndex].sets.push({ reps: "", weight: "" });
      setNewWorkout({ ...newWorkout, exercises: updated });
    };

    const removeExercise = (index: number) => {
      const updated = newWorkout.exercises.filter((_, i) => i !== index);
      setNewWorkout({ ...newWorkout, exercises: updated });
    };

    const handleSaveWorkout = async () => {
    const user = localStorage.getItem("user");
    if (!user) return;

    const { id } = JSON.parse(user);

    let totalVolume = 0;

    const exercises = newWorkout.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((set) => {
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

    // 🔥 Save workout to MongoDB
    if (editingWorkout) {
  await api.put(
    `/api/profile/${id}/workout/${editingWorkout._id || editingWorkout.id}`,
    workout
  );
} else {
  await api.post(`/api/profile/${id}/workout`, workout);
}


    // 🔁 Reload workouts from backend
    const res = await api.get(`/api/profile/${id}/workouts`);

    setWorkouts(res.data);
    setIsCreating(false);
    setNewWorkout({
      name: "",
      exercises: [{ name: "", sets: [{ reps: "", weight: "" }] }],
    });

    toast.success("Workout saved successfully!");
  };
  const handleEditWorkout = (workout: Workout) => {
  setNewWorkout({
    name: workout.name,
    exercises: workout.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({
        reps: String(s.reps),
        weight: String(s.weight),
      })),
    })),
  });

  setEditingWorkout(workout);
  setIsCreating(true);

};



    const handleDeleteWorkout = async (workoutId: string, workoutName: string) => {
      console.log("🗑 DELETE CLICKED:", workoutId);
  const user = localStorage.getItem("user");  
  if (!user) return;

  const { id } = JSON.parse(user);

  try {
    await api.delete(`/api/profile/${id}/workout/${workoutId}`);

    setWorkouts((prev) =>
      prev.filter((w) => (w._id || w.id) !== workoutId)
    );

    toast.success(`"${workoutName}" deleted successfully`);
  } catch (err) {
    console.error(err);
    toast.error("Failed to delete workout");
  }
};


    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Workouts</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Track your training sessions and build custom workouts
            </p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button
    variant="gradient"
    className="gap-2 w-full sm:w-auto"
    onClick={() => {
      setEditingWorkout(null);
      setNewWorkout({
        name: "",
        exercises: [{ name: "", sets: [{ reps: "", weight: "" }] }],
      });
    }}>
                <Plus className="h-4 w-4" />
                New Workout
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border mx-4">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{editingWorkout ? "Edit Workout" : "Create Workout"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Workout Name</Label>
                  <Input
                    placeholder="e.g., Push Day, Upper Body"
                    value={newWorkout.name}
                    onChange={(e) => setNewWorkout({ ...newWorkout, name: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Label className="text-base">Exercises</Label>
                    <Button variant="outline" size="sm" onClick={addExercise}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Exercise
                    </Button>
                  </div>

                  {newWorkout.exercises.map((exercise, exIndex) => (
                    <div key={exIndex} className="p-4 rounded-lg bg-secondary/50 space-y-4">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Exercise name"
                          value={exercise.name}
                          onChange={(e) => {
                            const updated = [...newWorkout.exercises];
                            updated[exIndex].name = e.target.value;
                            setNewWorkout({ ...newWorkout, exercises: updated });
                          }}
                          className="bg-card border-border"
                        />
                        {newWorkout.exercises.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExercise(exIndex)}
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
                                const updated = [...newWorkout.exercises];
                                updated[exIndex].sets[setIndex].reps = e.target.value;
                                setNewWorkout({ ...newWorkout, exercises: updated });
                              }}
                              className="w-20 sm:w-24 bg-card border-border"
                            />
                            <span className="text-muted-foreground">×</span>
                            <Input
                              placeholder="Weight"
                              type="number"
                              value={set.weight}
                              onChange={(e) => {
                                const updated = [...newWorkout.exercises];
                                updated[exIndex].sets[setIndex].weight = e.target.value;
                                setNewWorkout({ ...newWorkout, exercises: updated });
                              }}
                              className="w-20 sm:w-24 bg-card border-border"
                            />
                            <span className="text-sm text-muted-foreground">lbs</span>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addSet(exIndex)}
                          className="text-primary"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Set
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="gradient" onClick={handleSaveWorkout} className="w-full gap-2">
                  <Save className="h-4 w-4" />
                  {editingWorkout ? "Update Workout" : "Save Workout"}
                </Button>

              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Workout History */}
        <div className="space-y-4">
          <h2 className="text-lg md:text-xl font-semibold font-display text-foreground">Workout History</h2>
          <div className="grid gap-4">
            {workouts.length === 0 ? (
              <div className="stat-card text-center py-12">
                <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No workouts yet. Create your first workout!</p>
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
                            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                            <AlertDialogAction asChild>
  <button
    onClick={() => handleDeleteWorkout(workout._id || workout.id, workout.name)}
    className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded"
  >
    Delete
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
                            {exercise.sets.map((set, i) => (
                              <span key={i} className="text-xs text-muted-foreground">
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
