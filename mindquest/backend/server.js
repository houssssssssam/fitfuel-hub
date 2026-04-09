const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const foodsRoutes = require("./routes/foods");
const mealsRoutes = require("./routes/meals");

const app = express();

// ── TRUST PROXY (required for Render — real IP for rate limiting) ─────────────
app.set("trust proxy", 1);

// ── SECURITY HEADERS (Helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:8080",
      "http://localhost:5173",
      "http://127.0.0.1:8080",
      "https://localhost:8080",
      "https://localhost:5173",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow local network IPs for dev/mobile testing
      if (
        /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
          origin
        )
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── BODY PARSING ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// ── DATA SANITIZATION ─────────────────────────────────────────────────────────
// Prevent HTTP parameter pollution (e.g. ?sort=asc&sort=desc)
app.use(hpp());

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Auth endpoints — strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failures
  message: { message: "Too many attempts. Please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/send-verification", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/auth/change-password", authLimiter);
app.use("/api/auth/refresh", authLimiter);

// AI endpoints — expensive, tighter cap per minute
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI rate limit reached. Please wait a moment." },
});
app.use("/api/chat", aiLimiter);
app.use("/api/tip", aiLimiter);
app.use("/api/workout-generator", aiLimiter);
app.use("/api/nutrition-advice", aiLimiter);
app.use("/api/fitness-advice", aiLimiter);

// Global API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});
app.use("/api/", apiLimiter);

// ── STATIC UPLOADS ────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
const { protect } = require("./middleware/auth");
const { authorizeOwner } = require("./middleware/authorize");

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
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

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend reached successfully" });
});

// ── MONGODB ───────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindquest", {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1); // crash fast — supervisor/Render will restart
  });

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
// Must be last, after all routes
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // CORS violation
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({ error: "CORS policy violation" });
  }
  // Multer file size
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
  }
  // Multer file type
  if (err.message?.includes("Only images allowed") || err.message?.includes("Invalid file")) {
    return res.status(400).json({ error: err.message });
  }
  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }
  // Generic — never leak stack traces in production
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" ? "Something went wrong" : err.message;
  console.error("Unhandled error:", err);
  res.status(statusCode).json({ error: message });
});

// ── START ─────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
