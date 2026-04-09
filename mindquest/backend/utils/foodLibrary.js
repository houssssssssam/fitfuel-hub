const MAX_RECENT_FOODS = 20;
const MAX_FAVORITE_FOODS = 50;

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeServingSize = (servingSize) => {
  if (!servingSize || typeof servingSize !== "object") return undefined;

  const amount = toFiniteNumber(servingSize.amount, NaN);
  const unit = typeof servingSize.unit === "string" ? servingSize.unit.trim() : "";

  if (!Number.isFinite(amount) || amount <= 0 || !unit) {
    return undefined;
  }

  return { amount, unit };
};

const buildSavedFood = (food) => {
  if (!food || typeof food !== "object") return null;

  const name = typeof food.name === "string" ? food.name.trim() : "";
  if (!name) return null;

  const savedFood = {
    name,
    unit: typeof food.unit === "string" && food.unit.trim() ? food.unit.trim() : "g",
    calories: Math.max(0, toFiniteNumber(food.calories, 0)),
    protein: Math.max(0, toFiniteNumber(food.protein, 0)),
    carbs: Math.max(0, toFiniteNumber(food.carbs, 0)),
    fats: Math.max(0, toFiniteNumber(food.fats, 0)),
    addedAt: food.addedAt instanceof Date ? food.addedAt : new Date(),
  };

  const servingSize = normalizeServingSize(food.servingSize);
  if (servingSize) {
    savedFood.servingSize = servingSize;
  }

  if (typeof food.externalId === "string" && food.externalId.trim()) {
    savedFood.externalId = food.externalId.trim();
  }

  return savedFood;
};

const ensureFoodLibrary = (user) => {
  if (!Array.isArray(user.recentFoods)) {
    user.recentFoods = [];
  }

  if (!Array.isArray(user.favoriteFoods)) {
    user.favoriteFoods = [];
  }
};

const namesMatch = (entry, foodName) =>
  typeof entry?.name === "string" && entry.name.trim().toLowerCase() === foodName.trim().toLowerCase();

const pushRecentFood = (user, food) => {
  ensureFoodLibrary(user);

  const savedFood = buildSavedFood(food);
  if (!savedFood) {
    return user.recentFoods;
  }

  user.recentFoods = user.recentFoods.filter((entry) => !namesMatch(entry, savedFood.name));
  user.recentFoods.unshift(savedFood);
  user.recentFoods = user.recentFoods.slice(0, MAX_RECENT_FOODS);

  return user.recentFoods;
};

const toggleFavoriteFood = (user, food) => {
  ensureFoodLibrary(user);

  const savedFood = buildSavedFood(food);
  if (!savedFood) {
    return { favoriteFoods: user.favoriteFoods, isFavorite: false };
  }

  const existingIndex = user.favoriteFoods.findIndex((entry) => namesMatch(entry, savedFood.name));

  if (existingIndex > -1) {
    user.favoriteFoods.splice(existingIndex, 1);
    return { favoriteFoods: user.favoriteFoods, isFavorite: false };
  }

  if (user.favoriteFoods.length >= MAX_FAVORITE_FOODS) {
    user.favoriteFoods.pop();
  }

  user.favoriteFoods.unshift(savedFood);

  return { favoriteFoods: user.favoriteFoods, isFavorite: true };
};

module.exports = {
  buildSavedFood,
  ensureFoodLibrary,
  pushRecentFood,
  toggleFavoriteFood,
};
