# FitFuel Hub — Complete Project Description

> **Copy and paste this entire document into your new Claude chat so it has full context about your project.**

---

## 1. Project Overview

**FitFuel Hub** is a full-stack fitness and nutrition tracking Progressive Web App (PWA). It helps users track their daily food intake, log workouts, monitor body weight, set nutrition goals, and receive AI-powered coaching — all within a sleek, modern dark-themed UI.

**Version:** 1.0.0  
**Repository:** `houssssssssam/fitfuel-hub`  
**Project Root:** `d:\VSCODE\project`

---

## 2. Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** (TypeScript) | Core UI framework |
| **Vite 7** | Build tool and dev server (port 8080) |
| **React Router DOM v6** | Client-side routing with protected routes |
| **TailwindCSS 3** | Utility-first CSS styling |
| **Shadcn/UI** (Radix primitives) | Pre-built accessible component library (Buttons, Dialogs, Select, Toast, Tabs, etc.) |
| **Recharts** | Charts and data visualization (RadialBarChart, AreaChart, BarChart) |
| **Lucide React** | Icon library |
| **React Hook Form + Zod** | Form handling and validation |
| **TanStack React Query** | Server state management |
| **i18next + react-i18next** | Internationalization (English & French supported; Arabic & Spanish placeholders) |
| **Sonner** | Toast notifications |
| **date-fns** | Date utilities |
| **DOMPurify** | HTML sanitization (used in ChatBot markdown rendering) |
| **Axios** | HTTP client |
| **vite-plugin-pwa** | PWA support with auto-update service worker |
| **embla-carousel-react** | Carousel component |
| **class-variance-authority + tailwind-merge + clsx** | Tailwind class utilities |
| **next-themes** | Theme management (light/dark/system) |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | REST API server (port 5000) |
| **MongoDB + Mongoose 9** | Database and ODM |
| **JWT (jsonwebtoken)** | Authentication tokens (7-day expiry) |
| **bcryptjs** | Password hashing (10 salt rounds) |
| **Groq SDK** (LLaMA 3.3 70B) | AI chatbot, workout generation, nutrition/fitness advice, daily tips |
| **@anthropic-ai/sdk** | Anthropic Claude integration (available but Groq is primary) |
| **Nodemailer** | Email sending (Gmail SMTP) for verification codes and password resets |
| **Multer** | File upload handling (progress photos) |
| **Helmet** | Security headers |
| **express-rate-limit** | Rate limiting on auth and API endpoints |
| **cors** | Cross-origin resource sharing (configurable allowed origins) |
| **dotenv** | Environment variable management |

### External APIs
| API | Purpose |
|---|---|
| **ExerciseDB (RapidAPI)** | Exercise library data (fetched client-side) |
| **Pexels API** | Exercise photos |
| **Groq Cloud** | LLM inference (LLaMA 3.3 70B Versatile) |

---

## 3. Project Structure

