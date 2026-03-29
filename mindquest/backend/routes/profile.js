const express = require("express");
const User = require("../models/User");

const router = express.Router();

const checkAndResetDaily = async (userId) => {
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
  const user = await User.findById(userId);
  if (!user) return;
  
  if (user.lastResetDate !== today) {
    // Save today's data before reset
    if (user.lastResetDate && user.lastResetDate !== today) {
      if (user.dailyIntake.calories > 0) {
        user.nutritionHistory.push({
          date: user.lastResetDate,
          calories: user.dailyIntake.calories,
          protein: user.dailyIntake.protein,
          carbs: user.dailyIntake.carbs,
          fats: user.dailyIntake.fats,
          foods: user.foods,
          water: user.dailyWater,
        });
        // Keep only last 90 days
        if (user.nutritionHistory.length > 90) {
          user.nutritionHistory = user.nutritionHistory.slice(-90);
        }
      }
    }
    user.dailyIntake = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    user.dailyWater = 0;
    user.foods = [];
    user.lastResetDate = today;
    await user.save();
  }
};

/**
 * GET profile
 * GET /api/profile/:userId
 */
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

/**
 * UPDATE profile
 * PUT /api/profile/:userId
 */
router.put("/:userId", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      req.body,
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE daily intake
router.put("/:userId/intake", async (req, res) => {
  try {
    await checkAndResetDaily(req.params.userId);
    const user = await User.findById(req.params.userId);

    const food = req.body.food;

    // 1️⃣ Save food
    if (food) {
      user.foods.push(food);
    }

    // 2️⃣ Update totals
    user.dailyIntake.calories += Number(req.body.calories || 0);
    user.dailyIntake.protein += Number(req.body.protein || 0);
    user.dailyIntake.carbs += Number(req.body.carbs || 0);
    user.dailyIntake.fats += Number(req.body.fats || 0);

    // 3️⃣ Update streak logic
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    if (user.lastLoggedDate !== today) {
      if (!user.lastLoggedDate) {
        user.currentStreak = 1;
      } else {
        const lastDate = new Date(user.lastLoggedDate);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          user.currentStreak += 1;
        } else {
          user.currentStreak = 1;
        }
      }
      user.lastLoggedDate = today;
    }

    await user.save();
    res.json({
      dailyIntake: user.dailyIntake,
      foods: user.foods,
      currentStreak: user.currentStreak,
      lastLoggedDate: user.lastLoggedDate,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update intake" });
  }
});
// ADD weight log
router.post("/:userId/weight", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.weightLogs.push({
      weight: req.body.weight,
      date: req.body.date || new Date().toISOString().split("T")[0],
      note: req.body.note || "",
    });

    // Sync latest weight to main profile
    user.weight = req.body.weight;

    await user.save();
    res.json(user.weightLogs);
  } catch (err) {
    console.error("Failed to add weight log:", err);
    res.status(500).json({ message: "Failed to add weight log" });
  }
});

// DELETE weight log
router.delete("/:userId/weight/:logId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.weightLogs = user.weightLogs.filter(
      (log) => log._id.toString() !== req.params.logId
    );

    // Update current profile weight to the most recent tracking log if any exist
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

// UPDATE daily water
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

// DELETE food
router.delete("/:userId/food/:foodId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const food = user.foods.id(req.params.foodId);
    if (!food) return res.status(404).json({ message: "Food not found" });

    await food.deleteOne();

    // Recalculate dailyIntake from remaining foods to prevent drift
    const totals = user.foods.reduce(
      (acc, f) => ({
        calories: acc.calories + (f.calories || 0),
        protein:  acc.protein  + (f.protein  || 0),
        carbs:    acc.carbs    + (f.carbs    || 0),
        fats:     acc.fats     + (f.fats     || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    user.dailyIntake.calories = Math.max(0, totals.calories);
    user.dailyIntake.protein  = Math.max(0, totals.protein);
    user.dailyIntake.carbs    = Math.max(0, totals.carbs);
    user.dailyIntake.fats     = Math.max(0, totals.fats);

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
// ADD workout
// ADD workout
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
// UPDATE workout
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
// DELETE workout
router.delete("/:userId/workout/:workoutId", async (req, res) => {
  console.log("🔥 DELETE ROUTE HIT", req.params);   // 👈 ADD THIS LINE

  try {
    const { userId, workoutId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.workouts = user.workouts.filter(
      (w) => w._id.toString() !== workoutId
    );

    await user.save();

    res.json({ message: "Workout deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});



// GET workouts

router.get("/:userId/workouts", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.workouts || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch workouts" });
  }
});

/**
 * GET Historical Nutrition Data
 */
router.get("/:userId/history", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
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

/**
 * DELETE user nutrition history
 */
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

/**
 * DELETE user account entirely
 */
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
