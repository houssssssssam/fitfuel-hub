import { Menu, Settings as SettingsIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [scrollAwareTitle, setScrollAwareTitle] = useState("");
  const [showScrollAwareTitle, setShowScrollAwareTitle] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      setUser(JSON.parse(raw));
    }
  }, []);

  useEffect(() => {
    if (location.pathname !== "/settings") {
      sessionStorage.setItem("settingsReturnPath", location.pathname);
    }
  }, [location.pathname]);

  // Compute Active page title safely based on mapping
  const pathMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/workouts": "Workouts",
    "/workout-plans": "Workout Plans",
    "/body-weight": "Body Weight",
    "/progress-photos": "Visual Progress",
    "/food-tracking": "Food Tracking",
    "/meal-suggestions": "Meal Suggestions",
    "/weekly-plan": "Weekly Meal Matrix",
    "/calorie-calculator": "Calorie Calculator",
    "/achievements": "Achievements",
    "/nutrition-advice": "Nutrition Advice",
    "/profile": "Account Settings",
    "/settings": "App Settings"
  };
  const scrollAwareRoutes = new Set([
    "/dashboard",
    "/workouts",
    "/workout-plans",
    "/body-weight",
    "/progress-photos",
    "/food-tracking",
    "/meal-suggestions",
    "/weekly-plan",
    "/calorie-calculator",
    "/achievements",
    "/nutrition-advice",
  ]);
  const isScrollAwareRoute = scrollAwareRoutes.has(location.pathname);

  useEffect(() => {
    if (!isScrollAwareRoute) {
      setShowScrollAwareTitle(false);
      setScrollAwareTitle("");
      return;
    }

    setShowScrollAwareTitle(false);
    setScrollAwareTitle(pathMap[location.pathname] || "");

    let frameId = 0;
    let syncTimer = 0;

    const updateTitleVisibility = () => {
      const titleAnchor = document.querySelector<HTMLElement>("[data-page-title-anchor]");

      if (!titleAnchor) {
        setShowScrollAwareTitle(false);
        return;
      }

      const nextTitle =
        titleAnchor.dataset.pageTitle?.trim() ||
        titleAnchor.textContent?.replace(/\s+/g, " ").trim() ||
        pathMap[location.pathname] ||
        "FitFuel Hub";

      setScrollAwareTitle((previous) => (previous === nextTitle ? previous : nextTitle));

      const rect = titleAnchor.getBoundingClientRect();
      const revealOffset = 68;
      const shouldReveal = rect.top <= revealOffset;

      setShowScrollAwareTitle((previous) => (previous === shouldReveal ? previous : shouldReveal));
    };

    const requestMeasurement = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateTitleVisibility);
    };

    requestMeasurement();
    syncTimer = window.setTimeout(requestMeasurement, 120);
    window.addEventListener("scroll", requestMeasurement, { passive: true });
    window.addEventListener("resize", requestMeasurement);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(syncTimer);
      window.removeEventListener("scroll", requestMeasurement);
      window.removeEventListener("resize", requestMeasurement);
    };
  }, [isScrollAwareRoute, location.pathname]);

  const currentTitle = (isScrollAwareRoute ? scrollAwareTitle : pathMap[location.pathname]) || "FitFuel Hub";
  const showTitle = isScrollAwareRoute ? showScrollAwareTitle : true;

  const handleSettingsClick = () => {
    if (location.pathname === "/settings") {
      const stateReturnPath =
        typeof location.state?.from === "string" ? location.state.from : null;
      const storedReturnPath = sessionStorage.getItem("settingsReturnPath");
      const returnPath = stateReturnPath || storedReturnPath || "/dashboard";

      navigate(returnPath === "/settings" ? "/dashboard" : returnPath, { replace: true });
      return;
    }

    navigate("/settings", { state: { from: location.pathname } });
  };

  return (
    <header className="sticky top-0 z-30 w-full h-12 bg-background/95 backdrop-blur border-b border-border/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className={`overflow-hidden transition-[max-width] duration-300 ease-out motion-reduce:transition-none ${showTitle ? "max-w-[12rem] sm:max-w-[18rem]" : "max-w-0"}`}>
          <h1
            className={`truncate whitespace-nowrap text-sm font-semibold text-foreground tracking-wide transition-all duration-300 ease-out motion-reduce:transition-none ${showTitle ? "translate-y-0 opacity-100 blur-0" : "-translate-y-1 opacity-0 blur-sm"}`}
          >
            {currentTitle}
          </h1>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSettingsClick}
            aria-label={location.pathname === "/settings" ? "Close settings" : "Open settings"}
            className={`transition-colors ${location.pathname === "/settings" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
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
