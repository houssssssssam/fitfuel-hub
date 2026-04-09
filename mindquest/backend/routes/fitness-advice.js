const express = require("express");
const Groq = require("groq-sdk");
const User = require("../models/User");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Helpers ──────────────────────────────────────────────────────────────────

const getRecentWorkouts = (workouts, days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (workouts || []).filter((w) => new Date(w.date) >= cutoff);
};

const detectMuscleGroups = (exerciseName) => {
  const name = (exerciseName || "").toLowerCase();
  const map = {
    chest: ["bench", "press", "fly", "flye", "pec", "push-up", "pushup", "chest"],
    back: ["row", "pull-up", "pullup", "lat", "deadlift", "pull down", "pulldown", "back"],
    shoulders: ["shoulder", "ohp", "overhead", "lateral raise", "military", "delt", "face pull"],
    biceps: ["curl", "bicep", "hammer"],
    triceps: ["tricep", "pushdown", "skull", "dip", "extension"],
    legs: ["squat", "leg", "lunge", "calf", "hamstring", "quad", "rdl", "hip thrust", "glute"],
    core: ["ab", "crunch", "plank", "sit-up", "situp", "core", "oblique"],
  };

  const detected = [];
  for (const [muscle, keywords] of Object.entries(map)) {
    if (keywords.some((kw) => name.includes(kw))) {
      detected.push(muscle);
    }
  }
  return detected.length > 0 ? detected : ["other"];
};

const findPersonalRecords = (workouts) => {
  const prMap = {};
  for (const workout of workouts) {
    for (const exercise of workout.exercises || []) {
      const exName = (exercise.name || "").toLowerCase().trim();
      if (!exName) continue;
      for (const set of exercise.sets || []) {
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        if (weight <= 0) continue;
        const key = exName;
        if (!prMap[key] || weight > prMap[key].weight) {
          prMap[key] = {
            exercise: exercise.name,
            weight,
            reps,
            date: workout.date,
          };
        }
      }
    }
  }
  return Object.values(prMap)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
};

const computeVolumePerSession = (workouts) => {
  return workouts.map((w) => ({
    date: new Date(w.date).toISOString().split("T")[0],
    volume: w.totalVolume || 0,
    name: w.name || "Workout",
    exerciseCount: (w.exercises || []).length,
  }));
};

const computeMuscleDistribution = (workouts) => {
  const counts = {};
  for (const workout of workouts) {
    for (const exercise of workout.exercises || []) {
      const muscles = detectMuscleGroups(exercise.name);
      for (const muscle of muscles) {
        counts[muscle] = (counts[muscle] || 0) + 1;
      }
    }
  }
  return counts;
};

