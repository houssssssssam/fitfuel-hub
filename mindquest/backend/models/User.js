const mongoose = require("mongoose");

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

    nutritionHistory: [{
      date: { type: String, required: true },
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
      foods: [{
        name: String,
        quantity: Number,
        unit: String,
        calories: Number,
        protein: Number,
        carbs: Number,
        fats: Number,
        mealType: String,
      }],
      water: Number,
    }],

    weightLogs: [
      {
        weight: Number,
        date: String, // "YYYY-MM-DD"
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
        date: String,
        note: String,
        category: { type: String, enum: ["front", "side", "back"] },
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true }
      }
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
selectedWorkoutPlan: {
  type: String,
  default: null,
},

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
