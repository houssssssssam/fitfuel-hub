import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Workouts from "./pages/Workouts";
import WorkoutPlans from "./pages/WorkoutPlans";
import FoodTracking from "./pages/FoodTracking";
import MealSuggestions from "./pages/MealSuggestions";
import CalorieCalculator from "./pages/CalorieCalculator";
import NutritionAdvice from "./pages/NutritionAdvice";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import BodyWeight from "./pages/BodyWeight";
import Achievements from "./pages/Achievements";
import WeeklyPlan from "./pages/WeeklyPlan";
import ProgressPhotos from "./pages/ProgressPhotos";
import Settings from "./pages/Settings";
import { useEffect, useState } from "react";
import Loader from "./components/Loader";
import { NutritionProvider } from "./context/NutritionContext";

const queryClient = new QueryClient();

const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<NutritionProvider><AppLayout /></NutritionProvider>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/workouts" element={<Workouts />} />
                <Route path="/workout-plans" element={<WorkoutPlans />} />
                <Route path="/food-tracking" element={<FoodTracking />} />
                <Route path="/meal-suggestions" element={<MealSuggestions />} />
                <Route path="/calorie-calculator" element={<CalorieCalculator />} />
                <Route path="/nutrition-advice" element={<NutritionAdvice />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/body-weight" element={<BodyWeight />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/weekly-plan" element={<WeeklyPlan />} />
                <Route path="/progress-photos" element={<ProgressPhotos />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