```
d:\VSCODE\project\
├── src/                          # Frontend source
│   ├── App.tsx                   # Root component with routing
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Global CSS with CSS variables
│   ├── App.css                   # Additional styles
│   ├── pages/                    # All page components (22 files)
│   ├── components/
│   │   ├── layout/               # AppLayout, Header, Sidebar
│   │   ├── dashboard/            # StatCard, MacroChart, ProgressBar, WeeklyChart
│   │   ├── ui/                   # Shadcn UI components
│   │   ├── auth/                 # Auth-related components
│   │   ├── ChatBot.tsx           # AI chatbot floating widget
│   │   ├── HumanBodySVG.tsx      # Interactive SVG body map
│   │   ├── ProtectedRoute.tsx    # Route guard
│   │   ├── PWAInstallPrompt.tsx  # PWA install banner
│   │   ├── KeyboardShortcutsModal.tsx
│   │   ├── WeeklyMealModal.tsx
│   │   └── Loader.tsx            # App loading spinner
│   ├── context/
│   │   └── NutritionContext.tsx   # Global nutrition state (foods, intake, targets, water, streak)
│   ├── hooks/
│   │   ├── use-mobile.tsx        # Mobile detection
│   │   ├── use-toast.ts          # Toast hook
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useTheme.ts           # Theme management
│   ├── i18n/
│   │   └── index.ts              # i18n config with EN and FR translations
│   ├── lib/                      # Utilities (api instance, cn helper)
│   └── utils/
│       └── exportData.ts         # Data export utilities
├── mindquest/backend/            # Backend source
│   ├── server.js                 # Express server entry point
│   ├── models/
│   │   ├── User.js               # User schema (comprehensive - see below)
│   │   └── Food.js               # Food library schema
│   ├── routes/
│   │   ├── auth.js               # Register, login, email verification, password reset/change
│   │   ├── profile.js            # User profile CRUD, intake management, history
│   │   ├── foods.js              # Food search (text index)
│   │   ├── meals.js              # Meal management
│   │   ├── chat.js               # AI chatbot with food logging capabilities
│   │   ├── tip.js                # AI daily tip generation
│   │   ├── workout-generator.js  # AI workout plan generation
│   │   ├── nutrition-advice.js   # AI nutrition advice
│   │   ├── fitness-advice.js     # AI fitness advice
│   │   ├── exercises.js          # Exercise endpoints
│   │   ├── achievements.js       # Achievement tracking
│   │   └── photos.js             # Progress photo uploads
│   ├── middleware/
│   │   ├── auth.js               # JWT verification (protect middleware)
│   │   └── authorize.js          # Owner authorization (authorizeOwner middleware)
│   ├── utils/
│   │   └── foodLibrary.js        # Food library helpers (pushRecentFood)
│   ├── data/                     # Static food data for import
│   └── uploads/                  # Uploaded progress photos
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite config with proxy and PWA
├── tailwind.config.ts            # Tailwind config with custom theme
├── index.html                    # HTML entry point
└── .env                          # Frontend env vars (VITE_PEXELS_API_KEY, VITE_RAPIDAPI_KEY)
```

---

## 4. Database Schema (MongoDB)

### User Model (`User.js`) — Main data store, everything is embedded on the user document:
```
User {
  name: String (required)
  email: String (required, unique)
  password: String (hashed with bcryptjs)
  age: Number
  weight: Number (kg)
  height: Number (cm)
  gender: String (default: "Male")
  activityLevel: String (default: "Sedentary")
  fitnessGoal: String (default: "Lose Weight")
  
  nutritionTargets: { calories, protein, carbs, fats }  // daily targets
  dailyIntake: { calories, protein, carbs, fats }       // today's consumed
  dailyWater: Number (ml)                                // today's water
  currentStreak: Number                                  // consecutive logging days
  lastLoggedDate: String                                 // ISO date string
  lastResetDate: String                                  // for daily reset logic
  
  nutritionHistory: [{                                   // historical data (up to 90 days)
    date, calories, protein, carbs, fats,
    foods: [{ name, quantity, unit, calories, protein, carbs, fats, mealType }],
    water
  }]
  
  weightLogs: [{ weight, date, note }]                   // body weight history
  achievements: [{ id, unlockedAt }]                     // unlocked achievements
  progressPhotos: [{ url, date, note, category: front|side|back }]
  
  foods: [{                                              // today's food log
    name, quantity, unit, calories, protein, carbs, fats, mealType, createdAt
  }]
  
  recentFoods: [SavedFoodSchema]                         // recently used foods (personal library)
  favoriteFoods: [SavedFoodSchema]                       // favorite foods (personal library)
  
  mealTemplates: [{                                      // saved meal templates (reusable meals)
    name: String (required)
    mealType: String (Breakfast|Lunch|Dinner|Snacks)
    foods: [{ name, quantity, unit, calories, protein, carbs, fats }]
    createdAt: Date
  }]
  
  selectedWorkoutPlan: String
  workouts: [{                                           // workout history
    name, date, duration, totalVolume,
    exercises: [{ name, sets: [{ reps, weight }] }]
  }]
  
  resetPasswordToken: String
  resetPasswordExpires: Date
  
  timestamps: true (createdAt, updatedAt)
}
```

