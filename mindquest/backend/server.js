const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const foodsRoutes = require("./routes/foods");
const mealsRoutes = require("./routes/meals");
const app = express();
const path = require("path");

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // allow external images (Pexels, Unsplash)
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow frontend to load uploads
    contentSecurityPolicy: false, // CSP handled by the frontend / hosting layer
  })
);

// ── CORS — restrict to allowed origins ────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:8080",
      "http://localhost:5173",
      "http://127.0.0.1:8080",
      "https://localhost:8080",   // HTTPS for local dev (mkcert)
      "https://localhost:5173",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow listed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) for dev/mobile testing
      if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ── Body size limit ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ── Static uploads ────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

// Apply strict rate limiting to auth endpoints
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/send-verification", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/auth/change-password", authLimiter);
app.use("/api/auth/refresh", authLimiter);

// General API rate limit
app.use("/api/", apiLimiter);

// ── Auth middleware ───────────────────────────────────────────────────────────
const { protect } = require("./middleware/auth");
const { authorizeOwner } = require("./middleware/authorize");

// ── Routes ────────────────────────────────────────────────────────────────────
// Public auth routes
app.use("/api/auth", authRoutes);

// Protected + authorized routes (user can only access own data)
app.use("/api/profile", protect, authorizeOwner, require("./routes/profile"));
app.use("/api/foods", protect, foodsRoutes);
app.use("/api/meals", protect, authorizeOwner, mealsRoutes);
app.use("/api/tip", protect, require("./routes/tip"));
app.use("/api/achievements", protect, authorizeOwner, require("./routes/achievements"));
app.use("/api/chat", protect, require("./routes/chat"));
app.use("/api/nutrition-advice", protect, authorizeOwner, require("./routes/nutrition-advice"));
app.use("/api/photos", protect, authorizeOwner, require("./routes/photos"));
app.use("/api/exercises", protect, require("./routes/exercises"));
app.use("/api/fitness-advice", protect, authorizeOwner, require("./routes/fitness-advice"));
app.use("/api/workout-generator", protect, authorizeOwner, require("./routes/workout-generator"));
app.use("/api/meal-plans", protect, require("./routes/mealPlans"));

// ── MongoDB ───────────────────────────────────────────────────────────────────
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
