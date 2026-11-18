/**
 * CSV / JSON exports for Settings → Data & Storage.
 * Files open correctly in Excel (UTF-8 BOM, quoted text, CRLF line endings).
 */

type FoodEntry = {
  name?: string;
  quantity?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  mealType?: string;
  createdAt?: string;
};

export type NutritionDay = {
  date: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  water?: number;
  foods?: FoodEntry[];
};

type Workout = {
  name?: string;
  date?: string;
  duration?: number;
  totalVolume?: number;
  exercises?: { name?: string; sets?: { reps?: number; weight?: number }[] }[];
};

type WeightLog = { date?: string; weight?: number; note?: string };

const today = () => new Date().toISOString().split("T")[0];

const escapeCell = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (headers: string[], rows: unknown[][]) =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");

const downloadFile = (content: string, filename: string, type: string) => {
  // The BOM makes Excel read accents (é, è…) correctly.
  const blob = new Blob([type.startsWith("text/csv") ? "﻿" : "", content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

const downloadCsv = (headers: string[], rows: unknown[][], name: string) =>
  downloadFile(toCsv(headers, rows), `fitfuel-${name}-${today()}.csv`, "text/csv;charset=utf-8");

/** Daily totals: past days plus today. */
export const exportNutritionCSV = (days: NutritionDay[]) => {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  downloadCsv(
    ["Date", "Calories", "Protein (g)", "Carbs (g)", "Fats (g)", "Water (ml)"],
    sorted.map((day) => [day.date, day.calories || 0, day.protein || 0, day.carbs || 0, day.fats || 0, day.water || 0]),
    "nutrition",
  );
  return sorted.length;
};

/** Every food entry, one row per food, across past days and today. */
export const exportFoodsCSV = (days: NutritionDay[]) => {
  const rows = [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((day) =>
      (day.foods || []).map((food) => [
        day.date,
        food.mealType || "",
        food.name || "",
        food.quantity || 0,
        food.unit || "",
        food.calories || 0,
        food.protein || 0,
        food.carbs || 0,
        food.fats || 0,
      ]),
    );
  downloadCsv(
    ["Date", "Meal", "Food", "Quantity", "Unit", "Calories", "Protein (g)", "Carbs (g)", "Fats (g)"],
    rows,
    "food-log",
  );
  return rows.length;
};

/** One row per set, so the file works for analysis in a spreadsheet. */
export const exportWorkoutsCSV = (workouts: Workout[]) => {
  const rows = workouts.flatMap((workout) => {
    const date = workout.date ? new Date(workout.date).toISOString().split("T")[0] : "";
    const exercises = workout.exercises?.length ? workout.exercises : [{ name: "", sets: [] }];
    return exercises.flatMap((exercise) => {
      const sets = exercise.sets?.length ? exercise.sets : [{}];
      return sets.map((set, index) => [
        date,
        workout.name || "",
        workout.duration || 0,
        workout.totalVolume || 0,
        exercise.name || "",
        exercise.sets?.length ? index + 1 : "",
        set.reps ?? "",
        set.weight ?? "",
      ]);
    });
  });
  downloadCsv(
    ["Date", "Workout", "Duration (min)", "Total volume (kg)", "Exercise", "Set", "Reps", "Weight (kg)"],
    rows,
    "workouts",
  );
  return workouts.length;
};

export const exportWeightCSV = (logs: WeightLog[]) => {
  const sorted = [...logs].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  downloadCsv(["Date", "Weight (kg)", "Note"], sorted.map((log) => [log.date || "", log.weight ?? "", log.note || ""]), "body-weight");
  return sorted.length;
};

/** Everything in one JSON file (a full backup). */
export const exportAllJSON = (data: unknown) => {
  downloadFile(JSON.stringify(data, null, 2), `fitfuel-backup-${today()}.json`, "application/json");
};