### Food Model (`Food.js`) — Global food database:
```
Food {
  externalId: String (indexed)
  name: String (required, text-indexed)
  brand: String
  servingSize: { amount: Number, unit: String }
  calories, protein, carbs, fats: Number
  tags: [String] (text-indexed)
}
```

---

## 5. API Routes

### Public Routes
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register (requires email verification first) |
| POST | `/api/auth/login` | Login (returns JWT + user object) |
| POST | `/api/auth/send-verification` | Send 6-digit email verification code |
| POST | `/api/auth/verify-code` | Verify the email code |
| POST | `/api/auth/forgot-password` | Send password reset code |
| POST | `/api/auth/reset-password` | Reset password with code |

### Protected Routes (require JWT in Authorization header)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile/:id` | Get user profile |
| PUT | `/api/profile/:id` | Update profile |
| PUT | `/api/profile/:id/intake` | Add food to daily intake |
| DELETE | `/api/profile/:id/food/:foodId` | Remove food from daily intake |
| PUT | `/api/profile/:id/water` | Update water intake |
| GET | `/api/profile/:id/history?days=N` | Get nutrition history |
| GET | `/api/profile/:id/history/:date` | Get specific date's food data |
| PUT | `/api/profile/:id/history/:date/food` | Add food to a historical date |
| DELETE | `/api/profile/:id/history/:date/food/:foodId` | Remove food from historical date |
| GET | `/api/profile/:id/food-library` | Get recent & favorite foods |
| POST | `/api/profile/:id/favorite-food` | Toggle favorite food |
| GET | `/api/profile/:id/meal-templates` | Get all saved meal templates |
| POST | `/api/profile/:id/meal-templates` | Create a meal template |
| DELETE | `/api/profile/:id/meal-templates/:templateId` | Delete a meal template |
| POST | `/api/profile/:id/meal-templates/:templateId/log` | Log all foods from a template to today |
| DELETE | `/api/profile/:id` | Delete account |
| DELETE | `/api/profile/:id/history` | Clear all nutrition history |
| POST | `/api/auth/change-password` | Change password (authenticated) |
| GET | `/api/foods/search?q=term` | Search food database |
| POST | `/api/chat` | AI chatbot (can also log foods) |
| GET | `/api/tip/:userId` | Get AI-generated daily tip |
| POST | `/api/workout-generator/:userId/generate` | AI workout generation |
| GET/POST | `/api/nutrition-advice` | AI nutrition advice |
| GET/POST | `/api/fitness-advice` | AI fitness advice |
| GET/POST | `/api/meals` | Meal management |
| GET/POST | `/api/achievements` | Achievement tracking |
| GET/POST | `/api/photos` | Progress photo uploads |
| GET | `/api/exercises` | Exercise data |

---

## 6. All Pages & Features

### Authentication Flow
- **Login** (`/login`) — Email + password login with JWT, remembers user in localStorage
- **Register** (`/register`) — Multi-step: email verification via OTP → name/password → onboarding. Password requirements: 8+ chars, uppercase, lowercase, number
- **Forgot Password** (`/forgot-password`) — Email-based 6-digit recovery code
- **Onboarding** (`/onboarding`) — Post-registration setup (age, weight, height, gender, activity level, fitness goal)

### Main Dashboard (`/dashboard`)
- **Stat Cards** — Today's calories, protein intake, workouts this week, weekly volume (all with animated number counters using easeOutQuart)
- **Smart Alerts** — Context-aware warnings/celebrations (over calorie goal, protein goal reached, etc.)
- **AI Coach Tip Widget** — AI-generated personalized daily tip (via Groq/LLaMA)
- **Streak Widget** — Current consecutive logging days with fire theme
- **Water Tracking Widget** — Track water intake with +250ml, +500ml, -250ml buttons + custom input, progress bar to 2500ml goal
- **Macro Targets** — Radial ring charts for calories, protein, carbs, fats showing progress vs targets
- **Nutrition History** — Area charts (calories) and bar charts (protein) for last 7/14/30 days, expandable table showing each day's detailed food log

