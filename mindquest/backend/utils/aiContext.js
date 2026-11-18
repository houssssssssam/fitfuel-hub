/**
 * Builds the "user preferences" block appended to AI prompts, so every AI
 * feature respects the user's diet, allergies and language.
 */

const DIET_LABELS = {
  vegetarian: "vegetarian (no meat, no fish)",
  vegan: "vegan (no animal products at all: no meat, fish, dairy, eggs or honey)",
  pescatarian: "pescatarian (fish and seafood are fine, no other meat)",
  halal: "halal (no pork or pork products, no alcohol, halal meat only)",
  kosher: "kosher (no pork, no shellfish, never mix meat and dairy)",
  keto: "keto (very low carb, under about 30 g carbs per day)",
  "gluten-free": "gluten-free (no wheat, barley or rye)",
};

const LANGUAGE_NAMES = { en: "English", fr: "French" };

const cleanList = (values) =>
  (Array.isArray(values) ? values : [])
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .slice(0, 15);

const getAiLanguage = (user) => {
  const prefs = user?.preferences || {};
  const choice = prefs.aiLanguage && prefs.aiLanguage !== "auto" ? prefs.aiLanguage : prefs.appLanguage;
  return LANGUAGE_NAMES[choice] ? choice : "en";
};

const buildAiPreferenceBlock = (user, { json = false } = {}) => {
  const diet = user?.dietaryPreferences || {};
  const lines = [];

  const dietLabel = DIET_LABELS[diet.diet];
  if (dietLabel) {
    lines.push(`- Diet: ${dietLabel}. Every food and meal you suggest must follow it.`);
  }

  const allergies = cleanList(diet.allergies);
  if (allergies.length > 0) {
    lines.push(`- Allergies / intolerances: ${allergies.join(", ")}. NEVER include these or any ingredient that contains them, and warn the user if something they mention contains them.`);
  }

  const dislikes = typeof diet.dislikes === "string" ? diet.dislikes.trim().slice(0, 200) : "";
  if (dislikes) {
    lines.push(`- Foods they dislike: ${dislikes}. Avoid these when suggesting meals.`);
  }

  if (user?.preferences?.units === "imperial") {
    lines.push("- Units: the user uses imperial units. Give body weight and lifting weights in lbs (stored values are in kg, convert them: 1 kg = 2.2 lbs) and height in feet/inches. Food quantities can stay in grams.");
  }

  const language = getAiLanguage(user);
  if (language !== "en") {
    lines.push(
      `- Language: write all human-readable text in ${LANGUAGE_NAMES[language]}${
        json ? ". JSON keys and enum values stay exactly as specified (in English)" : ""
      }.`,
    );
  }

  if (lines.length === 0) return "";
  return `\n\n## USER PREFERENCES (always follow these)\n${lines.join("\n")}`;
};

const withAiPreferences = (prompt, user, options) => `${prompt}${buildAiPreferenceBlock(user, options)}`;

module.exports = { DIET_LABELS, buildAiPreferenceBlock, withAiPreferences, getAiLanguage };
