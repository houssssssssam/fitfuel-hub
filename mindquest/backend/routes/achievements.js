const express = require("express");
const User = require("../models/User");
const ACHIEVEMENTS = require("../data/achievements");

const router = express.Router();

/**
 * Validates which achievements a user should unlock based on their current profile fields.
 * Only returns newly unlocked achievements to avoid spamming the user.
 */
router.post("/:userId/check", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const unlockedIds = new Set(user.achievements.map((a) => a.id));
    const newlyUnlocked = [];

    const checkAndUnlock = (id, condition) => {
      if (!unlockedIds.has(id) && condition) {
        const badge = ACHIEVEMENTS.find(a => a.id === id);
        if (badge) {
          user.achievements.push({ id, unlockedAt: new Date() });
          newlyUnlocked.push(badge);
          unlockedIds.add(id);
        }
      }
    };

    // 1. Food Logging & Streaks
    checkAndUnlock("first_meal", user.foods.length > 0);
    checkAndUnlock("streak_3", user.currentStreak >= 3);
    checkAndUnlock("streak_7", user.currentStreak >= 7);
    checkAndUnlock("streak_30", user.currentStreak >= 30);
    checkAndUnlock("meals_explored", user.foods.length >= 50);

    // 2. Daily Goal Hits (Checking today's intake)
    const intake = user.dailyIntake;
    const goals = user.nutritionTargets;
    checkAndUnlock("protein_goal", intake.protein >= goals.protein);
    checkAndUnlock("water_goal", user.dailyWater >= 2500);

    const macroMaster = 
      intake.calories >= goals.calories * 0.9 &&
      intake.protein >= goals.protein * 0.9 &&
      intake.carbs >= goals.carbs * 0.9 &&
      intake.fats >= goals.fats * 0.9;
    checkAndUnlock("macro_perfect", macroMaster);

    // 3. Workouts
    checkAndUnlock("workout_1", user.workouts.length >= 1);
    checkAndUnlock("workout_10", user.workouts.length >= 10);
    checkAndUnlock("workout_50", user.workouts.length >= 50);

    // 4. Weight Tracking
    checkAndUnlock("weight_logged", user.weightLogs && user.weightLogs.length >= 7);
    
    if (user.weightLogs && user.weightLogs.length > 1) {
      const startWeight = user.weightLogs[0].weight;
      const currentWeight = user.weightLogs[user.weightLogs.length - 1].weight;
      const diff = Math.abs(currentWeight - startWeight);
      
      checkAndUnlock("weight_loss_5", diff >= 5);
      checkAndUnlock("weight_loss_10", diff >= 10);
    }

    // 5. Onboarding / Profile Complete
    const profileComplete = user.weight && user.height && user.age && user.gender;
    checkAndUnlock("profile_complete", profileComplete);

    // Some custom ones like early_bird/night_owl can be triggered on the specific log event itself or estimated
    // For simplicity, we can do a rough check if a food was logged in AM hours
    const hasEarlyMeal = user.foods.some(f => {
      const hrs = new Date(f.createdAt || Date.now()).getHours();
      return hrs >= 5 && hrs < 9;
    });
    checkAndUnlock("early_bird", hasEarlyMeal);

    const hasNightMeal = user.foods.some(f => {
      const hrs = new Date(f.createdAt || Date.now()).getHours();
      return hrs >= 20 || hrs < 4;
    });
    checkAndUnlock("night_owl", hasNightMeal);

    if (newlyUnlocked.length > 0) {
      await user.save();
    }

    res.json(newlyUnlocked);
  } catch (err) {
    console.error("Achievement check failed:", err);
    res.status(500).json({ message: "Server error during achievement check" });
  }
});

module.exports = router;
