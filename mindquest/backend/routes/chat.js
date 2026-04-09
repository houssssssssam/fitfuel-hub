const express = require("express");
const Groq = require("groq-sdk");
const multer = require("multer");
const User = require("../models/User");
const { pushRecentFood } = require("../utils/foodLibrary");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_VISION_UPLOAD_BYTES = Math.floor(2.8 * 1024 * 1024);
const MAX_GROQ_BASE64_BYTES = 4 * 1024 * 1024;

const visionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VISION_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = /^image\/(jpeg|jpg|png|webp|gif)$/i;
    if (allowedMimeTypes.test(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image files (jpeg, png, webp, gif) are allowed"), false);
  },
});

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

const parseOptionalJson = (value) => {
  if (!value || typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const runVisionUpload = (req, res) => new Promise((resolve, reject) => {
  visionUpload.single("image")(req, res, (error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

const buildFallbackFoodLogMessage = (food) =>
  `Logged! Added **${food.quantity}${food.unit} ${food.name}** to your ${food.mealType.replace(/_/g, " ")}.`;

// Returns true only when the user clearly wants to log food, not just ask about it.
const detectFoodLoggingIntent = (message) => {
  const lower = message.toLowerCase();

  const infoKeywords = [
    "macros", "how many", "calories in", "nutrition of", "what is",
    "what are", "tell me", "show me", "how much protein", "how much fat",
    "how much carb", "is it healthy", "should i eat", "what should",
  ];
  if (infoKeywords.some((kw) => lower.includes(kw))) return false;

  const explicitKeywords = [
    "log", "add", "track", "record", "save",
    "i ate", "i had", "i've had", "i've eaten", "i just ate",
    "just ate", "just had", "ate", "had", "consumed",
    "i'm eating", "i am eating", "eating", "having",
  ];
  return explicitKeywords.some((kw) => lower.includes(kw));
};

// Pre-computes each macro's status so the LLM gets explicit facts, not raw numbers.
const analyzeCurrentStatus = (intake, targets) => {
  const status = (current, target) => {
    if (current >= target * 1.05) return "EXCEEDED ⚠️";
    if (current >= target * 0.95) return "MET ✅";
    return "NEEDS MORE";
  };

  const proteinStatus  = status(intake.protein,  targets.protein);
  const carbsStatus    = status(intake.carbs,     targets.carbs);
  const fatsStatus     = status(intake.fats,      targets.fats);
  const caloriesStatus = status(intake.calories,  targets.calories);

  const needs = [];
  if (proteinStatus  === "NEEDS MORE") needs.push("more protein");
  if (carbsStatus    === "NEEDS MORE") needs.push("more carbs");
  if (fatsStatus     === "NEEDS MORE") needs.push("more fats");
  if (caloriesStatus === "NEEDS MORE") needs.push("more calories");

  const exceeded = [];
  if (proteinStatus  === "EXCEEDED ⚠️") exceeded.push("protein");
  if (carbsStatus    === "EXCEEDED ⚠️") exceeded.push("carbs");
  if (fatsStatus     === "EXCEEDED ⚠️") exceeded.push("fats");
  if (caloriesStatus === "EXCEEDED ⚠️") exceeded.push("calories");

  const allMet =
    needs.length === 0 &&
    exceeded.length === 0 &&
    [proteinStatus, carbsStatus, fatsStatus, caloriesStatus].every((s) => s === "MET ✅");

  return {
    lines: [
      `- Calories : ${caloriesStatus} (${intake.calories} / ${targets.calories} kcal)`,
      `- Protein  : ${proteinStatus}  (${intake.protein}g / ${targets.protein}g)`,
      `- Carbs    : ${carbsStatus}    (${intake.carbs}g / ${targets.carbs}g)`,
      `- Fats     : ${fatsStatus}     (${intake.fats}g / ${targets.fats}g)`,
    ].join("\n"),
    needs,
    exceeded,
    allMet,
  };
};

const applyFoodLogToUser = async (user, today, parsed) => {
  const normalizedFood = normalizeFoodLog(parsed?.food);

  if (!normalizedFood) {
    return {
      error: "I couldn't calculate that food entry clearly enough. Please include the food and quantity so I can log it accurately.",
    };
  }

  user.foods.push(normalizedFood);
  pushRecentFood(user, {
    name: normalizedFood.name,
    unit: normalizedFood.unit,
    calories: normalizedFood.calories,
    protein: normalizedFood.protein,
    carbs: normalizedFood.carbs,
    fats: normalizedFood.fats,
    servingSize: {
      amount: normalizedFood.quantity,
      unit: normalizedFood.unit,
    },
  });
  user.dailyIntake.calories += normalizedFood.calories;
  user.dailyIntake.protein += normalizedFood.protein;
  user.dailyIntake.carbs += normalizedFood.carbs;
  user.dailyIntake.fats += normalizedFood.fats;
  updateLoggingStreak(user, today);

  await user.save();

  return {
    reply: typeof parsed?.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : buildFallbackFoodLogMessage(normalizedFood),
    foodLogged: normalizedFood,
    updatedIntake: user.dailyIntake,
  };
};

const getVisionErrorPayload = (error) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return {
      status: 413,
      message: "Image is too large. Please use a photo under 3MB.",
    };
  }

  if (typeof error?.message === "string" && error.message.includes("Only image files")) {
    return {
      status: 400,
      message: error.message,
    };
  }

  const status = error?.status || error?.response?.status;

  if (status === 429) {
    return {
      status: 429,
      message: "FuelBot vision is busy right now. Please try again in a moment.",
    };
  }

  if (status === 401 || status === 403) {
    return {
      status: 502,
      message: "FuelBot vision could not reach Groq. Please check the API key configuration.",
    };
  }

  return {
    status: 500,
    message: "Failed to analyze image",
  };
};

router.post("/", async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.userId; // from JWT — not from body

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
    const workoutsThisWeek = (user.workouts || []).filter((workout) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(workout.date) > weekAgo;
    }).length;
    const recentFoods = (user.foods || []).slice(-5).map((food) => food.name).join(", ") || "none";
    const weightTrend = (user.weightLogs || []).slice(-3).map((entry) => entry.weight).join(" -> ") || "not tracked";
    const currentHour = new Date().getHours();

    // Derive the last user message for intent detection
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const hasLoggingIntent = detectFoodLoggingIntent(lastUserMessage);
    const macroStatus = analyzeCurrentStatus(intake, targets);

    const systemPrompt = `You are FuelBot, an expert AI fitness and nutrition coach embedded in FitFuel Hub.

## USER PROFILE
- Name: ${user.name}
- Age: ${user.age || "not set"}, Gender: ${user.gender || "not set"}
- Weight: ${user.weight || "not set"}kg, Height: ${user.height || "not set"}cm
- Fitness Goal: ${user.fitnessGoal || user.goal || "not set"}
- Activity Level: ${user.activityLevel || "not set"}

## TODAY'S NUTRITION (${today})
${macroStatus.lines}
- Water: ${user.dailyWater || 0}ml
- Foods eaten today: ${recentFoods}

## MACRO ANALYSIS — READ THIS CAREFULLY BEFORE GIVING ADVICE
${macroStatus.allMet
  ? "✅ User has met ALL targets. Congratulate them and suggest maintenance foods."
  : [
      macroStatus.exceeded.length > 0
        ? `⚠️ OVER TARGET: ${macroStatus.exceeded.join(", ")} — DO NOT suggest more of these. Suggest reducing or balancing.`
        : "",
      macroStatus.needs.length > 0
        ? `📉 STILL NEEDS: ${macroStatus.needs.join(", ")} — Suggest foods rich in these.`
        : "",
    ]
      .filter(Boolean)
      .join("\n")}

RULE: If a macro is EXCEEDED, NEVER suggest eating more of it. Always check status above before any advice.

## FITNESS DATA
- Current streak: ${user.currentStreak || 0} days
- Workouts this week: ${workoutsThisWeek}
- Weight trend (last 3 logs): ${weightTrend}
- Achievements unlocked: ${(user.achievements || []).length}
- Current hour: ${currentHour}

## FOOD LOGGING
${hasLoggingIntent ? `The user's message contains an explicit logging intent (log/add/track/ate/had/consumed/eating/having).
You CAN log food. When logging, respond with ONLY valid JSON (no markdown, no extra text):

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
}` : `The user is asking for INFORMATION only — NOT requesting to log food.
DO NOT return a FOOD_LOG JSON. Respond in plain text with the requested nutritional info.
Examples that must NOT log: "pasta macros", "how many calories in rice", "is chicken healthy", "what should I eat".`}

## MEAL TYPE DETECTION (only used when logging)
- "breakfast", "morning" -> "breakfast"
- "lunch", "midday", "noon" -> "lunch"
- "dinner", "supper", "evening", "night" -> "dinner"
- "snack" -> "snacks"
- No meal mentioned -> use hour: 5-10 breakfast, 10-15 lunch, 15-18 snacks, 18-23 dinner, else snacks

## ACCURATE MACRO DATABASE (per 100g unless noted)
Proteins: Chicken breast cooked 165/31/0/3.6 | Chicken raw 120/22/0/2.6 | Beef lean 215/26/0/12 | Salmon 208/20/0/13 | Tuna canned 116/26/0/1 | Egg whole 143/13/1/10 | Egg white 52/11/1/0 | Shrimp 99/24/0/0.3 | Turkey 135/30/0/1 | Greek yogurt 59/10/3.6/0.4 | Cottage cheese 98/11/3.4/4.3 | Whey 1scoop=30g 120/24/3/2
Carbs: White rice cooked 130/2.7/28/0.3 | Brown rice 112/2.3/24/0.9 | Oats dry 389/17/66/7 | Oats cooked 71/2.5/12/1.5 | Pasta cooked 131/5/25/1.1 | Sweet potato 90/2/21/0.1 | Potato boiled 87/1.9/20/0.1 | Banana 89/1.1/23/0.3 | Apple 52/0.3/14/0.2 | Bread whole wheat 1slice=30g 80/4/14/1 | Bread white 1slice=25g 67/2/13/0.8
Fats: Olive oil 884/0/0/100 | Peanut butter 2tbsp=32g 188/8/6/16 | Almonds 579/21/22/50 | Avocado 160/2/9/15 | Butter 1tbsp=14g 102/0/0/12
Dairy: Whole milk 61/3.2/4.8/3.3 | Cheddar 403/25/1.3/33

## UNIT CONVERSIONS
1 cup=240g liquid/200g rice/80g dry oats | 1 bowl=200g | 1 tbsp=15g | 1 tsp=5g | 1 oz=28.35g | 1 egg=50g | 1 scoop protein=30g | 1 glass=250g | 1 handful=30g

## RULES
1. ALWAYS check MACRO ANALYSIS section before giving nutrition advice
2. ${hasLoggingIntent ? "Respond with FOOD_LOG JSON for the log request" : "Respond in plain text — no JSON"}
3. Round macros to whole numbers
4. Never wrap JSON in markdown code fences
5. Be specific, accurate, and encouraging`;

    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
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

      // Server-side guard: only honour FOOD_LOG if the user actually asked to log
      if (parsed.type === "FOOD_LOG" && parsed.food && hasLoggingIntent) {
        const foodLogResult = await applyFoodLogToUser(user, today, parsed);

        if (foodLogResult.error) {
          return res.json({
            reply: foodLogResult.error,
            type: "text",
          });
        }

        return res.json({
          reply: foodLogResult.reply,
          type: "FOOD_LOG",
          foodLogged: foodLogResult.foodLogged,
          updatedIntake: foodLogResult.updatedIntake,
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

router.post("/vision", async (req, res) => {
  try {
    await runVisionUpload(req, res);

    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({ message: "No image provided" });
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
    const recentFoods = (user.foods || []).slice(-5).map((food) => food.name).join(", ") || "none";
    const currentHour = new Date().getHours();
    const userContext = parseOptionalJson(req.body?.userContext);
    const base64Image = imageFile.buffer.toString("base64");

    if (Buffer.byteLength(base64Image, "utf8") > MAX_GROQ_BASE64_BYTES) {
      return res.status(413).json({
        message: "Image is too large. Please use a photo under 3MB.",
      });
    }

    const systemPrompt = `You are FuelBot, the fitness and nutrition AI assistant inside FitFuel Hub with image understanding.

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
- Current hour: ${currentHour}

## OPTIONAL CLIENT CONTEXT
${userContext ? JSON.stringify(userContext) : "No additional client context provided"}

## VISION TASKS
- Meal photos: identify likely foods, explain uncertainty, estimate calories and macros per item and total, and mention portion assumptions.
- Nutrition labels: prioritize printed numbers over estimates and extract servings, calories, protein, carbs, fats, sugar, fiber, and sodium when visible.
- Progress photos: give supportive fitness feedback focused on visible trends, posture, consistency, and practical next steps. Never shame the user or claim medical diagnoses.
- General image questions: answer directly and clearly.

## FOOD LOGGING
If the user clearly asks you to log food from the image, respond with ONLY valid JSON and no markdown using this schema:
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

## RESPONSE RULES
1. Never pretend the estimate is exact when you are inferring from an image.
2. If you are unsure, give the most likely range and say what affects accuracy.
3. For progress photos, keep the tone encouraging and practical.
4. For label photos, use the visible text first and fill gaps only when necessary.
5. Return JSON only for explicit image-based food logging requests.
6. Otherwise respond in concise plain text.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: (req.body?.message || "").trim() || "What's in this image and how does it fit my goals?",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${imageFile.mimetype};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    const rawReply = (completion.choices[0]?.message?.content || "").trim();
    const jsonReply = unwrapJsonReply(rawReply);

    try {
      const parsed = JSON.parse(jsonReply);

      if (parsed.type === "FOOD_LOG" && parsed.food) {
        const foodLogResult = await applyFoodLogToUser(user, today, parsed);

        if (foodLogResult.error) {
          return res.json({
            reply: foodLogResult.error,
            type: "text",
            hasImage: true,
          });
        }

        return res.json({
          reply: foodLogResult.reply,
          type: "FOOD_LOG",
          hasImage: true,
          foodLogged: foodLogResult.foodLogged,
          updatedIntake: foodLogResult.updatedIntake,
        });
      }
    } catch {
      // Normal text reply.
    }

    return res.json({
      reply: rawReply || "I couldn't read that image clearly enough. Try a brighter or closer photo.",
      type: "text",
      hasImage: true,
    });
  } catch (error) {
    console.error("Vision chat error:", error);
    const payload = getVisionErrorPayload(error);
    return res.status(payload.status).json({ message: payload.message });
  }
});

module.exports = router;
