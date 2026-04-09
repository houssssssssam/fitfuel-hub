const express = require("express");
const Groq = require("groq-sdk");
const MealPlan = require("../models/MealPlan");
const User = require("../models/User");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Helpers ───────────────────────────────────────────────────────────────────

const getWeekLabel = (date) => {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  const month = d.toLocaleString("en", { month: "short" });
  return `Week ${weekNum} — ${month} ${d.getFullYear()}`;
};

const getMealSlots = (count) => {
  const slots = {
    2: ["lunch", "dinner"],
    3: ["breakfast", "lunch", "dinner"],
    4: ["breakfast", "lunch", "dinner", "snack"],
    5: ["breakfast", "morning_snack", "lunch", "dinner", "evening_snack"],
    6: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "late_snack"],
  };
  return slots[count] || slots[4];
};

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ── POST / — Save a new meal plan ────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const userId = req.userId;
    const { days, mealCount, targetCalories, nutritionTargets } = req.body;

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ message: "days array is required" });
    }

    // Deactivate any currently-active plan
    await MealPlan.updateMany(
      { userId, isActive: true },
      { $set: { isActive: false } }
    );

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Monday
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const plan = new MealPlan({
      userId,
      name: getWeekLabel(startDate),
      startDate,
      endDate,
      days: days.map((d) => ({
        dayName: d.day || d.dayName,
        meals: d.meals,
        totalCalories: toNumber(d.totalCalories),
        totalProtein: toNumber(d.totalProtein),
      })),
      nutritionTargets: nutritionTargets || {},
      mealCount: toNumber(mealCount, 4),
      targetCalories: toNumber(targetCalories),
      isActive: true,
    });

    await plan.save();

    // Update user refs
    await User.findByIdAndUpdate(userId, {
      activeMealPlan: plan._id,
      $push: { mealPlanHistory: plan._id },
    });

    res.status(201).json(plan);
  } catch (err) {
    console.error("Save meal plan error:", err);
    res.status(500).json({ message: "Failed to save meal plan" });
  }
});

// ── GET / — Get all meal plans for the user ──────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const plans = await MealPlan.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("-days") // lightweight listing
      .lean();

    res.json(plans);
  } catch (err) {
    console.error("List meal plans error:", err);
    res.status(500).json({ message: "Failed to list meal plans" });
  }
});

// ── GET /active — Get active meal plan ───────────────────────────────────────
router.get("/active", async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      userId: req.userId,
      isActive: true,
    }).lean();

    if (!plan) {
      return res.json(null);
    }
    res.json(plan);
  } catch (err) {
    console.error("Get active meal plan error:", err);
    res.status(500).json({ message: "Failed to get active meal plan" });
  }
});

// ── GET /:id — Get specific meal plan ────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).lean();

    if (!plan) {
      return res.status(404).json({ message: "Meal plan not found" });
    }
    res.json(plan);
  } catch (err) {
    console.error("Get meal plan error:", err);
    res.status(500).json({ message: "Failed to get meal plan" });
  }
});

// ── PUT /:id — Update meal plan (edit meals, rename, etc.) ───────────────────
router.put("/:id", async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!plan) {
      return res.status(404).json({ message: "Meal plan not found" });
    }

    const { name, days } = req.body;

    if (name !== undefined) plan.name = name;
    if (Array.isArray(days)) {
      plan.days = days.map((d) => ({
        dayName: d.day || d.dayName,
        meals: d.meals,
        totalCalories: toNumber(d.totalCalories),
        totalProtein: toNumber(d.totalProtein),
      }));
    }

    plan.updatedAt = new Date();
    await plan.save();

    res.json(plan);
  } catch (err) {
    console.error("Update meal plan error:", err);
    res.status(500).json({ message: "Failed to update meal plan" });
  }
});

// ── PUT /:id/activate — Set a plan as active ─────────────────────────────────
router.put("/:id/activate", async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!plan) {
      return res.status(404).json({ message: "Meal plan not found" });
    }

    // Deactivate all others
    await MealPlan.updateMany(
      { userId: req.userId, isActive: true },
      { $set: { isActive: false } }
    );

    plan.isActive = true;
    plan.updatedAt = new Date();
    await plan.save();

    await User.findByIdAndUpdate(req.userId, {
      activeMealPlan: plan._id,
    });

    res.json(plan);
  } catch (err) {
    console.error("Activate meal plan error:", err);
    res.status(500).json({ message: "Failed to activate meal plan" });
  }
});

// ── DELETE /:id — Delete a meal plan ─────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!plan) {
      return res.status(404).json({ message: "Meal plan not found" });
    }

    await MealPlan.deleteOne({ _id: plan._id });

    // Clean up user refs
    const update = {
      $pull: { mealPlanHistory: plan._id },
    };
    if (plan.isActive) {
      update.activeMealPlan = null;
    }
    await User.findByIdAndUpdate(req.userId, update);

    res.json({ message: "Meal plan deleted" });
  } catch (err) {
    console.error("Delete meal plan error:", err);
    res.status(500).json({ message: "Failed to delete meal plan" });
  }
});

