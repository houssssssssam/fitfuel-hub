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

const safePercent = (value, target) => {
  if (!target || target <= 0) return 0;
  return Math.round((value / target) * 100);
};

const averageMetric = (days, key, fallback) => {
  if (!days.length) return fallback;
  const total = days.reduce((sum, day) => sum + (day[key] || 0), 0);
  return Math.round(total / days.length);
};

const deriveWeeklyPattern = (averages, targets, consistency) => {
  const entries = [
    { key: "calories", delta: Math.abs((averages.calories || 0) - (targets.calories || 0)) },
    { key: "protein", delta: Math.abs((averages.protein || 0) - (targets.protein || 0)) },
    { key: "carbs", delta: Math.abs((averages.carbs || 0) - (targets.carbs || 0)) },
    { key: "fats", delta: Math.abs((averages.fats || 0) - (targets.fats || 0)) },
  ].sort((a, b) => a.delta - b.delta);

  let trend = "stable";
  if (consistency >= 70) trend = "improving";
  if (consistency <= 30) trend = "declining";

  return {
    consistency,
    bestMacro: entries[0]?.key || "protein",
    worstMacro: entries[entries.length - 1]?.key || "calories",
    trend,
  };
};

const buildFallbackAdvice = (context) => {
  const { userName, targets, todayIntake, weeklyAverages, daysLoggedThisWeek, currentStreak, dailyWater, goal } = context;
  const proteinGap = Math.max((targets.protein || 0) - (todayIntake.protein || 0), 0);
  const caloriesGap = Math.max((targets.calories || 0) - (todayIntake.calories || 0), 0);
  const waterTarget = 2500;
  const waterGap = Math.max(waterTarget - (dailyWater || 0), 0);
  const consistency = Math.round((daysLoggedThisWeek / 7) * 100);
  const weeklyPattern = deriveWeeklyPattern(weeklyAverages, targets, consistency);

  return {
    overallScore: Math.max(25, Math.min(95, Math.round((safePercent(todayIntake.calories, targets.calories) + safePercent(todayIntake.protein, targets.protein) + consistency) / 3))),
    scoreLabel: consistency >= 70 ? "Building Momentum" : "Needs More Consistency",
    scoreColor: consistency >= 70 ? "green" : "yellow",
    summary: todayIntake.calories === 0
      ? `${userName} has not logged nutrition yet today, so the advice is leaning on weekly history and current goals.`
      : `${userName} is currently at ${todayIntake.calories} kcal and ${todayIntake.protein}g protein today, with a ${currentStreak}-day streak supporting the ${goal}.`,
    insights: [
      {
        id: "1",
        type: proteinGap > 0 ? "warning" : "success",
        title: proteinGap > 0 ? "Protein intake is behind target" : "Protein target is on track",
        description: proteinGap > 0
          ? `${userName} is at ${todayIntake.protein}g protein today versus a ${targets.protein}g goal.`
          : `${userName} is matching protein needs well for the current goal.`,
        metric: "protein",
        current: todayIntake.protein,
        target: targets.protein,
        unit: "g",
        priority: proteinGap > 30 ? "high" : "medium",
        action: proteinGap > 0 ? "Add lean chicken, Greek yogurt, eggs, or a whey shake to close the gap." : "Keep spreading protein across meals to maintain recovery support.",
      },
      {
        id: "2",
        type: caloriesGap > 0 ? "warning" : "success",
        title: caloriesGap > 0 ? "Calories are below target" : "Calories are aligned",
        description: caloriesGap > 0
          ? `${userName} still has about ${caloriesGap} kcal to reach the daily target.`
          : `${userName} has already reached the calorie target for the day.`,
        metric: "calories",
        current: todayIntake.calories,
        target: targets.calories,
        unit: "kcal",
        priority: caloriesGap > 500 ? "high" : "medium",
        action: caloriesGap > 0 ? "Use an easy add-on meal like rice, olive oil, yogurt, fruit, and nuts to finish stronger." : "Keep meal quality high so the extra calories support the goal effectively.",
      },
      {
        id: "3",
        type: waterGap > 0 ? "tip" : "success",
        title: waterGap > 0 ? "Hydration can be stronger" : "Hydration is strong today",
        description: waterGap > 0
          ? `${userName} has logged ${dailyWater}ml water, which is ${waterGap}ml short of a practical 2500ml goal.`
          : `${userName} has already hit a strong hydration level today.`,
        metric: "water",
        current: dailyWater,
        target: waterTarget,
        unit: "ml",
        priority: waterGap > 1000 ? "medium" : "low",
        action: waterGap > 0 ? "Add one bottle during the afternoon and one with dinner to close the hydration gap." : "Maintain the same rhythm around training and meals.",
      },
      {
        id: "4",
        type: consistency >= 70 ? "success" : "info",
        title: consistency >= 70 ? "Logging consistency is helping" : "Consistency is the biggest opportunity",
        description: `${userName} logged nutrition on ${daysLoggedThisWeek} of the last 7 days.`,
        metric: "consistency",
        current: consistency,
        target: 100,
        unit: "%",
        priority: consistency >= 70 ? "low" : "high",
        action: consistency >= 70 ? "Keep logging daily so weekly averages stay useful and accurate." : "Prioritize logging at least one full week of meals to unlock more precise coaching.",
      },
    ],
    macroBalance: {
      assessment: `Weekly averages are ${weeklyPattern.trend} relative to ${goal}.`,
      proteinStatus: weeklyAverages.protein < targets.protein * 0.9 ? "low" : weeklyAverages.protein > targets.protein * 1.1 ? "high" : "good",
      carbStatus: weeklyAverages.carbs < targets.carbs * 0.9 ? "low" : weeklyAverages.carbs > targets.carbs * 1.1 ? "high" : "good",
      fatStatus: weeklyAverages.fats < targets.fats * 0.9 ? "low" : weeklyAverages.fats > targets.fats * 1.1 ? "high" : "good",
    },
    weeklyPattern,
    topRecommendations: [
      {
        rank: 1,
        title: "Hit protein earlier in the day",
        detail: "Aim for 30 to 40g protein in your first meal using eggs, Greek yogurt, oats, or a shake.",
        impact: "high",
        timeframe: "Today",
      },
      {
        rank: 2,
        title: "Close the calorie gap with simple foods",
        detail: "Use rice, potatoes, olive oil, yogurt, and fruit for easier calorie completion without overcomplicating meals.",
        impact: "medium",
        timeframe: "This week",
      },
      {
        rank: 3,
        title: "Protect your streak with simple logging",
        detail: "Log meals consistently even on imperfect days so the weekly analysis stays useful.",
        impact: "medium",
        timeframe: "This month",
      },
    ],
    mealTimingTips: [
      {
        meal: "Breakfast",
        tip: "Front-load protein so the rest of the day is easier to manage.",
        foods: ["eggs", "Greek yogurt", "oats"],
      },
      {
        meal: "Pre-workout",
        tip: "Use quick carbs and moderate protein for training energy.",
        foods: ["banana", "rice cakes", "whey shake"],
      },
      {
        meal: "Post-workout",
        tip: "Recover with protein and carbs within the next meal window.",
        foods: ["chicken and rice", "potatoes", "fruit"],
      },
      {
        meal: "Dinner",
        tip: "Keep the final meal balanced and easy to digest.",
        foods: ["salmon", "rice", "vegetables"],
      },
    ],
  };
};

