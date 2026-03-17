import { Link, useLocation, useNavigate } from "react-router-dom";
import { Dumbbell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Workouts", path: "/workouts" },
  { label: "Workout Plans", path: "/workout-plans" },
  { label: "Food Tracking", path: "/food-tracking" },
  { label: "Meal Suggestions", path: "/meal-suggestions" },
  { label: "Calorie Calculator", path: "/calorie-calculator" },
  { label: "Nutrition Advice", path: "/nutrition-advice" },
  { label: "Profile", path: "/profile" },
];

const Header = () => {
  const location = useLocation(); 
  const navigate = useNavigate();

  const handleLogout = () => {
  localStorage.removeItem("user");
  navigate("/login");
};

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors">
            FitFuel Hub
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === item.path
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleLogout}
          >

          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
