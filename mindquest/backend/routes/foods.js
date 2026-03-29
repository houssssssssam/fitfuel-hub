const express = require("express");
const Food = require("../models/Food");

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.json([]);

    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const exactRegex = new RegExp(`^${safe}$`, "i");
    const startsWithRegex = new RegExp(`^${safe}`, "i");
    const wordRegex = new RegExp(`\\b${safe}\\b`, "i");
    const containsRegex = new RegExp(safe, "i");

    const allMatches = await Food.find({
      $or: [{ name: containsRegex }, { tags: containsRegex }],
    })
      .limit(200)
      .lean();

    const simpleKeywords = [
      "raw",
      "whole",
      "plain",
      "fresh",
      "natural",
      "pure",
      "cooked",
      "boiled",
      "grilled",
      "baked",
      "steamed",
    ];
    const complexKeywords = [
      "sandwich",
      "with",
      "made with",
      "omelet",
      "scrambled",
      "casserole",
      "salad",
      "soup",
      "stew",
      "stuffed",
      "glazed",
      "breaded",
      "fried",
      "mixed",
      "combo",
      "meal",
      "dish",
      "recipe",
      "prepared",
      "fast food",
      "restaurant",
    ];

    const query = q.toLowerCase();
    const queryWords = query.split(/[\s,]+/).filter(Boolean);

    const scored = allMatches.map((food) => {
      const name = food.name.toLowerCase();
      let score = 0;

      if (exactRegex.test(food.name)) score += 1000;
      if (startsWithRegex.test(food.name)) score += 500;
      if (wordRegex.test(food.name)) score += 200;

      const lengthPenalty = Math.min(food.name.length * 2, 100);
      score -= lengthPenalty;

      if (simpleKeywords.some((keyword) => name.includes(keyword))) score += 100;
      if (complexKeywords.some((keyword) => name.includes(keyword))) score -= 150;

      const nameWords = name.split(/[\s,]+/).filter(Boolean);
      const allQueryWordsPresent = queryWords.every((queryWord) =>
        nameWords.some((nameWord) => nameWord.includes(queryWord))
      );

      if (allQueryWordsPresent && nameWords.length <= queryWords.length + 3) {
        score += 300;
      }

      const extraWords = nameWords.length - queryWords.length;
      if (extraWords > 4) score -= extraWords * 15;

      if (
        food.tags?.some((tag) => tag.toLowerCase().includes(query))
      ) {
        score += 50;
      }

      return { ...food, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    const seen = new Set();
    const deduplicated = scored.filter((food) => {
      const normalizedName = food.name.toLowerCase().trim();
      if (seen.has(normalizedName)) return false;
      seen.add(normalizedName);
      return true;
    });

    const results = deduplicated.slice(0, 20).map(({ _score, ...food }) => food);

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Food search failed" });
  }
});

module.exports = router;
