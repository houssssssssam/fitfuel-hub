const mongoose = require("mongoose");

const ServingSizeSchema = new mongoose.Schema(
  {
    amount: Number,
    unit: String,
  },
  { _id: false }
);

const SavedFoodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String, default: "g" },
  calories: { type: Number, required: true },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  servingSize: { type: ServingSizeSchema, required: false },
  externalId: String,
  addedAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    age: Number,
    weight: Number,
    height: Number,

    gender: { type: String, default: "Male" },
    activityLevel: { type: String, default: "Sedentary" },
    fitnessGoal: { type: String, default: "Lose Weight" },
    goal: { type: String, default: "Lose Weight" },

    nutritionTargets: {
      calories: { type: Number, default: 2800 },
      protein: { type: Number, default: 180 },
      carbs: { type: Number, default: 320 },
      fats: { type: Number, default: 85 },
    },

    dailyIntake: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fats: { type: Number, default: 0 },
    },

    dailyWater: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    lastLoggedDate: { type: String, default: "" },
    lastResetDate: { type: String, default: "" },

    resetPasswordToken: String,
    resetPasswordExpires: Date,

    nutritionHistory: [
      {
        date: { type: String, required: true },
        calories: Number,
        protein: Number,
        carbs: Number,
        fats: Number,
        foods: [
          {
            name: String,
            quantity: Number,
            unit: String,
            calories: Number,
            protein: Number,
            carbs: Number,
            fats: Number,
            mealType: String,
          },
        ],
        water: Number,
      },
    ],

    weightLogs: [
      {
        weight: Number,
        date: String,
        note: String,
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      },
    ],

    achievements: [
      {
        id: String,
        unlockedAt: { type: Date, default: Date.now },
      },
    ],

    progressPhotos: [
      {
        url: String,
        thumbnailUrl: String,
        date: Date,
        note: String,
        category: { type: String, enum: ["front", "side", "back"] },
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      },
    ],

    foods: [
      {
        name: String,
        quantity: Number,
        unit: String,
        calories: Number,
        protein: Number,
        carbs: Number,
        fats: Number,
        mealType: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    recentFoods: [SavedFoodSchema],

    favoriteFoods: [SavedFoodSchema],

    selectedWorkoutPlan: {
      type: String,
      default: null,
    },

    // Meal Templates
    mealTemplates: [
      {
        name: { type: String, required: true },
        mealType: { type: String, enum: ["Breakfast", "Lunch", "Dinner", "Snacks"], default: "Breakfast" },
        foods: [
          {
            name: String,
            quantity: Number,
            unit: String,
            calories: Number,
            protein: Number,
            carbs: Number,
            fats: Number,
          },
        ],
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Meal Planning
    activeMealPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MealPlan",
      default: null,
    },
    mealPlanHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MealPlan",
      },
    ],

    workouts: [
      {
        name: String,
        date: { type: Date, default: Date.now },
        duration: Number,
        totalVolume: Number,
        exercises: [
          {
            name: String,
            sets: [
              {
                reps: Number,
                weight: Number,
              },
            ],
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