const computeWeeklyFrequency = (workouts) => {
  const weeks = {};
  for (const w of workouts) {
    const d = new Date(w.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    weeks[key] = (weeks[key] || 0) + 1;
  }
  return weeks;
};

const buildFallbackAdvice = (ctx) => {
  const { userName, totalWorkouts, avgVolume, muscleDist, prs, weeklyAvg, recentWorkouts, goal } = ctx;

  const muscleKeys = Object.keys(muscleDist);
  const untrained = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"].filter(
    (m) => !muscleKeys.includes(m)
  );

  const insights = [];

  if (totalWorkouts === 0) {
    insights.push({
      id: "no_workouts",
      type: "warning",
      title: "No workouts logged yet",
      description: `${userName} hasn't logged any workouts. Start by logging your first training session to unlock detailed analysis.`,
      metric: "workouts",
      current: 0,
      target: 3,
      unit: "sessions",
      priority: "high",
      action: "Head to the Workouts page and log your first session — even a bodyweight workout counts!",
    });
  }

  if (weeklyAvg < 3 && totalWorkouts > 0) {
    insights.push({
      id: "frequency",
      type: "warning",
      title: "Training frequency is low",
      description: `${userName} is averaging ${weeklyAvg.toFixed(1)} workouts per week over the last 30 days. Most research suggests 3-5 sessions per week for optimal progress.`,
      metric: "frequency",
      current: Math.round(weeklyAvg * 10) / 10,
      target: 4,
      unit: "sessions/week",
      priority: weeklyAvg < 2 ? "high" : "medium",
      action: "Try to add one more training day. Even a 30-minute session can make a big difference.",
    });
  } else if (weeklyAvg >= 3) {
    insights.push({
      id: "frequency_good",
      type: "success",
      title: "Solid training frequency",
      description: `${userName} is hitting ${weeklyAvg.toFixed(1)} sessions/week — that's a great rhythm for ${goal}.`,
      metric: "frequency",
      current: Math.round(weeklyAvg * 10) / 10,
      target: 4,
      unit: "sessions/week",
      priority: "low",
      action: "Maintain this consistency and focus on progressive overload.",
    });
  }

  if (untrained.length > 0 && totalWorkouts > 2) {
    insights.push({
      id: "muscle_gap",
      type: "tip",
      title: `Undertrained: ${untrained.slice(0, 3).join(", ")}`,
      description: `No exercises targeting ${untrained.join(", ")} were found in the last 30 days. This could create muscle imbalances.`,
      metric: "coverage",
      current: muscleKeys.length,
      target: 7,
      unit: "muscle groups",
      priority: untrained.includes("legs") || untrained.includes("back") ? "high" : "medium",
      action: `Add ${untrained[0]} exercises to your next session. A balanced physique reduces injury risk.`,
    });
  }

  if (prs.length > 0) {
    insights.push({
      id: "prs",
      type: "success",
      title: `${prs.length} Personal Records tracked`,
      description: `Top lift: ${prs[0].exercise} at ${prs[0].weight} lbs for ${prs[0].reps} reps.`,
      metric: "strength",
      current: prs[0].weight,
      target: 0,
      unit: "lbs",
      priority: "low",
      action: "Keep pushing progressive overload — try adding 2.5-5 lbs next session.",
    });
  }

  const weeklyFreq = computeWeeklyFrequency(recentWorkouts);
  const freqValues = Object.values(weeklyFreq);
  const avgFreq = freqValues.length > 0 ? freqValues.reduce((a, b) => a + b, 0) / freqValues.length : 0;

  let trend = "stable";
  if (freqValues.length >= 2) {
    const recent = freqValues[freqValues.length - 1] || 0;
    const prior = freqValues[freqValues.length - 2] || 0;
    if (recent > prior) trend = "improving";
    else if (recent < prior) trend = "declining";
  }

  const consistency = totalWorkouts > 0 ? Math.min(100, Math.round((weeklyAvg / 4) * 100)) : 0;

  return {
    overallScore: Math.max(10, Math.min(95, Math.round(consistency * 0.4 + (muscleKeys.length / 7) * 30 + Math.min(prs.length, 5) * 6))),
    scoreLabel: consistency >= 70 ? "Strong Momentum" : consistency >= 40 ? "Building Up" : "Getting Started",
    summary:
      totalWorkouts === 0
        ? `${userName} hasn't logged any workouts yet. Start tracking to unlock personalized AI coaching.`
        : `${userName} has completed ${totalWorkouts} workouts in the last 30 days, averaging ${avgVolume.toLocaleString()} lbs volume per session with ${muscleKeys.length} muscle groups covered.`,
    insights,
    muscleDistribution: muscleDist,
    weeklyPattern: {
      consistency,
      avgFrequency: Math.round(avgFreq * 10) / 10,
      trend,
      totalSessions: totalWorkouts,
    },
    personalRecords: prs,
    topRecommendations: [
      {
        rank: 1,
        title: untrained.length > 0 ? `Train ${untrained[0]} this week` : "Focus on progressive overload",
        detail:
          untrained.length > 0
            ? `Your ${untrained[0]} muscles haven't been targeted recently. Add 2-3 exercises for balanced development.`
            : "Try adding 2.5-5 lbs to your main compound lifts this week.",
        impact: "high",
        timeframe: "This week",
      },
      {
        rank: 2,
        title: "Track rest times",
        detail: "Consistent rest periods (60-90s for hypertrophy, 2-3min for strength) improve workout quality.",
        impact: "medium",
        timeframe: "This week",
      },
      {
        rank: 3,
        title: "Log every session",
        detail: "Consistent logging lets the AI detect plateaus, suggest deloads, and track your PRs automatically.",
        impact: "medium",
        timeframe: "Ongoing",
      },
    ],
    volumeHistory: computeVolumePerSession(recentWorkouts),
  };
};

// ── Main Route ───────────────────────────────────────────────────────────────

