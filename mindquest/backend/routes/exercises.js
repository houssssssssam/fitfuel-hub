const express = require("express");
const Groq = require("groq-sdk");
const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/instructions", async (req, res) => {
  try {
    const { exerciseName, targetMuscle, equipment } = req.body;
    
    if (!exerciseName || !targetMuscle) {
      return res.status(400).json({ message: "Missing exercise details." });
    }

    const prompt = `You are a certified personal trainer.
Provide instructions for the exercise: "${exerciseName}"
Target muscle: ${targetMuscle}
Equipment: ${equipment}

Respond ONLY with raw JSON:
{
  "instructions": ["Step 1...", "Step 2...", "Step 3...", "Step 4...", "Step 5..."],
  "sets": 3,
  "reps": "8-12",
  "rest": "60-90 seconds",
  "difficulty": "Intermediate",
  "tips": ["Keep your back straight", "Control the descent"],
  "caloriesPerSet": 15
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (error) {
    console.error("Groq Instructions Error:", error);
    res.status(500).json({ message: "Failed to generate instructions." });
  }
});

module.exports = router;
