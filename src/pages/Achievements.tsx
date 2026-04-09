import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, Medal, Trophy, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

// Mirroring the backend dataset for visual defaults
const ALL_ACHIEVEMENTS = [
  { id: "first_meal", title: "First Bite", description: "Log your first food item", icon: "🍳" },
  { id: "streak_3", title: "On a Roll", description: "Hit a 3-day tracking streak", icon: "🔥" },
  { id: "streak_7", title: "Week Warrior", description: "Hit a 7-day tracking streak", icon: "📅" },
  { id: "streak_30", title: "Monthly Master", description: "Hit a 30-day tracking streak", icon: "🏆" },
  { id: "protein_goal", title: "Protein King", description: "Hit your daily protein goal", icon: "🥩" },
  { id: "calorie_goal", title: "Calorie Counter", description: "Hit your daily calorie goal exactly", icon: "⚖️" },
  { id: "water_goal", title: "Hydration Hero", description: "Drink 2500ml of water in a day", icon: "💧" },
  { id: "workout_1", title: "First Sweat", description: "Complete your first workout", icon: "💦" },
  { id: "workout_10", title: "Dedicated", description: "Complete 10 workouts", icon: "💪" },
  { id: "workout_50", title: "Iron Will", description: "Complete 50 workouts", icon: "🛡️" },
  { id: "weight_logged", title: "Scale Tracker", description: "Log your weight 7 distinct times", icon: "⚖️" },
  { id: "meals_explored", title: "Food Explorer", description: "Log 50 distinct food items overall", icon: "🥗" },
  { id: "early_bird", title: "Early Bird", description: "Log a meal before 9:00 AM", icon: "🌅" },
  { id: "night_owl", title: "Night Owl", description: "Log a meal after 8:00 PM", icon: "🦉" },
  { id: "macro_perfect", title: "Macro Master", description: "Hit all 4 macro goals in a single day", icon: "🎯" },
  { id: "weight_loss_5", title: "5kg Target", description: "Change your weight by 5kg from the start", icon: "📉" },
  { id: "weight_loss_10", title: "10kg Target", description: "Change your weight by 10kg from the start", icon: "📉" },
  { id: "meal_suggestion", title: "Recipe Explorer", description: "Generate AI meal suggestions 10 times", icon: "🤖" },
  { id: "profile_complete", title: "All Set", description: "Complete your profile onboarding", icon: "✅" },
  { id: "first_plan", title: "Planner", description: "Create your first custom workout plan", icon: "📝" }
];

export default function Achievements() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userStr = localStorage.getItem("user");
  const userId = userStr ? JSON.parse(userStr).id : null;
  
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await api.get(`/api/profile/${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });

  const runCheck = useMutation({
    mutationFn: async () => {
      await api.post(`/api/achievements/${userId}/check`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    }
  });

  // Automatically check for any unawarded achievements passively on load
  useEffect(() => {
    if (userId) {
      runCheck.mutate();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unlockedMap = new Map<string, string>((profile?.achievements || []).map((a: any) => [a.id, a.unlockedAt]));
  const unlockedCount = unlockedMap.size;
  const totalCount = ALL_ACHIEVEMENTS.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const displayedBadges = ALL_ACHIEVEMENTS.filter(badge => {
    const isUnlocked = unlockedMap.has(badge.id);
    if (filter === "unlocked") return isUnlocked;
    if (filter === "locked") return !isUnlocked;
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 data-page-title-anchor className="text-3xl font-display font-bold text-foreground">{t("achievementsTitle")}</h2>
          <p className="text-muted-foreground mt-1">{t("achievementsSubtitle")}</p>
        </div>
        <div className="flex gap-2 bg-secondary p-1 rounded-lg">
          {[
            { id: "all", label: t("all") },
            { id: "unlocked", label: t("unlocked") },
            { id: "locked", label: t("locked") },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as "all" | "unlocked" | "locked")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === f.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h3 className="text-xl font-bold font-display text-foreground">{t("progress")}</h3>
          </div>
          <div className="text-lg font-bold text-primary">{unlockedCount} / {totalCount}</div>
        </div>
        
        <div className="relative h-4 w-full bg-secondary overflow-hidden rounded-full">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-yellow-400 transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-right text-xs text-muted-foreground mt-2">{progressPercent}% {t("unlocked")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedBadges.map((badge) => {
          const unlockDate = unlockedMap.get(badge.id);
          const isUnlocked = !!unlockDate;

          return (
            <div 
              key={badge.id}
              className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 ${
                isUnlocked 
                  ? "bg-primary/5 border-primary/20 shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]" 
                  : "bg-secondary/20 border-border/50 opacity-60 grayscale"
              }`}
            >
              {isUnlocked && (
                <div className="absolute top-3 right-3 text-primary">
                  <CheckCircle className="h-5 w-5" />
                </div>
              )}
              
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className={`text-6xl drop-shadow-xl ${isUnlocked ? 'scale-110' : 'opacity-40 blur-[1px]'} transition-all duration-500`}>
                  {badge.icon}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-lg tracking-wide">{badge.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{badge.description}</p>
                </div>
                
                <div className={`text-xs font-semibold px-3 py-1 rounded-full ${isUnlocked ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {isUnlocked ? `Unlocked ${new Date(unlockDate).toLocaleDateString()}` : t("locked")}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayedBadges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border">
          <Medal className="h-12 w-12 mb-4 opacity-50" />
          <p>No achievements found for this filter.</p>
        </div>
      )}

    </div>
  );
}

