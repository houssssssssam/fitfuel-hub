import { Menu, Settings as SettingsIcon } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const [user, setUser] = useState<{name: string, email: string} | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      setUser(JSON.parse(raw));
    }
  }, []);

  // Compute Active page title safely based on mapping
  const pathMap: Record<string, string> = {
    "/dashboard": "Dashboard Overview",
    "/workouts": "Workouts",
    "/workout-plans": "Workout Plans",
    "/body-weight": "Body Weight Tracker",
    "/progress-photos": "Progress Photos",
    "/food-tracking": "Food Tracking",
    "/meal-suggestions": "Meal Suggestions",
    "/weekly-plan": "Weekly Meal Plan",
    "/calorie-calculator": "Calorie Calculator",
    "/achievements": "Achievements Hub",
    "/nutrition-advice": "Nutrition Advice",
    "/profile": "Account Settings",
    "/settings": "App Settings"
  };

  const currentTitle = pathMap[location.pathname] || "FitFuel Hub";

  return (
    <header className="sticky top-0 z-30 w-full h-12 bg-background/95 backdrop-blur border-b border-border/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold text-foreground tracking-wide">{currentTitle}</h1>
      </div>

      {user && (
        <div className="flex items-center gap-4">
          <Link to="/settings" className="text-muted-foreground hover:text-primary transition-colors">
            <SettingsIcon className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground hidden sm:block">{user.name}</span>
            <Avatar className="h-7 w-7 border border-border">
              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                {user.name?.substring(0, 2).toUpperCase() || "FF"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      )}
    </header>
  );
}
