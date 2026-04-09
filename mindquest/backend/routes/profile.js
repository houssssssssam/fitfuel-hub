const express = require("express");
const User = require("../models/User");
const {
  buildSavedFood,
  ensureFoodLibrary,
  pushRecentFood,
  toggleFavoriteFood,
} = require("../utils/foodLibrary");

const router = express.Router();

const checkAndResetDaily = async (userId) => {
  const today = new Date().toISOString().split("T")[0];
  const user = await User.findById(userId);
  if (!user) return;

  if (user.lastResetDate !== today) {
    if (user.lastResetDate && user.lastResetDate !== today && user.dailyIntake.calories > 0) {
      user.nutritionHistory.push({
        date: user.lastResetDate,
        calories: user.dailyIntake.calories,
        protein: user.dailyIntake.protein,
        carbs: user.dailyIntake.carbs,
        fats: user.dailyIntake.fats,
        foods: user.foods,
        water: user.dailyWater,
      });

      if (user.nutritionHistory.length > 90) {
        user.nutritionHistory = user.nutritionHistory.slice(-90);
      }
    }

    user.dailyIntake = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    user.dailyWater = 0;
    user.foods = [];
    user.lastResetDate = today;
    await user.save();
  }
};

router.get("/:userId", async (req, res) => {
  try {
    await checkAndResetDaily(req.params.userId);

    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:userId", async (req, res) => {
  try {
    // Whitelist: only allow safe profile fields to be updated
    const ALLOWED_FIELDS = [
      "name", "age", "weight", "height", "gender",
      "activityLevel", "fitnessGoal", "goal",
      "nutritionTargets", "selectedWorkoutPlan",
    ];

    const updates = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.userId, updates, {
      new: true,
    }).select("-password -resetPasswordToken -resetPasswordExpires");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:userId/food-library", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("recentFoods favoriteFoods");
    if (!user) return res.status(404).json({ message: "Not found" });

    ensureFoodLibrary(user);

    res.json({
      recentFoods: user.recentFoods || [],
      favoriteFoods: user.favoriteFoods || [],
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:userId/recent-food", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "Not found" });

    const savedFood = buildSavedFood(req.body);
    if (!savedFood) {
      return res.status(400).json({ message: "Invalid food payload" });
    }

    pushRecentFood(user, savedFood);
    await user.save();

    res.json({ recentFoods: user.recentFoods || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:userId/favorite-food", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "Not found" });

    const savedFood = buildSavedFood(req.body);
    if (!savedFood) {
      return res.status(400).json({ message: "Invalid food payload" });
    }

    const { favoriteFoods, isFavorite } = toggleFavoriteFood(user, savedFood);
    await user.save();

    res.json({
      favoriteFoods,
      isFavorite,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:userId/food-library/recent", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "Not found" });

    user.recentFoods = [];
    await user.save();

    res.json({ message: "History cleared" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:userId/intake", async (req, res) => {
  try {
    await checkAndResetDaily(req.params.userId);
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const food = req.body.food;

    if (food) {
      user.foods.push(food);
      pushRecentFood(user, req.body.foodLibraryEntry || food);
    }

    user.dailyIntake.calories += Number(req.body.calories || 0);
    user.dailyIntake.protein += Number(req.body.protein || 0);
    user.dailyIntake.carbs += Number(req.body.carbs || 0);
    user.dailyIntake.fats += Number(req.body.fats || 0);

    const today = new Date().toISOString().split("T")[0];
    if (user.lastLoggedDate !== today) {
      if (!user.lastLoggedDate) {
        user.currentStreak = 1;
      } else {
        const lastDate = new Date(user.lastLoggedDate);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        user.currentStreak = diffDays === 1 ? user.currentStreak + 1 : 1;
      }

      user.lastLoggedDate = today;
    }

    await user.save();

    res.json({
      dailyIntake: user.dailyIntake,
      foods: user.foods,
      recentFoods: user.recentFoods || [],
      currentStreak: user.currentStreak,
      lastLoggedDate: user.lastLoggedDate,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update intake" });
  }
});

router.post("/:userId/weight", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.weightLogs.push({
      weight: req.body.weight,
      date: req.body.date || new Date().toISOString().split("T")[0],
      note: req.body.note || "",
    });

    user.weight = req.body.weight;

    await user.save();
    res.json(user.weightLogs);
  } catch (err) {
    console.error("Failed to add weight log:", err);
    res.status(500).json({ message: "Failed to add weight log" });
  }
});

router.delete("/:userId/weight/:logId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.weightLogs = user.weightLogs.filter((log) => log._id.toString() !== req.params.logId);

    if (user.weightLogs.length > 0) {
      const sortedLogs = [...user.weightLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
      user.weight = sortedLogs[0].weight;
    }

    await user.save();
    res.json(user.weightLogs);
  } catch (err) {
    console.error("Failed to delete weight log:", err);
    res.status(500).json({ message: "Failed to delete weight log" });
  }
});

router.put("/:userId/water", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.dailyWater += Number(req.body.amount || 0);
    await user.save();

    res.json({ dailyWater: user.dailyWater });
  } catch (err) {
    res.status(500).json({ message: "Failed to update water" });
  }
});

router.delete("/:userId/food/:foodId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const food = user.foods.id(req.params.foodId);
    if (!food) return res.status(404).json({ message: "Food not found" });

    await food.deleteOne();

    const totals = user.foods.reduce(
      (acc, entry) => ({
        calories: acc.calories + (entry.calories || 0),
        protein: acc.protein + (entry.protein || 0),
        carbs: acc.carbs + (entry.carbs || 0),
        fats: acc.fats + (entry.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    user.dailyIntake.calories = Math.max(0, totals.calories);
    user.dailyIntake.protein = Math.max(0, totals.protein);
    user.dailyIntake.carbs = Math.max(0, totals.carbs);
    user.dailyIntake.fats = Math.max(0, totals.fats);

    await user.save();

    res.json({
      dailyIntake: user.dailyIntake,
      foods: user.foods,
    });
  } catch (err) {
    console.error("Failed to delete food:", err);
    res.status(500).json({ message: "Failed to delete food" });
  }
});

router.post("/:userId/workout", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const workout = {
      name: req.body.name,
      date: new Date(),
      duration: req.body.duration || 0,
      exercises: req.body.exercises,
      totalVolume: req.body.totalVolume,
    };

    user.workouts.push(workout);
    await user.save();

    res.json(workout);
  } catch (err) {
    res.status(500).json({ message: "Failed to save workout" });
  }
});

router.put("/:userId/workout/:workoutId", async (req, res) => {
  try {
    const { userId, workoutId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const workout = user.workouts.id(workoutId);
    if (!workout) return res.status(404).json({ message: "Workout not found" });

    workout.name = req.body.name;
    workout.duration = req.body.duration;
    workout.exercises = req.body.exercises;
    workout.totalVolume = req.body.totalVolume;

    await user.save();
    res.json(workout);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

router.delete("/:userId/workout/:workoutId", async (req, res) => {
  console.log("DELETE ROUTE HIT", req.params);

  try {
    const { userId, workoutId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.workouts = user.workouts.filter((workout) => workout._id.toString() !== workoutId);

    await user.save();

    res.json({ message: "Workout deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});

router.get("/:userId/workouts", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.workouts || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch workouts" });
  }
});

// ── Get a specific date's data (today or history) ──────────────────────────
router.get("/:userId/history/:date", async (req, res) => {
  try {
    const { userId, date } = req.params;
    const today = new Date().toISOString().split("T")[0];

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (date === today) {
      return res.json({
        date,
        calories: user.dailyIntake.calories,
        protein: user.dailyIntake.protein,
        carbs: user.dailyIntake.carbs,
        fats: user.dailyIntake.fats,
        foods: user.foods,
        water: user.dailyWater,
      });
    }

    const entry = user.nutritionHistory.find((h) => h.date === date);
    if (!entry) {
      return res.json({ date, calories: 0, protein: 0, carbs: 0, fats: 0, foods: [], water: 0 });
    }
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Add food to a specific historical date ──────────────────────────────────
router.put("/:userId/history/:date/food", async (req, res) => {
  try {
    const { userId, date } = req.params;
    const today = new Date().toISOString().split("T")[0];
    if (date === today) {
      return res.status(400).json({ message: "Use /intake for today" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let entry = user.nutritionHistory.find((h) => h.date === date);
    if (!entry) {
      user.nutritionHistory.push({ date, calories: 0, protein: 0, carbs: 0, fats: 0, foods: [], water: 0 });
      entry = user.nutritionHistory[user.nutritionHistory.length - 1];
    }

    if (req.body.food) entry.foods.push(req.body.food);
    entry.calories = (entry.calories || 0) + Number(req.body.calories || 0);
    entry.protein  = (entry.protein  || 0) + Number(req.body.protein  || 0);
    entry.carbs    = (entry.carbs    || 0) + Number(req.body.carbs    || 0);
    entry.fats     = (entry.fats     || 0) + Number(req.body.fats     || 0);

    await user.save();
    res.json({
      dailyIntake: { calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fats: entry.fats },
      foods: entry.foods,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to add food to history" });
  }
});

// ── Delete food from a specific historical date ─────────────────────────────
router.delete("/:userId/history/:date/food/:foodId", async (req, res) => {
  try {
    const { userId, date, foodId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const entry = user.nutritionHistory.find((h) => h.date === date);
    if (!entry) return res.status(404).json({ message: "History entry not found" });

    const food = entry.foods.id(foodId);
    if (!food) return res.status(404).json({ message: "Food not found" });

    await food.deleteOne();

    const totals = entry.foods.reduce(
      (acc, f) => ({ calories: acc.calories + (f.calories || 0), protein: acc.protein + (f.protein || 0), carbs: acc.carbs + (f.carbs || 0), fats: acc.fats + (f.fats || 0) }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
    entry.calories = totals.calories;
    entry.protein  = totals.protein;
    entry.carbs    = totals.carbs;
    entry.fats     = totals.fats;

    await user.save();
    res.json({
      dailyIntake: { calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fats: entry.fats },
      foods: entry.foods,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete food from history" });
  }
});

router.get("/:userId/history", async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const limitDays = Math.min(days, 90);

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const history = user.nutritionHistory || [];
    const sliced = history.slice(-limitDays);

    res.json(sliced);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:userId/history", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.nutritionHistory = [];
    await user.save();

    res.json({ message: "Nutrition history cleared securely" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Meal Templates ─────────────────────────────────────────────────────────

// GET all templates
router.get("/:userId/meal-templates", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ templates: user.mealTemplates });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST create template
router.post("/:userId/meal-templates", async (req, res) => {
  try {
    const { name, mealType, foods } = req.body;
    if (!name || !foods || foods.length === 0) {
      return res.status(400).json({ message: "Name and at least one food required" });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.mealTemplates.push({ name, mealType: mealType || "Breakfast", foods });
    await user.save();
    const created = user.mealTemplates[user.mealTemplates.length - 1];
    res.json({ template: created });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE template
router.delete("/:userId/meal-templates/:templateId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const template = user.mealTemplates.id(req.params.templateId);
    if (!template) return res.status(404).json({ message: "Template not found" });

    template.deleteOne();
    await user.save();
    res.json({ message: "Template deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST log template (add all its foods to today)
router.post("/:userId/meal-templates/:templateId/log", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Reset daily if needed
    if (user.lastResetDate !== today) {
      if (user.lastResetDate && user.dailyIntake.calories > 0) {
        user.nutritionHistory.push({
          date: user.lastResetDate,
          calories: user.dailyIntake.calories,
          protein: user.dailyIntake.protein,
          carbs: user.dailyIntake.carbs,
          fats: user.dailyIntake.fats,
          foods: user.foods,
          water: user.dailyWater,
        });
        if (user.nutritionHistory.length > 90) {
          user.nutritionHistory = user.nutritionHistory.slice(-90);
        }
      }
      user.dailyIntake = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      user.foods = [];
      user.dailyWater = 0;
      user.lastResetDate = today;
    }

    const template = user.mealTemplates.id(req.params.templateId);
    if (!template) return res.status(404).json({ message: "Template not found" });

    for (const food of template.foods) {
      user.foods.push({
        name: food.name,
        quantity: food.quantity,
        unit: food.unit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        mealType: template.mealType,
        createdAt: new Date(),
      });
      user.dailyIntake.calories += food.calories || 0;
      user.dailyIntake.protein  += food.protein  || 0;
      user.dailyIntake.carbs    += food.carbs    || 0;
      user.dailyIntake.fats     += food.fats     || 0;
    }

    await user.save();
    res.json({ dailyIntake: user.dailyIntake, foods: user.foods });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:userId", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
