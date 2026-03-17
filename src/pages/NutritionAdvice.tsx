import { Brain, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Recommendation {
  id: string;
  type: "success" | "warning" | "info";
  title: string;
  description: string;
  action?: string;
}

interface WeeklyStats {
  metric: string;
  current: number;
  target: number;
  unit: string;
  trend: "up" | "down" | "stable";
}

const NutritionAdvice = () => {
  const weeklyStats: WeeklyStats[] = [
    { metric: "Avg. Daily Calories", current: 2350, target: 2500, unit: "cal", trend: "up" },
    { metric: "Avg. Daily Protein", current: 162, target: 180, unit: "g", trend: "up" },
    { metric: "Avg. Daily Carbs", current: 285, target: 300, unit: "g", trend: "stable" },
    { metric: "Avg. Daily Fats", current: 78, target: 80, unit: "g", trend: "down" },
    { metric: "Consistency", current: 85, target: 100, unit: "%", trend: "up" },
  ];

  const recommendations: Recommendation[] = [
    {
      id: "1",
      type: "warning",
      title: "Increase Protein Intake",
      description: "You're averaging 162g protein daily, but your target is 180g. You're missing about 18g per day.",
      action: "Add a protein shake or 100g of chicken breast to your daily intake.",
    },
    {
      id: "2",
      type: "success",
      title: "Great Fat Balance",
      description: "Your fat intake is well-balanced at 78g average. Keep maintaining this level for optimal hormone function.",
    },
    {
      id: "3",
      type: "info",
      title: "Consider Meal Timing",
      description: "Distribute your protein intake across 4-5 meals for better absorption. Aim for 30-40g protein per meal.",
      action: "Try adding a protein-rich snack between lunch and dinner.",
    },
    {
      id: "4",
      type: "warning",
      title: "Calorie Deficit Detected",
      description: "You're 150 calories below your target on average. This might slow down your muscle-building progress.",
      action: "Add a small snack like Greek yogurt with almonds (250 cal) to hit your target.",
    },
    {
      id: "5",
      type: "success",
      title: "Excellent Consistency",
      description: "You've logged your meals 6 out of 7 days this week. Consistency is key to reaching your goals!",
    },
    {
      id: "6",
      type: "info",
      title: "Pre-Workout Nutrition",
      description: "Consider eating a carb-rich meal 2-3 hours before your workout for optimal performance.",
      action: "Try oats with banana or rice with chicken before training.",
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-accent" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Lightbulb className="h-5 w-5 text-primary" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "success":
        return <Badge className="bg-accent/20 text-accent border-accent/30">On Track</Badge>;
      case "warning":
        return <Badge className="bg-warning/20 text-warning border-warning/30">Needs Attention</Badge>;
      default:
        return <Badge className="bg-primary/20 text-primary border-primary/30">Tip</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <ArrowUp className="h-4 w-4 text-accent" />;
      case "down":
        return <ArrowDown className="h-4 w-4 text-destructive" />;
      default:
        return <span className="text-muted-foreground">—</span>;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Nutrition Advice</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Personalized recommendations based on your intake and goals
        </p>
      </div>

      {/* Weekly Overview */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-base md:text-lg font-semibold font-display text-foreground">
            Weekly Overview
          </h2>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Metric</th>
                <th className="text-right py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Current</th>
                <th className="text-right py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Target</th>
                <th className="text-right py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Progress</th>
                <th className="text-center py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-muted-foreground">Trend</th>
              </tr>
            </thead>
            <tbody>
              {weeklyStats.map((stat, index) => {
                const progress = Math.round((stat.current / stat.target) * 100);
                return (
                  <tr key={index} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 md:py-3 px-2 md:px-4 text-foreground font-medium text-xs md:text-sm">{stat.metric}</td>
                    <td className="py-2 md:py-3 px-2 md:px-4 text-right text-foreground text-xs md:text-sm">
                      {stat.current}{stat.unit}
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-4 text-right text-muted-foreground text-xs md:text-sm">
                      {stat.target}{stat.unit}
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-4 text-right">
                      <span className={cn(
                        "font-semibold text-xs md:text-sm",
                        progress >= 95 ? "text-accent" : progress >= 80 ? "text-warning" : "text-destructive"
                      )}>
                        {progress}%
                      </span>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-4 text-center">{getTrendIcon(stat.trend)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Recommendations */}
      <div>
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <h2 className="text-lg md:text-xl font-semibold font-display text-foreground">
            Personalized Recommendations
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={cn(
                "stat-card transition-all duration-300",
                rec.type === "warning" && "border-warning/30 hover:border-warning/50",
                rec.type === "success" && "border-accent/30 hover:border-accent/50",
                rec.type === "info" && "border-primary/30 hover:border-primary/50"
              )}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="shrink-0 mt-0.5">{getTypeIcon(rec.type)}</div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-sm md:text-base">{rec.title}</h3>
                    {getTypeBadge(rec.type)}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">{rec.description}</p>
                  {rec.action && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs md:text-sm text-primary font-medium">
                        💡 {rec.action}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="stat-card">
        <h2 className="text-base md:text-lg font-semibold font-display text-foreground mb-4">
          💪 Bodybuilding Nutrition Tips
        </h2>
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
            <h4 className="font-medium text-foreground mb-2 text-sm md:text-base">Protein Timing</h4>
            <p className="text-xs md:text-sm text-muted-foreground">
              Consume protein within 2 hours post-workout for optimal muscle protein synthesis.
            </p>
          </div>
          <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
            <h4 className="font-medium text-foreground mb-2 text-sm md:text-base">Stay Hydrated</h4>
            <p className="text-xs md:text-sm text-muted-foreground">
              Drink at least 3-4 liters of water daily. Hydration affects performance and recovery.
            </p>
          </div>
          <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
            <h4 className="font-medium text-foreground mb-2 text-sm md:text-base">Sleep & Recovery</h4>
            <p className="text-xs md:text-sm text-muted-foreground">
              Aim for 7-9 hours of sleep. Consider casein protein before bed for overnight recovery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionAdvice;
