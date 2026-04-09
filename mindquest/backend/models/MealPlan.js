const mongoose = require("mongoose");

// ── Individual Meal ───────────────────────────────────────────────────────────
const MealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fats: { type: Number, required: true },
    prepTime: { type: String, default: "" },
    foods: [String], // ingredient list
  },
  { _id: false }
);

// ── Day Plan ──────────────────────────────────────────────────────────────────
const DayPlanSchema = new mongoose.Schema(
  {
    dayName: { type: String, required: true },
    meals: { type: mongoose.Schema.Types.Mixed, required: true },
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
  },
  { _id: false }
);

// ── Meal Plan ─────────────────────────────────────────────────────────────────
const MealPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, default: "Weekly Meal Plan" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: [DayPlanSchema],
    nutritionTargets: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
    },
    mealCount: { type: Number, default: 4 },
    targetCalories: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MealPlan", MealPlanSchema);
