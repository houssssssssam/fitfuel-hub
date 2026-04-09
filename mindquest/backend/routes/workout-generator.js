const express = require("express");
const Groq = require("groq-sdk");
const User = require("../models/User");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const detectRecentMuscles = (workouts, days = 7) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = (workouts || []).filter((w) => new Date(w.date) >= cutoff);

  const name2muscle = (name) => {
    const n = (name || "").toLowerCase();
    if (/bench|press|fly|flye|pec|push-up|pushup|chest/.test(n)) return "chest";
    if (/row|pull-up|pullup|lat|deadlift|pull down|pulldown|back/.test(n)) return "back";
    if (/shoulder|ohp|overhead|lateral raise|military|delt|face pull/.test(n)) return "shoulders";
    if (/curl|bicep|hammer/.test(n)) return "biceps";
    if (/tricep|pushdown|skull|extension/.test(n)) return "triceps";
    if (/squat|leg|lunge|calf|hamstring|quad|rdl|hip thrust|glute/.test(n)) return "legs";
    if (/ab|crunch|plank|sit-up|situp|core|oblique/.test(n)) return "core";
    return "other";
  };

  const muscles = new Set();
  for (const w of recent) {
    for (const ex of w.exercises || []) {
      muscles.add(name2muscle(ex.name));
    }
  }
  return Array.from(muscles);
};

router.post("/:userId/generate", async (req, res) => {
  try {
    if (req.userId && req.userId !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { focusMuscles, workoutType } = req.body;

    const recentMuscles = detectRecentMuscles(user.workouts, 3);
    const allMuscles = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];
    const undertrained = allMuscles.filter((m) => !recentMuscles.includes(m));

    const targetMuscles = focusMuscles && focusMuscles.length > 0
      ? focusMuscles
      : undertrained.length > 0
        ? undertrained.slice(0, 3)
        : ["chest", "back", "shoulders"];

    const lastWorkouts = (user.workouts || [])
      .slice(-5)
      .map((w) => `${w.name}: ${(w.exercises || []).map((e) => e.name).join(", ")}`)
      .join("; ");

    const prompt = `You are an expert personal trainer. Generate a single workout session.

USER PROFILE:
- Name: ${user.name || "User"}
- Goal: ${user.fitnessGoal || user.goal || "General Fitness"}
- Experience: ${user.activityLevel || "Intermediate"}
- Weight: ${user.weight || "not set"}kg
- Workout type requested: ${workoutType || "hypertrophy"}

CONTEXT:
- Recently trained muscles (last 3 days): ${recentMuscles.join(", ") || "none"}
- Suggested focus for this session: ${targetMuscles.join(", ")}
- Recent workouts: ${lastWorkouts || "none logged"}

Generate a complete workout. Respond ONLY with raw JSON, no markdown:
{
  "name": "Creative workout name (e.g., 'Upper Power Day', 'Push Hypertrophy')",
  "focusMuscles": ["chest", "shoulders", "triceps"],
  "estimatedDuration": 55,
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 4,
      "reps": "8-10",
      "weight": "suggested weight or 'bodyweight'",
      "restSeconds": 90,
      "notes": "form tip or coaching cue",
      "targetMuscle": "chest"
    }
  ],
  "warmup": "Brief warmup suggestion",
  "cooldown": "Brief cooldown suggestion"
}

Rules:
- Include 5-7 exercises
- Mix compound and isolation movements
- Start with compound lifts
- Suggest realistic weights based on their profile
- Include rest times (60-90s hypertrophy, 120-180s strength)
- Be specific with rep ranges based on their goal`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      temperature: 0.5,
      messages: [
        { role: "system", content: "Expert personal trainer. Raw JSON only. No markdown." },
        { role: "user", content: prompt },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content || "";
    const raw = rawContent.replace(/```json|```/g, "").trim();
    const workout = JSON.parse(raw);

    res.json({
      ...workout,
      generatedAt: new Date().toISOString(),
      recentMuscles,
      suggestedFocus: targetMuscles,
    });
  } catch (err) {
    console.error("AI workout generation error:", err);
    res.status(500).json({ message: "Failed to generate workout" });
  }
});

module.exports = router;
