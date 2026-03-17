# 🏋️ FitFuel Hub

A full-stack fitness & nutrition tracking app built with React, Node.js, and MongoDB.

## Features
- 🍗 Food tracking with 100,000+ real foods
- 🤖 AI-generated meal suggestions (Groq + Llama 3.3)
- 📊 Daily macro tracking & progress
- 💪 Workout tracking & plans
- 🔥 Calorie calculator
- 📱 Fully responsive

## Tech Stack
**Frontend:** React, TypeScript, Tailwind CSS, Vite  
**Backend:** Node.js, Express, MongoDB  
**AI:** Groq API (Llama 3.3 70B)  
**Data:** USDA FoodData Central API  
**Photos:** Unsplash API  

## Setup

### Backend
```bash
cd backend
npm install
# Add .env with MONGODB_URI, GROQ_API_KEY, FOODDATA_API_KEY
npm run dev
```

### Frontend
```bash
npm install
# Add .env with VITE_UNSPLASH_ACCESS_KEY
npm run dev
```