router.get("/:userId", async (req, res) => {
  try {
    if (req.userId && req.userId !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allWorkouts = user.workouts || [];
    const recentWorkouts = getRecentWorkouts(allWorkouts, 30);
    const muscleDist = computeMuscleDistribution(recentWorkouts);
    const prs = findPersonalRecords(allWorkouts);
    const volumeData = computeVolumePerSession(recentWorkouts);
    const totalWorkouts = recentWorkouts.length;
    const avgVolume = totalWorkouts > 0 ? Math.round(volumeData.reduce((s, v) => s + v.volume, 0) / totalWorkouts) : 0;

    const weeklyFreq = computeWeeklyFrequency(recentWorkouts);
    const freqValues = Object.values(weeklyFreq);
    const weeklyAvg = freqValues.length > 0 ? freqValues.reduce((a, b) => a + b, 0) / freqValues.length : 0;

    const ctx = {
      userName: user.name || "User",
      goal: user.fitnessGoal || user.goal || "General Fitness",
      totalWorkouts,
      avgVolume,
      muscleDist,
      prs,
      weeklyAvg,
      recentWorkouts,
    };

    const fallback = buildFallbackAdvice(ctx);
    let advice = fallback;

    if (totalWorkouts > 0) {
      try {
        const muscleDistStr = Object.entries(muscleDist)
          .map(([m, c]) => `${m}: ${c} exercises`)
          .join(", ");

        const prStr = prs
          .slice(0, 5)
          .map((p) => `${p.exercise}: ${p.weight}lbs x ${p.reps}reps`)
          .join(", ");

        const recentNames = recentWorkouts
          .slice(-10)
          .map((w) => `${w.name} (${new Date(w.date).toLocaleDateString()}, vol: ${w.totalVolume}lbs)`)
          .join("; ");

        const prompt = `You are an elite strength & conditioning coach.
Analyze this user's real workout data and provide specific, actionable fitness advice.

USER PROFILE:
- Name: ${ctx.userName}
- Goal: ${ctx.goal}
- Age: ${user.age || "not set"}, Gender: ${user.gender || "not set"}
- Weight: ${user.weight || "not set"}kg

WORKOUT STATS (Last 30 days):
- Total sessions: ${totalWorkouts}
- Avg sessions/week: ${weeklyAvg.toFixed(1)}
- Avg volume/session: ${avgVolume.toLocaleString()} lbs
- Muscle distribution: ${muscleDistStr || "none"}
- Personal records: ${prStr || "none yet"}
- Recent workouts: ${recentNames || "none"}

Generate a comprehensive fitness analysis. Respond ONLY with raw JSON, no markdown:
{
  "overallScore": 75,
  "scoreLabel": "Good Momentum",
  "summary": "2 sentence personalized summary using their name and real workout numbers",
  "insights": [
    {
      "id": "1",
      "type": "warning|success|tip|info",
      "title": "specific title about their training",
      "description": "specific description referencing their actual workout data",
      "metric": "frequency|volume|balance|strength|recovery",
      "current": 0,
      "target": 0,
      "unit": "sessions|lbs|groups|reps",
      "priority": "high|medium|low",
      "action": "specific actionable training tip"
    }
  ],
  "weeklyPattern": {
    "consistency": ${Math.round((weeklyAvg / 4) * 100)},
    "avgFrequency": ${weeklyAvg.toFixed(1)},
    "trend": "improving|declining|stable",
    "totalSessions": ${totalWorkouts}
  },
  "topRecommendations": [
    {
      "rank": 1,
      "title": "Most important training action",
      "detail": "specific detail about exercises, sets, reps",
      "impact": "high|medium|low",
      "timeframe": "Today|This week|This month"
    }
  ]
}

Be specific to their actual numbers and exercises. Use their name. Generate 4-6 insights. Reference real exercises they've done.`;

        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 2000,
          temperature: 0.4,
          messages: [
            { role: "system", content: "Elite strength coach. Raw JSON only. No markdown." },
            { role: "user", content: prompt },
          ],
        });

        const rawContent = completion.choices[0]?.message?.content || "";
        const raw = rawContent.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(raw);
        advice = { ...fallback, ...parsed };
      } catch (aiError) {
        console.error("Fitness advice AI fallback:", aiError.message || aiError);
      }
    }

    // Always attach real computed data
    advice.realData = {
      totalWorkouts,
      avgVolume,
      weeklyAvg: Math.round(weeklyAvg * 10) / 10,
      muscleDistribution: muscleDist,
      personalRecords: prs,
      volumeHistory: volumeData,
      userName: user.name || "User",
      goal: user.fitnessGoal || user.goal || "General Fitness",
    };

    res.json(advice);
  } catch (err) {
    console.error("Fitness advice error:", err);
    res.status(500).json({ message: "Failed to generate fitness advice" });
  }
});

module.exports = router;