// ── POST /:id/log-meal — Copy a meal to today's food log ─────────────────────
router.post("/:id/log-meal", async (req, res) => {
  try {
    const { mealName, mealType, calories, protein, carbs, fats } = req.body;

    if (!mealName || !mealType) {
      return res.status(400).json({ message: "mealName and mealType required" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Daily reset check
    const today = new Date().toISOString().split("T")[0];
    if (user.lastResetDate !== today) {
      if (user.lastResetDate && user.dailyIntake && user.dailyIntake.calories > 0) {
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
    }

    const cal = toNumber(calories);
    const prot = toNumber(protein);
    const carb = toNumber(carbs);
    const fat = toNumber(fats);

    user.foods.push({
      name: mealName,
      quantity: 1,
      unit: "serving",
      calories: cal,
      protein: prot,
      carbs: carb,
      fats: fat,
      mealType: mealType.toLowerCase().replace(/\s+/g, "_"),
      createdAt: new Date(),
    });

    user.dailyIntake.calories += cal;
    user.dailyIntake.protein += prot;
    user.dailyIntake.carbs += carb;
    user.dailyIntake.fats += fat;

    // Update streak
    if (user.lastLoggedDate !== today) {
      if (!user.lastLoggedDate) {
        user.currentStreak = 1;
      } else {
        const last = new Date(user.lastLoggedDate);
        const curr = new Date(today);
        const diff = Math.ceil(Math.abs(curr - last) / 86400000);
        user.currentStreak = diff === 1 ? (user.currentStreak || 0) + 1 : 1;
      }
      user.lastLoggedDate = today;
    }

    await user.save();

    res.json({
      message: `${mealName} logged to today's intake`,
      dailyIntake: user.dailyIntake,
      foods: user.foods,
    });
  } catch (err) {
    console.error("Log meal error:", err);
    res.status(500).json({ message: "Failed to log meal" });
  }
});

// ── POST /:id/regenerate-day — Regenerate a single day with AI ───────────────
router.post("/:id/regenerate-day", async (req, res) => {
  try {
    const { dayName } = req.body;
    if (!dayName) {
      return res.status(400).json({ message: "dayName is required" });
    }

    const plan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!plan) {
      return res.status(404).json({ message: "Meal plan not found" });
    }

    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const targets = plan.nutritionTargets || user.nutritionTargets || {
      calories: 2500,
      protein: 180,
      carbs: 300,
      fats: 80,
    };

    const mc = plan.mealCount || 4;
    const mealSlots = getMealSlots(mc);
    const snackSlots = mealSlots.filter((s) => s.includes("snack"));
    const mainSlots = mealSlots.filter((s) => !s.includes("snack"));
    const snackCalories = Math.round(targets.calories * 0.1);
    const mainCalories = Math.round(
      (targets.calories - snackCalories * snackSlots.length) / mainSlots.length
    );

    const calorieMap = {};
    mealSlots.forEach((slot) => {
      calorieMap[slot] = slot.includes("snack") ? snackCalories : mainCalories;
    });

    const mealInstructions = mealSlots
      .map((slot) => `- ${slot}: exactly ${calorieMap[slot]} kcal`)
      .join("\n");

    const prompt = `Generate a SINGLE day meal plan for ${dayName}.
Daily targets: ${targets.calories} kcal, ${targets.protein}g protein.

The day must have EXACTLY ${mc} meals:
${mealInstructions}

IMPORTANT: The foods array must contain ONLY ingredient names with amounts. NO calorie counts.
Total calories for the day must equal exactly ${targets.calories}.

Respond ONLY with raw JSON:
{
  "day": "${dayName}",
  "meals": {
    ${mealSlots.map((slot) => `"${slot}": { "name": "", "calories": ${calorieMap[slot]}, "protein": 0, "carbs": 0, "fats": 0, "prepTime": "", "foods": [] }`).join(",\n    ")}
  },
  "totalCalories": ${targets.calories},
  "totalProtein": ${targets.protein}
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are an elite sports nutritionist. Always respond with valid raw JSON only. No markdown.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }
    const newDay = JSON.parse(jsonMatch[0]);

    // Replace the specific day
    const dayIndex = plan.days.findIndex(
      (d) => d.dayName === dayName || d.day === dayName
    );

    const dayData = {
      dayName: newDay.day || dayName,
      meals: newDay.meals,
      totalCalories: toNumber(newDay.totalCalories),
      totalProtein: toNumber(newDay.totalProtein),
    };

    if (dayIndex >= 0) {
      plan.days[dayIndex] = dayData;
    } else {
      plan.days.push(dayData);
    }

    plan.updatedAt = new Date();
    plan.markModified("days");
    await plan.save();

    res.json(plan);
  } catch (err) {
    console.error("Regenerate day error:", err);
    res.status(500).json({ message: "Failed to regenerate day" });
  }
});

module.exports = router;
