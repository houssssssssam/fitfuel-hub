/**
 * Shared nutrition math used by onboarding and the Profile page, so targets
 * are always calculated the same way.
 *
 * Energy per gram: protein 4 kcal, carbs 4 kcal, fat 9 kcal.
 */

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fats: 9 } as const;

export type MacroKey = keyof typeof KCAL_PER_GRAM;

export type MacroGrams = { protein: number; carbs: number; fats: number };

export type MacroPercents = { protein: number; carbs: number; fats: number };

export type NutritionTargets = MacroGrams & { calories: number };

export type TargetInputs = {
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: string;
  activityLevel: string;
  fitnessGoal: string;
};

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  Sedentary: 1.2,
  "Lightly Active": 1.375,
  "Moderately Active": 1.55,
  "Very Active": 1.725,
  "Extremely Active": 1.9,
};

/** Calorie adjustment applied to maintenance (TDEE) for each goal. */
export const GOAL_CALORIE_ADJUSTMENT: Record<string, number> = {
  "Lose Weight": -500,
  "Maintain Weight": 0,
  "Build Muscle": 300,
  "Improve Fitness": 0,
};

/** Protein in g per kg of body weight for each goal. */
export const GOAL_PROTEIN_PER_KG: Record<string, number> = {
  "Lose Weight": 2.0,
  "Maintain Weight": 1.8,
  "Build Muscle": 2.2,
  "Improve Fitness": 2.0,
};

/** Share of calories that comes from fat when targets are recalculated. */
export const DEFAULT_FAT_SHARE = 0.25;

/** Never suggest a target below this many calories. */
export const MIN_CALORIES = 1200;

export const MACRO_PRESETS: { id: string; label: string; percents: MacroPercents }[] = [
  { id: "balanced", label: "Balanced", percents: { protein: 30, carbs: 40, fats: 30 } },
  { id: "high-protein", label: "High protein", percents: { protein: 40, carbs: 35, fats: 25 } },
  { id: "high-carb", label: "High carb", percents: { protein: 25, carbs: 50, fats: 25 } },
  { id: "low-carb", label: "Low carb", percents: { protein: 35, carbs: 25, fats: 40 } },
];

const round = (value: number) => Math.round(value);

export const isValidTargetInputs = (inputs: Partial<TargetInputs>): inputs is TargetInputs =>
  [inputs.age, inputs.weight, inputs.height].every((value) => typeof value === "number" && value > 0)
  && typeof inputs.activityLevel === "string"
  && typeof inputs.fitnessGoal === "string";

/** Mifflin-St Jeor basal metabolic rate. */
export const calculateBmr = ({ age, weight, height, gender }: Pick<TargetInputs, "age" | "weight" | "height" | "gender">) => {
  const base = 10 * weight + 6.25 * height - 5 * age;
  if (gender === "Male") return base + 5;
  if (gender === "Female") return base - 161;
  return base - 78; // average of the male and female offsets
};

export const calculateTdee = (inputs: TargetInputs) =>
  calculateBmr(inputs) * (ACTIVITY_MULTIPLIERS[inputs.activityLevel] ?? ACTIVITY_MULTIPLIERS.Sedentary);

/**
 * Recommended daily targets from body stats:
 * calories = TDEE + goal adjustment, protein from body weight,
 * 25% of calories from fat, carbs fill the rest.
 */
export const calculateTargets = (inputs: TargetInputs): NutritionTargets => {
  const tdee = calculateTdee(inputs);
  const calories = Math.max(MIN_CALORIES, round(tdee + (GOAL_CALORIE_ADJUSTMENT[inputs.fitnessGoal] ?? 0)));
  const protein = round(inputs.weight * (GOAL_PROTEIN_PER_KG[inputs.fitnessGoal] ?? 1.8));
  const fats = round((calories * DEFAULT_FAT_SHARE) / KCAL_PER_GRAM.fats);
  const carbs = Math.max(0, round((calories - protein * KCAL_PER_GRAM.protein - fats * KCAL_PER_GRAM.fats) / KCAL_PER_GRAM.carbs));
  return { calories, protein, carbs, fats };
};

export const caloriesFromGrams = ({ protein, carbs, fats }: MacroGrams) =>
  protein * KCAL_PER_GRAM.protein + carbs * KCAL_PER_GRAM.carbs + fats * KCAL_PER_GRAM.fats;

export const gramsFromPercents = (calories: number, percents: MacroPercents): MacroGrams => ({
  protein: round((calories * percents.protein) / 100 / KCAL_PER_GRAM.protein),
  carbs: round((calories * percents.carbs) / 100 / KCAL_PER_GRAM.carbs),
  fats: round((calories * percents.fats) / 100 / KCAL_PER_GRAM.fats),
});

/**
 * Percent of calories per macro, as whole numbers that always add up to 100
 * (the largest-remainder method shares out the rounding).
 */
export const percentsFromGrams = (grams: MacroGrams): MacroPercents => {
  const total = caloriesFromGrams(grams);
  if (total <= 0) return { protein: 0, carbs: 0, fats: 0 };

  const keys: MacroKey[] = ["protein", "carbs", "fats"];
  const exact = keys.map((key) => (grams[key] * KCAL_PER_GRAM[key] * 100) / total);
  const floored = exact.map(Math.floor);
  let remaining = 100 - floored.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of order) {
    if (remaining <= 0) break;
    floored[index] += 1;
    remaining -= 1;
  }
  return { protein: floored[0], carbs: floored[1], fats: floored[2] };
};

/**
 * Change one macro's percentage and rebalance the others so the total stays 100%.
 * Protein and fat are the "set" macros, so carbs absorb their changes; when carbs
 * change, fat absorbs it. If the absorbing macro hits 0, the remaining macro takes
 * the rest, and the edited value is capped so nothing goes negative.
 */
export const rebalancePercents = (current: MacroPercents, key: MacroKey, rawValue: number): MacroPercents => {
  const value = Math.min(100, Math.max(0, Math.round(rawValue)));
  const absorber: MacroKey = key === "carbs" ? "fats" : "carbs";
  const other = (["protein", "carbs", "fats"] as MacroKey[]).find((k) => k !== key && k !== absorber)!;

  const next = { ...current, [key]: value };
  let rest = 100 - value - next[other];
  if (rest < 0) {
    next[other] = Math.max(0, next[other] + rest);
    rest = 100 - value - next[other];
  }
  next[absorber] = Math.max(0, rest);
  return next;
};

/** How far the macros' calories are from the calorie target, as a fraction (0.02 = 2%). */
export const calorieMismatch = (targets: NutritionTargets) => {
  if (targets.calories <= 0) return 0;
  return (caloriesFromGrams(targets) - targets.calories) / targets.calories;
};
