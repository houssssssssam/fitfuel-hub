import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, Dumbbell, ClipboardList, Scale, Camera, 
  Utensils, UtensilsCrossed, Calendar, Calculator, Trophy, 
  Brain, User, LogOut, ChevronLeft, ChevronRight, X, Settings as SettingsIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  translationKey?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }]
  },
  {
    title: "FITNESS",
    items: [
      { label: "Workouts", path: "/workouts", icon: Dumbbell },
      { label: "Workout Plans", path: "/workout-plans", icon: ClipboardList },
      { label: "Body Weight", path: "/body-weight", icon: Scale },
      { label: "Progress Photos", path: "/progress-photos", icon: Camera }
    ]
  },
  {
    title: "NUTRITION",
    items: [
      { label: "Food Tracking", path: "/food-tracking", icon: Utensils },
      { label: "Meal Suggestions", path: "/meal-suggestions", icon: UtensilsCrossed },
      { label: "Weekly Plan", path: "/weekly-plan", icon: Calendar },
      { label: "Calorie Calculator", path: "/calorie-calculator", icon: Calculator }
    ]
  },
  {
    title: "INSIGHTS",
    items: [
      { label: "Achievements", path: "/achievements", icon: Trophy },
      { label: "Nutrition Advice", path: "/nutrition-advice", icon: Brain },
      { label: "Fitness Advice", path: "/fitness-advice", icon: Dumbbell }
    ]
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Settings", path: "/settings", icon: SettingsIcon, translationKey: "settings" },
      { label: "Profile", path: "/profile", icon: User, translationKey: "profile" },
    ]
  }
];

interface SidebarProps {
  isCollapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

export default function Sidebar({ isCollapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await import("@/lib/api").then(({ api }) => api.post("/api/auth/logout"));
    } catch {
      // proceed even if the call fails
    }
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-md border-r border-white/5 text-slate-300 shadow-xl">
      {/* Logo Area */}
      <div className="h-12 flex items-center px-4 border-b border-white/5 justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden" onClick={() => setMobileOpen(false)}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-display text-base font-bold text-white whitespace-nowrap animate-fade-in">
              FitFuel Hub
            </span>
          )}
        </Link>
        
        {/* Mobile close button */}
        <button className="md:hidden text-white/50 hover:text-white" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto py-4 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-white/10">
        {navGroups.map((group, i) => (
          <div key={i} className="px-3 flex flex-col gap-0.5">
            {!isCollapsed && (
              <h4 className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 animate-fade-in">
                {group.title}
              </h4>
            )}
            
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.includes(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                    isActive 
                      ? "bg-primary/20 text-primary font-medium" 
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary rounded-r-full" />
                  )}
                  <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-100")} />
                  {!isCollapsed && <span className="text-sm whitespace-nowrap">{item.translationKey ? t(item.translationKey) : item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Logout (Special Red Layering at bottom flex offset) */}
        <div className="px-3 mt-auto pt-4 border-t border-white/5 pb-2">
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group relative"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{t('logout')}</span>}
          </button>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Fixed Scope */}
      <aside
        className={cn(
          "hidden md:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {navContent}

        {/* Floating collapse tab */}
        <button
          onClick={() => setCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 flex h-14 w-3 flex-col items-center justify-center rounded-r-md bg-primary/80 hover:bg-primary hover:w-4 transition-all duration-200 shadow-lg shadow-primary/30 group"
        >
          <div className="flex flex-col items-center gap-[3px]">
            <span className="block h-[3px] w-1.5 rounded-full bg-white/80 group-hover:bg-white" />
            <span className="block h-[3px] w-1.5 rounded-full bg-white/80 group-hover:bg-white" />
            <span className="block h-[3px] w-1.5 rounded-full bg-white/80 group-hover:bg-white" />
          </div>
        </button>
      </aside>

      {/* Mobile Modal Blocking Scope */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Actual Drawer Instance */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[100] w-64 transform transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