### Food Tracking (`/food-tracking`)
- **Date Navigation** — Browse today or any historical date with left/right arrows
- **Food Search** — Debounced search against the backend food database with auto-complete
- **Manual Food Entry** — Name, quantity, unit (intelligent unit detection based on food type), meal type
- **Meal Sections** — Default meals (Breakfast, Lunch, Dinner, Snacks) + custom meal types (Pre-Workout, Post-Workout, Late Night Snack, Morning Snack, Afternoon Tea)
- **Auto-detected meal type** — Based on time of day (5-10am→breakfast, 10-3pm→lunch, etc.)
- **Food Library** — Tabbed panel with two tabs: Favorites and Meals (saved meal templates), with quick-add functionality
- **Saved Meals (Templates)** — Users can save groups of foods as named meals, log an entire meal with 1 click, and quickly save any meal section via "Save" button in the section header. Auto-generates name (e.g. "My Breakfast - Apr 9"). Meals are stored in `user.mealTemplates`.
- **Food Emojis** — Extensive emoji mapping for 100+ food types
- **Macro Progress Bars** — Visual progress for calories, protein, carbs, fats with remaining amounts
- **Unit Conversions** — Supports g, kg, ml, L, oz, tbsp, tsp, piece, cup, fl oz with proper macro scaling
- **Optimistic Updates** — UI updates immediately, rolls back on server error
- **AI Food Logging** — FuelBot can log food directly via chat, syncs with this page in real-time

### Workouts (`/workouts`)
- **Workout Logging** — Log exercises with sets, reps, weights
- **Exercise tracking** — Track per-exercise volume
- **Duration tracking** — Track workout duration

### Workout Plans (`/workout-plans`)
- **AI Workout Generator** — Uses Groq/LLaMA to generate personalized workouts based on:
  - User's fitness goal and activity level
  - Recently trained muscles (last 3 days) — avoids overtraining
  - Undertrained muscle groups — suggests focus areas
  - User's weight for realistic weight suggestions
- **Workout types** — Hypertrophy, strength, etc.
- **Generated plans include** — Exercise name, sets, reps, weight, rest times, form tips, warmup, cooldown

### Exercise Library (accessed via Workout Plans)
- **Interactive SVG Body Map** — Anatomical human body with clickable muscle zones (front and back view)
- **MuscleWiki-style** — Click a muscle group → loads exercises from ExerciseDB API
- **Equipment Filtering** — Filter by equipment type (Barbell, Dumbbell, Body Weight, Cable, Machine, etc.)
- **Exercise Cards** — Display exercise name, equipment, target muscle, photo from Pexels API
- **Exercise Detail Modal** — Full exercise info with AI-generated instructions (via Groq)
- **Save Exercises** — Heart/favorite button, saved exercises persist in localStorage
- **Balanced Results** — Rebalances exercises across equipment types (max 20 per muscle)

### Meal Suggestions (`/meal-suggestions`)
- **AI-powered meal ideas** based on user profile and nutrition targets

### Weekly Plan (`/weekly-plan`)
- **Weekly meal planning matrix** with modal for detailed meal view

### Calorie Calculator (`/calorie-calculator`)
- **Calculator tool** for estimating daily calorie needs based on BMR and activity level

### Nutrition Advice (`/nutrition-advice`)
- **AI-generated nutrition advice** — Personalized based on user's profile, goals, and current intake

### Fitness Advice (`/fitness-advice`)
- **AI-generated fitness advice** — Personalized workout and training recommendations

### Body Weight (`/body-weight`)
- **Weight logging** — Track weight over time with notes
- **Weight history visualization** — Charts showing weight trends

### Progress Photos (`/progress-photos`)
- **Photo uploads** — Front, side, back categories
- **Photo gallery** — View progress photos with dates and notes
- **File upload** via Multer to `/uploads/` directory

### Achievements (`/achievements`)
- **Badge system** — Track unlocked achievements with timestamps
- **Multiple achievement types** based on consistency, goals met, etc.

### Profile (`/profile`)
- **View and edit** — Name, email, age, weight, height, gender, activity level, fitness goal
- **Nutrition targets management** — Set custom calorie/protein/carbs/fats targets

