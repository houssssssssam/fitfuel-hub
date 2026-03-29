const express = require("express");
const Groq = require("groq-sdk");
const User = require("../models/User");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const DEFAULT_TARGETS = {
  calories: 2500,
  protein: 180,
  carbs: 300,
  fats: 80,
};

const DEFAULT_INTAKE = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
};

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toPlainObject = (value) => {
  if (!value) return {};
  if (typeof value.toObject === "function") {
    return value.toObject();
  }
  return value;
};

const getTodayString = () => new Date().toISOString().split("T")[0];

const ensureUserNutritionState = (user) => {
  user.nutritionTargets = {
    ...DEFAULT_TARGETS,
    ...toPlainObject(user.nutritionTargets),
  };
  user.dailyIntake = {
    ...DEFAULT_INTAKE,
    ...toPlainObject(user.dailyIntake),
  };
  user.dailyWater = toNumber(user.dailyWater, 0);
  user.foods = Array.isArray(user.foods) ? user.foods : [];
  user.nutritionHistory = Array.isArray(user.nutritionHistory) ? user.nutritionHistory : [];
};

const checkAndResetDaily = async (user) => {
  ensureUserNutritionState(user);

  const today = getTodayString();
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

    user.dailyIntake = { ...DEFAULT_INTAKE };
    user.dailyWater = 0;
    user.foods = [];
    user.lastResetDate = today;
    await user.save();
  }

  return today;
};

const updateLoggingStreak = (user, today) => {
  if (user.lastLoggedDate === today) return;

  if (!user.lastLoggedDate) {
    user.currentStreak = 1;
  } else {
    const lastDate = new Date(user.lastLoggedDate);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    user.currentStreak = diffDays === 1 ? (user.currentStreak || 0) + 1 : 1;
  }

  user.lastLoggedDate = today;
};

const unwrapJsonReply = (rawReply) => {
  const trimmed = (rawReply || "").trim();
  if (!trimmed.startsWith("```")) return trimmed;

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
};

const normalizeMealType = (mealType) => {
  const normalized = (mealType || "snacks")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  return normalized || "snacks";
};

const normalizeFoodLog = (food) => {
  if (!food || typeof food !== "object") return null;

  const name = typeof food.name === "string" ? food.name.trim() : "";
  const quantity = Math.round(toNumber(food.quantity, 0) * 100) / 100;
  const unit = typeof food.unit === "string" && food.unit.trim() ? food.unit.trim() : "g";
  const calories = Math.max(0, Math.round(toNumber(food.calories, 0)));
  const protein = Math.max(0, Math.round(toNumber(food.protein, 0)));
  const carbs = Math.max(0, Math.round(toNumber(food.carbs, 0)));
  const fats = Math.max(0, Math.round(toNumber(food.fats, 0)));

  if (!name || quantity <= 0) return null;

  return {
    name,
    quantity,
    unit,
    mealType: normalizeMealType(food.mealType),
    calories,
    protein,
    carbs,
    fats,
  };
};

