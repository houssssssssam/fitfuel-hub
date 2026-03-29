const mongoose = require("mongoose");

const FoodSchema = new mongoose.Schema({
  externalId: { type: String, index: true },
  name: { type: String, required: true },
  brand: String,
  servingSize: {
    amount: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fats: { type: Number, required: true },
  tags: [String],
});

// Add this line
FoodSchema.index({ name: "text", tags: "text" });

module.exports = mongoose.model("Food", FoodSchema);