### Settings (`/settings`)
- **Appearance** — Theme (Light/Dark/System), Accent color (8 options: Cyan, Teal, Purple, Orange, Pink, Green, Blue, Red)
- **Language** — English and French supported, Arabic and Spanish marked as "Coming Soon"
- **Privacy & Security** — Change password, delete account (requires typing "DELETE")
- **Data & Storage** — Export nutrition/workouts as CSV, view storage usage, clear nutrition history
- **About** — Version info, links placeholder
- ~~Notifications~~ — Removed from Settings UI
- ~~Accessibility~~ — Removed from Settings UI

---

## 7. AI Chatbot (FuelBot)

**Location:** Floating widget in bottom-right corner of all authenticated pages

### Features:
- **Conversational AI** — Powered by Groq (LLaMA 3.3 70B Versatile, temp 0.3, max 600 tokens)
- **Food Logging via Chat** — Say "log 2 eggs for breakfast" and it automatically:
  1. Extracts food name, quantity, meal type
  2. Calculates accurate macros from built-in nutrition database
  3. Saves directly to user's daily food log
  4. Shows a special food log card with macro breakdown
  5. Syncs with the Food Tracking page in real-time via CustomEvent
- **Context-Aware** — Has access to user's full profile, today's nutrition status, workout history, weight trends, achievements
- **Smart Suggestions** — Dynamic suggestion chips based on user's current status (calories remaining, protein progress, streak, workouts this week)
- **Time-Aware Greetings** — Good morning/afternoon/evening with personalized calorie info
- **Chat History** — Persisted in localStorage (last 20 messages per user)
- **Markdown Rendering** — Bold, italic, lists with DOMPurify sanitization
- **Typing Indicator** — Animated bouncing dots
- **Copy Messages** — Copy button on hover for assistant messages
- **Clear Chat** — Trash button to reset conversation

### Built-in Nutrition Database (in system prompt):
- 30+ foods with per-100g macros (proteins, carbs, fats, dairy, fast food)
- Unit conversion table (cup, tbsp, tsp, oz, egg, scoop, etc.)
- Smart quantity parsing ("2 eggs" → 100g, "half avocado" → 100g)

---

## 8. UI/UX Design System

### Theme
- **Dark mode by default** (slate-900 backgrounds)
- **HSL-based CSS custom properties** for all colors
- **Accent color system** — Primary defaults to Cyan (`186 94% 42%`), user-selectable
- **Glassmorphism** — `backdrop-blur-md`, `bg-xxx/95` patterns
- **Font:** Inter (sans) and Space Grotesk (display/headings)

### Design Patterns
- **Collapsible Sidebar** — Desktop: fixed sidebar (60px collapsed / 240px expanded) with floating collapse tab; Mobile: slide-out drawer with backdrop overlay
- **Sticky Header** — Shows page title with scroll-aware reveal animation
- **Stat Cards** — Glassmorphic cards with gradient accents and hover effects
- **Animated Numbers** — Custom `useAnimatedNumber` hook with easeOutQuart easing
- **Progress Rings** — Radial bar charts for macro tracking
- **Food Emojis** — 100+ food-to-emoji mappings for visual food identification
- **Loading States** — Custom loader component with FitFuel Hub branding, skeleton loaders, spinning icons
- **Micro-animations** — fade-in, slide-in, pulse-glow, progress-fill, accordion animations
- **Toast Notifications** — via Sonner for success/error/info feedback
- **Keyboard Shortcuts** — `?` to show shortcuts modal

### Responsive Design
- Mobile-first with breakpoints at `sm`, `md`, `lg`
- Sidebar collapses to hamburger menu on mobile
- Grid layouts adapt (1 col → 2 col → 3-4 col)

---

## 9. Security Implementation

- **Password Hashing** — bcryptjs with 10 salt rounds
- **Password Strength** — Minimum 8 chars, uppercase, lowercase, number
- **JWT Authentication** — 7-day token expiry, stored in localStorage
- **Protected Routes** — `ProtectedRoute` component + `protect` middleware
- **Owner Authorization** — `authorizeOwner` middleware ensures users can only access their own data
- **Rate Limiting** — Auth endpoints: 20 requests/15 min; General API: 120 requests/min
- **CORS** — Restricted to allowed origins (configurable via `ALLOWED_ORIGINS` env var)
- **Helmet** — Security headers (CSP disabled for external images)
- **Body Size Limit** — 1MB JSON limit
- **Email Verification** — 6-digit OTP with 10-minute expiry, 5 attempt limit
- **Input Sanitization** — DOMPurify for chat HTML rendering
- **Email Enumeration Prevention** — Forgot password returns success regardless of email existence