router.get("/:userId", async (req, res) => {
  try {
    if (req.userId && req.userId !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const targets = { ...DEFAULT_TARGETS, ...(user.nutritionTargets || {}) };
    const intake = { ...DEFAULT_INTAKE, ...(user.dailyIntake || {}) };
    const history = Array.isArray(user.nutritionHistory) ? [...user.nutritionHistory] : [];
    history.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const last7Days = history.slice(-7);
    const avgCalories = averageMetric(last7Days, "calories", intake.calories);
    const avgProtein = averageMetric(last7Days, "protein", intake.protein);
    const avgCarbs = averageMetric(last7Days, "carbs", intake.carbs);
    const avgFats = averageMetric(last7Days, "fats", intake.fats);
    const daysLogged = last7Days.filter((day) => (day.calories || 0) > 0).length;

    const weightLogs = Array.isArray(user.weightLogs) ? [...user.weightLogs] : [];
    weightLogs.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const recentWeights = weightLogs.slice(-7).map((entry) => Number(entry.weight)).filter((value) => !Number.isNaN(value));
    const weightTrend = recentWeights.length >= 2
      ? Number((recentWeights[recentWeights.length - 1] - recentWeights[0]).toFixed(1))
      : 0;

    const consistencyPercent = Math.round((daysLogged / 7) * 100);
    const weeklyAverages = {
      calories: avgCalories,
      protein: avgProtein,
      carbs: avgCarbs,
      fats: avgFats,
    };

    const userContext = {
      userName: user.name || "User",
      age: user.age ?? "not set",
      gender: user.gender || "not set",
      weight: user.weight ?? "not set",
      height: user.height ?? "not set",
      goal: user.fitnessGoal || user.goal || "General Wellness",
      activityLevel: user.activityLevel || "not set",
      targets,
      todayIntake: intake,
      weeklyAverages,
      daysLoggedThisWeek: daysLogged,
      currentStreak: user.currentStreak || 0,
      weightTrend,
      dailyWater: user.dailyWater || 0,
      historyAvailable: last7Days.length,
    };

    const prompt = `You are an expert sports nutritionist.
Analyze this user's real nutrition data and provide specific, actionable advice.

USER DATA:
- Name: ${userContext.userName}
- Age: ${userContext.age}, Gender: ${userContext.gender}
- Weight: ${userContext.weight}kg, Height: ${userContext.height}cm
- Goal: ${userContext.goal}
- Activity: ${userContext.activityLevel}
- Current streak: ${userContext.currentStreak} days
- Days logged this week: ${userContext.daysLoggedThisWeek}/7
- Weight trend (last 7 days): ${userContext.weightTrend}kg

DAILY TARGETS:
- Calories: ${targets.calories} kcal
- Protein: ${targets.protein}g
- Carbs: ${targets.carbs}g
- Fats: ${targets.fats}g

TODAY'S INTAKE:
- Calories: ${intake.calories} kcal (${safePercent(intake.calories, targets.calories)}% of target)
- Protein: ${intake.protein}g (${safePercent(intake.protein, targets.protein)}% of target)
- Carbs: ${intake.carbs}g (${safePercent(intake.carbs, targets.carbs)}% of target)
- Fats: ${intake.fats}g (${safePercent(intake.fats, targets.fats)}% of target)
- Water: ${userContext.dailyWater}ml

WEEKLY AVERAGES (last 7 days):
- Avg Calories: ${avgCalories} kcal
- Avg Protein: ${avgProtein}g
- Avg Carbs: ${avgCarbs}g
- Avg Fats: ${avgFats}g

Generate a comprehensive nutrition analysis.
Respond ONLY with raw JSON, no markdown:
{
  "overallScore": 75,
  "scoreLabel": "Good Progress",
  "scoreColor": "green",
  "summary": "2 sentence personalized summary using their name and real numbers",
  "insights": [
    {
      "id": "1",
      "type": "warning|success|tip|info",
      "title": "specific title",
      "description": "specific description with real numbers from their data",
      "metric": "calories|protein|carbs|fats|water|consistency",
      "current": 0,
      "target": 0,
      "unit": "kcal|g|ml|%",
      "priority": "high|medium|low",
      "action": "specific actionable tip with real food suggestions"
    }
  ],
  "macroBalance": {
    "assessment": "one line assessment",
    "proteinStatus": "low|good|high",
    "carbStatus": "low|good|high",
    "fatStatus": "low|good|high"
  },
  "weeklyPattern": {
    "consistency": ${consistencyPercent},
    "bestMacro": "protein|carbs|fats|calories",
    "worstMacro": "protein|carbs|fats|calories",
    "trend": "improving|declining|stable"
  },
  "topRecommendations": [
    {
      "rank": 1,
      "title": "Most important action",
      "detail": "specific detail with foods and amounts",
      "impact": "high|medium|low",
      "timeframe": "Today|This week|This month"
    }
  ],
  "mealTimingTips": [
    {
      "meal": "Breakfast|Pre-workout|Post-workout|Dinner",
      "tip": "specific tip based on their goal",
      "foods": ["food1", "food2", "food3"]
    }
  ]
}

Be specific to their actual numbers. If calories are 0, say they haven't logged yet today. Use their name. Generate exactly 4-6 insights based on real gaps.`;

    const fallbackAdvice = buildFallbackAdvice(userContext);
    let advice = fallbackAdvice;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2000,
        temperature: 0.4,
        messages: [
          { role: "system", content: "Expert nutritionist. Raw JSON only. No markdown." },
          { role: "user", content: prompt },
        ],
      });

      const rawContent = completion.choices[0]?.message?.content || "";
      const raw = rawContent.replace(/```json|```/g, "").trim();
      advice = { ...fallbackAdvice, ...JSON.parse(raw) };
    } catch (aiError) {
      console.error("Nutrition advice AI fallback:", aiError.message || aiError);
    }

    advice.realData = {
      todayIntake: intake,
      targets,
      weeklyAverages,
      daysLoggedThisWeek: daysLogged,
      currentStreak: user.currentStreak || 0,
      weightTrend,
      dailyWater: user.dailyWater || 0,
      historyAvailable: last7Days.length,
      userName: user.name || "User",
      goal: user.fitnessGoal || user.goal || "General Wellness",
    };

    res.json(advice);
  } catch (err) {
    console.error("Nutrition advice error:", err);
    res.status(500).json({ message: "Failed to generate advice" });
  }
});

module.exports = router;
