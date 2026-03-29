const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const foodsRoutes = require("./routes/foods");
const mealsRoutes = require("./routes/meals");
const app = express();
const path = require("path");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const { protect } = require("./middleware/auth");

// ✅ ONE auth route
app.use("/api/auth", authRoutes);

// Protected Routes Array
app.use("/api/profile", protect, require("./routes/profile"));
app.use("/api/foods", protect, foodsRoutes);
app.use("/api/meals", protect, mealsRoutes);
app.use("/api/tip", protect, require("./routes/tip"));
app.use("/api/achievements", protect, require("./routes/achievements"));
app.use("/api/chat", protect, require("./routes/chat"));
app.use("/api/nutrition-advice", protect, require("./routes/nutrition-advice"));
app.use("/api/photos", protect, require("./routes/photos"));
app.use("/api/exercises", protect, require("./routes/exercises"));
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindquest")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend reached successfully" });
});

const port = Number(process.env.PORT) || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
