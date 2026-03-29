const express = require("express");
const Groq = require("groq-sdk");
const User = require("../models/User");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const targets = user.nutritionTargets || {
      calories: 2500, protein: 180, carbs: 300, fats: 80,
    };

    const mealType = req.query.mealType || "breakfast";

    const prompt = `You are a sports nutritionist. Generate exactly 9 different high-protein ${mealType} meal suggestions for a person who works out regularly.

Their daily macro targets:
- Calories: ${targets.calories} kcal
- Protein: ${targets.protein}g
- Carbs: ${targets.carbs}g
- Fats: ${targets.fats}g

Rules:
- All 9 meals must be completely different from each other
- Real, practical meals with common ingredients
- Each meal should cover roughly 25-30% of daily targets
- High protein is the priority
- Include realistic ingredient amounts
- Add a "searchQuery" field with 2-3 words to search a photo for this meal (e.g. "grilled chicken bowl", "protein pancakes", "greek yogurt parfait")

Respond ONLY with a raw JSON array, no markdown, no backticks, no explanation:
[
  {
    "id": "unique_id",
    "name": "Meal Name",
    "description": "Short one-line description",
    "foods": ["Ingredient 1 (amount)", "Ingredient 2 (amount)"],
    "calories": 500,
    "protein": 40,
    "carbs": 45,
    "fats": 15,
    "prepTime": "10 min",
    "searchQuery": "grilled chicken rice"
  }
]`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are a sports nutritionist. Always respond with valid raw JSON only. No markdown, no backticks, no extra text.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response. Raw: " + raw);
    const meals = JSON.parse(jsonMatch[0]);

    res.json(meals);
  } catch (err) {
    console.error("Meal suggestion error:", err);
    res.status(500).json({ message: "Failed to generate meal suggestions" });
  }
});
// GET /api/meals/:userId/details - get cooking instructions for a meal
router.post("/details", async (req, res) => {
  try {
    const { name, description, foods } = req.body;

    const prompt = `You are a professional chef. Give detailed cooking instructions for this meal:

Meal: ${name}
Description: ${description}
Ingredients: ${foods.join(", ")}

Respond ONLY with raw JSON, no markdown, no backticks:
{
  "prepTime": "10 min",
  "cookTime": "20 min",
  "servings": 1,
  "difficulty": "Easy",
  "ingredients": [
    { "item": "Chicken breast", "amount": "120g", "note": "boneless, skinless" }
  ],
  "steps": [
    { "step": 1, "title": "Prepare the chicken", "instruction": "Season the chicken breast with salt, pepper, and olive oil." },
    { "step": 2, "title": "Cook", "instruction": "Heat a pan over medium-high heat and cook for 6-7 minutes each side." }
  ],
  "tips": ["Let the chicken rest for 5 minutes before cutting", "Use a meat thermometer to ensure 75°C internal temp"]
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: "You are a professional chef. Always respond with valid raw JSON only. No markdown, no backticks.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response. Raw: " + raw);
    const details = JSON.parse(jsonMatch[0]);

    res.json(details);
  } catch (err) {
    console.error("Meal details error:", err);
    res.status(500).json({ message: "Failed to get meal details" });
  }
});

// GET /api/meals/:userId/weekly-plan
router.get("/:userId/weekly-plan", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const targets = user.nutritionTargets || {
      calories: 2500, protein: 180, carbs: 300, fats: 80,
    };

    const countRaw = parseInt(req.query.mealCount) || 4;
    const mealCount = Math.max(2, Math.min(6, countRaw));

    const getMealSlots = (count) => {
      const slots = {
        2: ["lunch", "dinner"],
        3: ["breakfast", "lunch", "dinner"],
        4: ["breakfast", "lunch", "dinner", "snack"],
        5: ["breakfast", "morning_snack", "lunch", "dinner", "evening_snack"],
        6: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "late_snack"]
      };
      return slots[count] || slots[4];
    };

    const mealSlots = getMealSlots(mealCount);

    const snackSlots = mealSlots.filter(s => s.includes("snack"));
    const mainSlots = mealSlots.filter(s => !s.includes("snack"));
    const snackCalories = Math.round(targets.calories * 0.10);
    const mainCalories = Math.round((targets.calories - (snackCalories * snackSlots.length)) / mainSlots.length);

    const calorieMap = {};
    mealSlots.forEach(slot => {
      calorieMap[slot] = slot.includes("snack") ? snackCalories : mainCalories;
    });

    const mealInstructions = mealSlots.map(slot => 
      `- ${slot}: exactly ${calorieMap[slot]} kcal`
    ).join("\n");

    const prompt = `Generate a 7-day high-protein meal plan.
Daily targets: ${targets.calories} kcal, ${targets.protein}g protein.

Each day must have EXACTLY ${mealCount} meals:
${mealInstructions}

IMPORTANT: The foods array must contain ONLY ingredient names with amounts. NO calorie counts, NO parentheses, NO extra info.
CORRECT format: "foods": ["2 slices whole wheat bread", "1 medium avocado", "2 large eggs"]
WRONG format: "foods": ["2 slices whole wheat bread (140 calories)", "1 medium avocado (240 calories)"]

CRITICAL: Only include these meal keys in each day's meals object: ${mealSlots.join(", ")}
Do NOT include any other meal types.
Total calories per day must equal exactly ${targets.calories}.

Respond ONLY with raw JSON:
{
  "days": [
    {
      "day": "Monday",
      "meals": {
        ${mealSlots.map(slot => `"${slot}": { "name": "", "calories": ${calorieMap[slot]}, "protein": 0, "carbs": 0, "fats": 0, "prepTime": "", "foods": [] }`).join(',\n        ')}
      },
      "totalCalories": ${targets.calories},
      "totalProtein": ${targets.protein}
    }
  ]
}`;

    console.log("Generating plan with mealCount:", mealCount, "slots:", mealSlots);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are an elite sports nutritionist. Always respond with valid raw JSON only. Absolutely no markdown or explanatory text.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    // Use a loose regex to safely extract JSON regardless of formatting/markdown leakage
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response. Raw: " + raw);
    
    const plan = JSON.parse(jsonMatch[0]);

    res.json({ ...plan, targetCalories: targets.calories });
  } catch (err) {
    console.error("Weekly plan error:", err);
    res.status(500).json({ message: "Failed to generate weekly plan" });
  }
});

module.exports = router;