---

## 10. Environment Variables

### Frontend (`.env` at project root)
```
VITE_PEXELS_API_KEY=xxx      # Pexels API for exercise photos
VITE_RAPIDAPI_KEY=xxx         # RapidAPI key for ExerciseDB
```

### Backend (`mindquest/backend/.env`)
```
MONGODB_URI=mongodb://...     # MongoDB connection string
JWT_SECRET=xxx                # JWT signing secret
EMAIL_USER=xxx                # Gmail address for sending emails
EMAIL_PASS=xxx                # Gmail app password
GROQ_API_KEY=xxx              # Groq Cloud API key
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173
PORT=5000                     # Backend port
```

---

## 11. How to Run

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd mindquest/backend && npm install && cd ../..

# Run both frontend + backend concurrently
npm run dev:all

# Or run separately:
npm run dev           # Frontend on http://localhost:8080
npm run dev:backend   # Backend on http://localhost:5000
```

Vite proxies all `/api` requests to `http://127.0.0.1:5000`.

---

## 12. Key Architectural Decisions

1. **Embedded Data Model** — All user data (foods, workouts, weight logs, photos, achievements, nutrition history) is embedded in a single MongoDB User document. No separate collections for per-user data.

2. **Daily Reset Logic** — At midnight (triggered on first API call), today's food log is archived to `nutritionHistory` (up to 90 days), and `dailyIntake` / `foods` / `dailyWater` are reset to zero.

3. **NutritionContext** — Global React context that holds today's nutrition state, shared across Dashboard, Food Tracking, and other pages. Changes propagate instantly.

4. **AI Integration** — All AI features use Groq Cloud with LLaMA 3.3 70B. The chatbot has a detailed system prompt with the user's full profile, today's nutrition status, and a built-in food macro database.

5. **Authentication** — JWT stored in `localStorage` as `user` object `{ id, name, email }` with separate `token` key. No refresh token mechanism.

6. **PWA** — Configured with Vite PWA plugin for installability and offline-ready capabilities.

---

## 13. Known Limitations & Areas for Improvement

- **No refresh tokens** — JWT expires after 7 days with no silent refresh
- **No real-time sync** — Multiple tabs/devices may show stale data
- **No test suite** — No unit or integration tests exist
- **Embedded data model** — User documents can grow large with 90 days of history + workouts + photos
- **No image optimization** — Progress photos stored as-is in `/uploads/`
- **Exercise library depends on external API** — RapidAPI rate limits can cause failures
- **No offline data persistence** — PWA shell works offline but data operations require connection
- **Data export buttons** exist in settings but functionality may not be fully wired up
- **i18n** — EN and FR translations are complete; Arabic and Spanish are placeholders
- **No admin panel** or content management system
- **No social features** (sharing, friends, challenges)
- **No meal planning persistence** — Weekly plan is AI-generated but not saved
- **chatbot history** only persisted in localStorage, not synced to backend

---

## 14. File Sizes (Key Files)

| File | Lines | Size |
|---|---|---|
| FoodTracking.tsx | ~2,124 | ~90 KB |
| ExerciseLibrary.tsx | 1,026 | 48 KB |
| ChatBot.tsx | 661 | 25 KB |
| Dashboard.tsx | 551 | 25 KB |
| Register.tsx | ~700 | 31 KB |
| NutritionAdvice.tsx | ~600 | 27 KB |
| FitnessAdvice.tsx | ~550 | 25 KB |
| Workouts.tsx | ~550 | 26 KB |
| WorkoutPlans.tsx | ~430 | 20 KB |
| Settings.tsx | ~307 | 16 KB |
| chat.js (backend) | 393 | 13 KB |
| auth.js (backend) | 407 | 13 KB |
| profile.js (backend) | ~623 | 26 KB |
