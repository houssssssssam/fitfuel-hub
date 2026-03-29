const express = require("express");
const Groq = require("groq-sdk");
const User = require("../models/User");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const intake = user.dailyIntake;
    const targets = user.nutritionTargets || {
      calories: 2500, protein: 180, carbs: 300, fats: 80,
    };

    const prompt = `You are a fitness coach. Based on these stats: calories eaten: ${intake.calories} of ${targets.calories} target, protein: ${intake.protein}g of ${targets.protein}g, carbs: ${intake.carbs}g of ${targets.carbs}g, fats: ${intake.fats}g of ${targets.fats}g. Give ONE short motivational tip (max 2 sentences) personalized to these numbers. Be specific, not generic.

Respond ONLY with a raw JSON object, no markdown, no backticks, no explanation:
{
  "tip": "Your custom tip here."
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are a fitness coach. Always respond with valid raw JSON only. No markdown, no backticks.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");
    
    const result = JSON.parse(jsonMatch[0]);
    res.json({ tip: result.tip });
  } catch (err) {
    console.error("AI Tip error:", err);
    res.status(500).json({ tip: "Keep pushing towards your goals! Every small step counts." }); // Fallback tip natively supplied if fails
  }
});

module.exports = router;
