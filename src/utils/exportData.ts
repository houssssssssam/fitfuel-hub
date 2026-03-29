interface NutritionDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
}

interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealType: string;
  createdAt?: string;
}

interface Workout {
  name: string;
  date: string;
  duration: number;
  totalVolume: number;
  exercises: any[];
}

const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportNutritionCSV = (history: NutritionDay[]) => {
  const headers = ["Date", "Calories", "Protein(g)", "Carbs(g)", "Fats(g)", "Water(ml)"];
  const rows = history.map(day => [
    day.date,
    day.calories || 0,
    day.protein || 0,
    day.carbs || 0,
    day.fats || 0,
    day.water || 0
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");
  
  const today = new Date().toISOString().split("T")[0];
  downloadCSV(csvContent, `fitfuel-nutrition-${today}.csv`);
};

export const exportFoodsCSV = (foods: FoodItem[]) => {
  const headers = ["Name", "Quantity", "Unit", "Calories", "Protein(g)", "Carbs(g)", "Fats(g)", "Meal Type", "Date"];
  const today = new Date().toISOString().split("T")[0];
  
  const rows = foods.map(food => [
    `"${food.name.replace(/"/g, '""')}"`,
    food.quantity || 0,
    `"${food.unit || ''}"`,
    food.calories || 0,
    food.protein || 0,
    food.carbs || 0,
    food.fats || 0,
    food.mealType || "",
    food.createdAt ? new Date(food.createdAt).toISOString().split("T")[0] : today
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");
  
  downloadCSV(csvContent, `fitfuel-foods-${today}.csv`);
};

export const exportWorkoutsCSV = (workouts: Workout[]) => {
  const headers = ["Date", "Name", "Duration(min)", "Total Volume(kg)", "Exercises Count"];
  
  const rows = workouts.map(workout => {
    const dateStr = workout.date ? new Date(workout.date).toISOString().split("T")[0] : "";
    const exerciseCount = workout.exercises ? workout.exercises.length : 0;
    
    return [
      dateStr,
      `"${(workout.name || '').replace(/"/g, '""')}"`,
      workout.duration || 0,
      workout.totalVolume || 0,
      exerciseCount
    ];
  });
  
  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");
  
  const today = new Date().toISOString().split("T")[0];
  downloadCSV(csvContent, `fitfuel-workouts-${today}.csv`);
};