router.post("/", async (req, res) => {
  try {
    const { messages, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ message: "Invalid messages array" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const today = await checkAndResetDaily(user);
    ensureUserNutritionState(user);

    const targets = user.nutritionTargets || DEFAULT_TARGETS;
    const intake = user.dailyIntake || DEFAULT_INTAKE;
    const caloriesRemaining = targets.calories - intake.calories;
    const proteinRemaining = targets.protein - intake.protein;
    const workoutsThisWeek = (user.workouts || []).filter((workout) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(workout.date) > weekAgo;
    }).length;
    const recentFoods = (user.foods || []).slice(-5).map((food) => food.name).join(", ") || "none";
    const weightTrend = (user.weightLogs || []).slice(-3).map((entry) => entry.weight).join(" -> ") || "not tracked";
    const currentHour = new Date().getHours();

    const systemPrompt = `You are FuelBot, an expert AI fitness and nutrition coach embedded in FitFuel Hub with the ability to LOG FOODS directly to the user's daily food tracker.

## USER PROFILE
- Name: ${user.name}
- Age: ${user.age || "not set"}, Gender: ${user.gender || "not set"}
- Weight: ${user.weight || "not set"}kg, Height: ${user.height || "not set"}cm
- Fitness Goal: ${user.fitnessGoal || user.goal || "not set"}
- Activity Level: ${user.activityLevel || "not set"}

## TODAY'S NUTRITION (${today})
- Calories: ${intake.calories} / ${targets.calories} kcal (${caloriesRemaining} remaining)
- Protein: ${intake.protein}g / ${targets.protein}g (${proteinRemaining}g remaining)
- Carbs: ${intake.carbs}g / ${targets.carbs}g
- Fats: ${intake.fats}g / ${targets.fats}g
- Water: ${user.dailyWater || 0}ml
- Foods eaten today: ${recentFoods}

## FITNESS DATA
- Current streak: ${user.currentStreak || 0} days
- Workouts this week: ${workoutsThisWeek}
- Weight trend (last 3 logs): ${weightTrend}
- Achievements unlocked: ${(user.achievements || []).length}
- Current hour: ${currentHour}

## YOUR SPECIAL ABILITY: FOOD LOGGING
You can log foods directly to the user's tracker.

When the user wants to log food with phrases like:
"log", "add", "I ate", "I had", "track", "ate", "consumed",
"just ate", "having", "I'm eating", "put", "record":

1. Extract the food name, quantity, unit, and meal type
2. Calculate accurate macros per 100g from your nutrition knowledge
3. Scale to the actual quantity
4. Respond with ONLY valid JSON and no other text

{
  "type": "FOOD_LOG",
  "message": "Logged! Added **[quantity][unit] [food name]** to your [meal] ([calories] cal, [protein]g protein).",
  "food": {
    "name": "exact food name",
    "quantity": 100,
    "unit": "g",
    "mealType": "breakfast",
    "calories": 165,
    "protein": 31,
    "carbs": 0,
    "fats": 4
  }
}

## MEAL TYPE DETECTION
- "breakfast", "morning", "am" -> "breakfast"
- "lunch", "midday", "noon" -> "lunch"
- "dinner", "supper", "evening", "night" -> "dinner"
- "snack", "snacks" -> "snacks"
- No meal mentioned -> use time of day:
  5am-10am -> breakfast
  10am-3pm -> lunch
  3pm-6pm -> snacks
  6pm-11pm -> dinner
  otherwise -> snacks

## ACCURATE MACRO DATABASE (per 100g unless unit noted)
Proteins:
- Chicken breast (cooked): 165 cal, 31g P, 0g C, 3.6g F
- Chicken breast (raw): 120 cal, 22g P, 0g C, 2.6g F
- Beef (lean ground): 215 cal, 26g P, 0g C, 12g F
- Salmon: 208 cal, 20g P, 0g C, 13g F
- Tuna (canned): 116 cal, 26g P, 0g C, 1g F
- Egg (whole): 143 cal, 13g P, 1g C, 10g F
- Egg white: 52 cal, 11g P, 1g C, 0g F
- Shrimp: 99 cal, 24g P, 0g C, 0.3g F
- Turkey breast: 135 cal, 30g P, 0g C, 1g F
- Greek yogurt: 59 cal, 10g P, 3.6g C, 0.4g F
- Cottage cheese: 98 cal, 11g P, 3.4g C, 4.3g F
- Whey protein (1 scoop = 30g): 120 cal, 24g P, 3g C, 2g F
- Protein shake (ready to drink): 80 cal, 6g P, 4g C, 3g F

Carbs:
- White rice (cooked): 130 cal, 2.7g P, 28g C, 0.3g F
- Brown rice (cooked): 112 cal, 2.3g P, 24g C, 0.9g F
- Oats (dry): 389 cal, 17g P, 66g C, 7g F
- Oats (cooked): 71 cal, 2.5g P, 12g C, 1.5g F
- Oatmeal with milk: 84 cal, 3.4g P, 12g C, 2.5g F
- Whole wheat bread (1 slice = 30g): 80 cal, 4g P, 14g C, 1g F
- White bread (1 slice = 25g): 67 cal, 2g P, 13g C, 0.8g F
- Pasta (cooked): 131 cal, 5g P, 25g C, 1.1g F
- Sweet potato (cooked): 90 cal, 2g P, 21g C, 0.1g F
- Potato (boiled): 87 cal, 1.9g P, 20g C, 0.1g F
- Banana: 89 cal, 1.1g P, 23g C, 0.3g F
- Apple: 52 cal, 0.3g P, 14g C, 0.2g F
- Orange: 47 cal, 0.9g P, 12g C, 0.1g F

Fats:
- Olive oil: 884 cal, 0g P, 0g C, 100g F
- Peanut butter (2 tbsp = 32g): 188 cal, 8g P, 6g C, 16g F
- Almonds: 579 cal, 21g P, 22g C, 50g F
- Avocado: 160 cal, 2g P, 9g C, 15g F
- Butter (1 tbsp = 14g): 102 cal, 0g P, 0g C, 12g F

Dairy:
- Whole milk: 61 cal, 3.2g P, 4.8g C, 3.3g F
- Cheddar cheese: 403 cal, 25g P, 1.3g C, 33g F

Fast food estimates:
- Big Mac: 257 cal, 12g P, 21g C, 15g F

## UNIT CONVERSIONS
- 1 cup = 240g for liquids, 200g for cooked rice, 80g for dry oats
- 1 bowl = 200g
- 1 tbsp = 15g
- 1 tsp = 5g
- 1 oz = 28.35g
- 1 egg = 50g
- 1 bread slice = 30g
- 1 scoop protein = 30g
- 1 glass = 250g
- 1 handful = 30g

## SMART QUANTITY PARSING
- "2 eggs" -> 100g
- "3 scrambled eggs" -> 150g
- "1 cup oatmeal" -> 240g if clearly cooked, otherwise 80g dry oats
- "100g chicken" -> 100g
- "half avocado" -> 100g
- "a handful of almonds" -> 30g
- "a bowl of rice" -> 200g
- "a glass of milk" -> 250g

## IMPORTANT RULES
1. If it is a food log request, always respond with the FOOD_LOG JSON format above
2. If it is a regular question, respond normally as a coach in concise plain text
3. Round calories, protein, carbs, and fats to whole numbers
4. Keep quantity realistic and convert it into a clear unit
5. If a food is unknown, estimate based on similar foods
6. Never return JSON for non-food-log requests
7. Never wrap JSON in markdown code fences
8. Be specific, helpful, and encouraging`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-10).map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    const rawReply = (completion.choices[0]?.message?.content || "").trim();
    const jsonReply = unwrapJsonReply(rawReply);

    try {
      const parsed = JSON.parse(jsonReply);

      if (parsed.type === "FOOD_LOG" && parsed.food) {
        const normalizedFood = normalizeFoodLog(parsed.food);

        if (!normalizedFood) {
          return res.json({
            reply: "I couldn't calculate that food entry clearly enough. Please include the food and quantity so I can log it accurately.",
            type: "text",
          });
        }

        user.foods.push(normalizedFood);
        user.dailyIntake.calories += normalizedFood.calories;
        user.dailyIntake.protein += normalizedFood.protein;
        user.dailyIntake.carbs += normalizedFood.carbs;
        user.dailyIntake.fats += normalizedFood.fats;
        updateLoggingStreak(user, today);

        await user.save();

        return res.json({
          reply: typeof parsed.message === "string" && parsed.message.trim()
            ? parsed.message.trim()
            : `Logged! Added **${normalizedFood.quantity}${normalizedFood.unit} ${normalizedFood.name}** to your ${normalizedFood.mealType.replace(/_/g, " ")}.`,
          type: "FOOD_LOG",
          foodLogged: normalizedFood,
          updatedIntake: user.dailyIntake,
        });
      }
    } catch {
      // Normal text reply.
    }

    return res.json({
      reply: rawReply || "I'm currently resting my circuits. Ask again later!",
      type: "text",
    });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ message: "Chat failed" });
  }
});

module.exports = router;
