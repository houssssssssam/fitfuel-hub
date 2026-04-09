require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const axios = require("axios");
const Food = require("./models/Food");

const API_KEY = process.env.FOODDATA_API_KEY;

async function fetchAndStoreFoods(searchTerm, dataTypes) {
  console.log(`Fetching: "${searchTerm}" [${dataTypes.join(", ")}]`);
  let saved = 0;
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 5) { // max 5 pages per term = 1000 items
    try {
      const res = await axios.post(
        "https://api.nal.usda.gov/fdc/v1/foods/search",
        {
          query: searchTerm,
          pageSize: 200,
          pageNumber: page,
          dataType: dataTypes,
        },
        { params: { api_key: API_KEY } }
      );

      const data = res.data;
      totalPages = Math.ceil(data.totalHits / 200);
      const foods = data.foods || [];

      for (const f of foods) {
        const nutrients = {};
        for (const n of f.foodNutrients || []) {
          const name = (n.nutrientName || "").toLowerCase();
          const val = n.value ?? 0;
          if (name.includes("energy") && (n.unitName || "").toUpperCase() === "KCAL") nutrients.calories = val;
          if (name === "protein") nutrients.protein = val;
          if (name.includes("carbohydrate, by difference")) nutrients.carbs = val;
          if (name === "total lipid (fat)") nutrients.fats = val;
        }

        if (!nutrients.calories) continue;

        try {
          await Food.create({
            externalId: String(f.fdcId),
            name: f.description,
            brand: f.brandOwner || f.brandName || undefined,
            servingSize: { amount: 100, unit: "g" },
            calories: nutrients.calories ?? 0,
            protein: nutrients.protein ?? 0,
            carbs: nutrients.carbs ?? 0,
            fats: nutrients.fats ?? 0,
            tags: [searchTerm, ...(f.foodCategory ? [f.foodCategory.toLowerCase()] : [])],
          });
          saved++;
        } catch (e) {
          if (e.code !== 11000) console.error("Insert error:", e.message);
        }
      }

      console.log(`  Page ${page}/${Math.min(totalPages, 5)} — saved ${saved} so far`);
      page++;

      // Avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`  Error on page ${page}:`, err.message);
      break;
    }
  }

  console.log(`  ✅ Total saved for "${searchTerm}": ${saved}`);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Mongo connected");

  const srTerms = [
    // Meats
    "chicken", "beef", "pork", "lamb", "turkey", "veal", "duck", "bison",
    "bacon", "sausage", "ham", "salami", "pepperoni",
    // Seafood
    "salmon", "tuna", "shrimp", "cod", "tilapia", "crab", "lobster",
    "sardines", "trout", "halibut", "clams", "oysters", "mussels",
    // Eggs & Dairy
    "egg", "milk", "cheese", "yogurt", "butter", "cream", "whey",
    "cottage cheese", "mozzarella", "cheddar", "parmesan", "brie",
    // Grains & Carbs
    "rice", "pasta", "bread", "oats", "quinoa", "barley", "corn",
    "tortilla", "bagel", "croissant", "noodles", "couscous", "rye",
    "cereal", "granola", "pancake", "waffle", "toast", "whole grain toast",
    "whole wheat bread", "white bread", "whole grain bread",
    "sourdough bread", "rye bread",
    "tortilla wrap", "pita bread", "english muffin", "brown rice",
    "white rice", "jasmine rice", "basmati rice", "corn tortilla", "bastilla", "tajine", 
    // Fruits
    "apple", "banana", "orange", "mango", "pineapple", "strawberry",
    "blueberry", "grape", "watermelon", "avocado", "peach", "pear",
    "cherry", "lemon", "lime", "kiwi", "papaya", "pomegranate",
    // Vegetables
    "broccoli", "spinach", "potato", "tomato", "cucumber", "onion",
    "garlic", "mushroom", "zucchini", "kale", "carrot", "lettuce",
    "cabbage", "cauliflower", "celery", "asparagus", "beet", "eggplant",
    "bell pepper", "sweet potato", "peas", "corn", "artichoke",
    "regular potato",
    // Legumes
    "lentils", "chickpeas", "black beans", "kidney beans", "tofu",
    "tempeh", "edamame", "soybeans", "hummus",
    // Nuts & Seeds
    "almonds", "walnuts", "cashews", "peanuts", "peanut butter",
    "sunflower seeds", "chia seeds", "flaxseeds", "pistachios", "pecans",
    // Oils & Condiments
    "olive oil", "coconut oil", "mayonnaise", "ketchup", "mustard",
    "soy sauce", "hot sauce", "vinegar", "salsa",
    // Sweets & Snacks
    "chocolate", "ice cream", "cookies", "cake", "candy", "chips",
    "popcorn", "granola bar", "protein bar", "honey", "jam",
    // Fast food & Meals
    "pizza", "burger", "sandwich", "taco", "burrito", "sushi",
    "soup", "salad", "steak", "fried rice", "curry",
    // Drinks
    "orange juice", "apple juice", "coffee", "tea", "smoothie",
  ];

  const brandedTerms = [
    "coca cola", "pepsi", "mcdonalds", "subway", "starbucks",
    "nutella", "oreo", "lay's chips", "doritos", "pringles",
    "kellogg", "quaker oats", "heinz", "campbell soup",
    "nature valley", "cliff bar", "quest bar", "kind bar",
    "greek yogurt chobani", "activia", "ensure", "premier protein",
    "red bull", "monster energy", "gatorade", "powerade",
  ];

  console.log("\n🥦 Phase 1: SR Legacy + Survey foods (most accurate macros)");
  for (const term of srTerms) {
    await fetchAndStoreFoods(term, ["SR Legacy", "Survey (FNDDS)"]);
  }

  console.log("\n🏪 Phase 2: Branded foods (real products)");
  for (const term of brandedTerms) {
    await fetchAndStoreFoods(term, ["Branded"]);
  }

  const total = await Food.countDocuments();
  console.log(`\n🔥 DONE! Total foods in DB: ${total}`);
  process.exit(0);
})();
