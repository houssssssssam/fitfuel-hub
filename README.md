# FitFuel Hub

FitFuel Hub is a full-stack fitness and nutrition tracking app built with React, TypeScript, Node.js, Express, and MongoDB. It includes food tracking, macro progress, workouts, meal suggestions, progress tools, and an AI chatbot called FuelBot that can now log foods directly into the user's daily intake.

## Features

- Food tracking with USDA FoodData Central import support
- AI-powered FuelBot chatbot with direct food logging
- Daily calories, protein, carbs, fats, and water tracking
- AI meal suggestions and nutrition advice
- Workout logging, exercise library, and weekly planning
- Weight tracking, achievements, and progress photos
- Responsive frontend with PWA support

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, MongoDB, Mongoose
- AI: Groq API
- Nutrition data: USDA FoodData Central API
- Photos/media: Unsplash, Pexels, ExerciseDB via RapidAPI

## Project Structure

- `src/`: frontend app
- `mindquest/backend/`: backend API
- `mindquest/backend/.env.example`: backend environment template
- `public/`: static frontend assets

## Requirements

- Node.js 18 or newer
- npm
- A MongoDB database
- A Groq API key for chatbot and AI meal features
- A USDA FoodData Central API key if you want to import foods

Optional service keys:

- Unsplash access key for meal photos
- Pexels API key for exercise photos
- RapidAPI key for the exercise library feed
- Email credentials for password reset emails

## Environment Variables

### Backend

Create `mindquest/backend/.env` based on `mindquest/backend/.env.example`.

Required backend variables:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/mindquest
JWT_SECRET=replace_with_a_secure_secret
GROQ_API_KEY=your_groq_api_key
FOODDATA_API_KEY=your_fooddata_api_key
```

Optional backend variables:

```env
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
```

`EMAIL_USER` and `EMAIL_PASS` are needed for password reset emails.

### Frontend

Create a root `.env` only if you need frontend API keys or a custom API base URL.

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key
VITE_PEXELS_API_KEY=your_pexels_api_key
VITE_RAPIDAPI_KEY=your_rapidapi_key
```

Notes:

- In local development, `VITE_API_BASE_URL` is optional because Vite proxies `/api` to `http://127.0.0.1:5000`.
- In production, set `VITE_API_BASE_URL` to your deployed backend origin.
- `VITE_UNSPLASH_ACCESS_KEY` is used for meal images.
- `VITE_PEXELS_API_KEY` and `VITE_RAPIDAPI_KEY` are used by the exercise library.

## Installation

Install frontend dependencies from the project root:

```bash
npm install
```

Install backend dependencies:

```bash
npm install --prefix mindquest/backend
```

## Development

Run frontend and backend together:

```bash
npm run dev:all
```

Or run them separately:

```bash
npm run dev
```

```bash
npm run dev:backend
```

Default local URLs:

- Frontend: `http://localhost:8080`
- Backend: `http://127.0.0.1:5000`

## Import Food Data

To import foods from USDA into MongoDB:

```bash
npm --prefix mindquest/backend run import:fooddata
```

This requires:

- MongoDB running
- `MONGODB_URI` set
- `FOODDATA_API_KEY` set

## Production

Build the frontend:

```bash
npm run build
```

Preview the frontend build locally:

```bash
npm run preview
```

Start the backend:

```bash
npm --prefix mindquest/backend run start
```

## FuelBot Food Logging

FuelBot can log foods directly into the user's daily tracker. Example prompts:

- `log 2 eggs for breakfast`
- `add 100g chicken breast to lunch`
- `I had a banana as a snack`
- `ate half an avocado`

When FuelBot detects a food logging request, it estimates macros, saves the food to the backend, and the Food Tracking page refreshes automatically.

## Notes

- Keep `mindquest/backend/.env` out of Git.
- Keep `mindquest/backend/node_modules` and runtime uploads out of Git.
- `mindquest/backend/.env.example` contains placeholders only and is safe to commit.
