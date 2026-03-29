import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  Award,
  Beef,
  Brain,
  Calendar,
  CheckCircle,
  ChevronRight,
  Droplets,
  Flame,
  Info,
  Minus,
  RefreshCw,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTranslation } from "react-i18next";

interface NutritionAdviceResponse {
  overallScore: number;
  scoreLabel: string;
  scoreColor: string;
  summary: string;
  insights: Insight[];
  macroBalance: MacroBalance;
  weeklyPattern: WeeklyPattern;
  topRecommendations: Recommendation[];
  mealTimingTips: MealTip[];
  realData: RealData;
}

interface Insight {
  id: string;
  type: "warning" | "success" | "tip" | "info";
  title: string;
  description: string;
  metric: string;
  current: number;
  target: number;
  unit: string;
  priority: "high" | "medium" | "low";
  action: string;
}

interface MacroBalance {
  assessment: string;
  proteinStatus: "low" | "good" | "high";
  carbStatus: "low" | "good" | "high";
  fatStatus: "low" | "good" | "high";
}

interface WeeklyPattern {
  consistency: number;
  bestMacro: string;
  worstMacro: string;
  trend: "improving" | "declining" | "stable";
}

interface Recommendation {
  rank: number;
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  timeframe: string;
}

interface MealTip {
  meal: string;
  tip: string;
  foods: string[];
}

interface MacroSet {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface RealData {
  todayIntake: MacroSet;
  targets: MacroSet;
  weeklyAverages: MacroSet;
  daysLoggedThisWeek: number;
  currentStreak: number;
  weightTrend: number;
  dailyWater: number;
  historyAvailable: number;
  userName: string;
  goal: string;
}

type LoadState = "loading" | "ready" | "error";

const safePercent = (value: number, target: number): number => {
  if (!target || target <= 0) return 0;
  return Math.min(Math.round((value / target) * 100), 100);
};

const getUserId = (): string | null => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user).id : null;
};

const scoreTone = (score: number): string => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
};

const scoreStroke = (score: number): string => {
  if (score >= 80) return "#4ade80";
  if (score >= 60) return "#facc15";
  return "#f87171";
};

const insightBorder = (type: Insight["type"]): string => {
  switch (type) {
    case "warning":
      return "border-yellow-500/20 bg-yellow-500/5";
    case "success":
      return "border-green-500/20 bg-green-500/5";
    case "tip":
      return "border-cyan-500/20 bg-cyan-500/5";
    default:
      return "border-blue-500/20 bg-blue-500/5";
  }
};

const getInsightIcon = (type: Insight["type"]) => {
  switch (type) {
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    case "tip":
      return <Zap className="h-5 w-5 text-cyan-400" />;
    default:
      return <Info className="h-5 w-5 text-blue-400" />;
  }
};

const getTrendIcon = (trend: WeeklyPattern["trend"]) => {
  switch (trend) {
    case "improving":
      return <TrendingUp className="h-4 w-4 text-green-400" />;
    case "declining":
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    default:
      return <Minus className="h-4 w-4 text-slate-400" />;
  }
};

const macroStatusTone = (status: MacroBalance["proteinStatus"]): string => {
  if (status === "good") return "text-green-400 border-green-500/20 bg-green-500/10";
  if (status === "high") return "text-yellow-400 border-yellow-500/20 bg-yellow-500/10";
  return "text-red-400 border-red-500/20 bg-red-500/10";
};

const impactTone = (impact: Recommendation["impact"]): string => {
  if (impact === "high") return "bg-red-500/20 text-red-400";
  if (impact === "medium") return "bg-yellow-500/20 text-yellow-400";
  return "bg-green-500/20 text-green-400";
};

const NutritionAdvice = () => {
  const { t } = useTranslation();
  const [advice, setAdvice] = useState<NutritionAdviceResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdvice = async (isRefresh = false) => {
    const userId = getUserId();
    if (!userId) {
      setState("error");
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setState("loading");
    }

    try {
      const res = await api.get<NutritionAdviceResponse>(`/api/nutrition-advice/${userId}`);
      setAdvice(res.data);
      setState("ready");
    } catch (err) {
      console.error(err);
      setState("error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdvice();
  }, []);

  const macroChartData = useMemo(() => {
    if (!advice) return [];

    const { realData } = advice;
    return [
      {
        name: "Calories",
        value: safePercent(realData.todayIntake.calories, realData.targets.calories),
        fill: "#06b6d4",
      },
      {
        name: "Protein",
        value: safePercent(realData.todayIntake.protein, realData.targets.protein),
        fill: "#22c55e",
      },
      {
        name: "Carbs",
        value: safePercent(realData.todayIntake.carbs, realData.targets.carbs),
        fill: "#f59e0b",
      },
      {
        name: "Fats",
        value: safePercent(realData.todayIntake.fats, realData.targets.fats),
        fill: "#ef4444",
      },
    ];
  }, [advice]);

  if (state === "loading") {
    return <LoadingSkeleton />;
  }

  if (state === "error" || !advice) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t("nutritionAdviceTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">We couldn&apos;t generate your personalized analysis right now.</p>
        </div>

        <div className="stat-card border border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold text-foreground">Advice unavailable</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Try refreshing to generate a new analysis from your current intake, history, and nutrition targets.
                </p>
              </div>
              <button
                onClick={() => fetchAdvice(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary/80"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { realData } = advice;
  const goalLabel = realData.goal?.replace(/_/g, " ") || "your goal";

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t("nutritionAdviceTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered analysis built from your real nutrition data, {realData.userName}
          </p>
        </div>

        <button
          onClick={() => fetchAdvice(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-secondary/70 px-4 py-2.5 text-sm text-foreground transition-all hover:bg-secondary disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="stat-card border border-primary/20 bg-gradient-to-br from-primary/12 via-background to-background overflow-hidden">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                <Award className="h-3.5 w-3.5" />
                Nutrition Score
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">{advice.scoreLabel}</h2>
                  <span className={`text-sm font-semibold ${scoreTone(advice.overallScore)}`}>
                    {advice.overallScore}/100
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {advice.summary}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                  Goal: {goalLabel}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                  Streak: {realData.currentStreak} days
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                  Logged: {realData.daysLoggedThisWeek}/7 days
                </span>
              </div>
            </div>

            <div className="relative h-40 w-40 shrink-0 self-center">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={scoreStroke(advice.overallScore)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${advice.overallScore * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${scoreTone(advice.overallScore)}`}>{advice.overallScore}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overall</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card border border-white/5 bg-gradient-to-br from-slate-950 to-slate-900/70">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Macro Snapshot</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {macroChartData.map((macro) => (
              <div key={macro.name} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{macro.name}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{macro.value}%</p>
              </div>
            ))}
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={macroChartData}
                innerRadius="18%"
                outerRadius="92%"
                startAngle={90}
                endAngle={-270}
                barSize={12}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(2, 6, 23, 0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                  }}
                />
                <RadialBar background dataKey="value" cornerRadius={999} label={false} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          icon={<Flame className="h-5 w-5 text-primary" />}
          label="Calories Today"
          value={`${realData.todayIntake.calories}`}
          helper={`of ${realData.targets.calories} kcal`}
          progress={safePercent(realData.todayIntake.calories, realData.targets.calories)}
          progressClass="bg-primary"
        />
        <StatTile
          icon={<Beef className="h-5 w-5 text-green-400" />}
          label="Protein Today"
          value={`${realData.todayIntake.protein}g`}
          helper={`of ${realData.targets.protein}g`}
          progress={safePercent(realData.todayIntake.protein, realData.targets.protein)}
          progressClass="bg-green-400"
        />
        <StatTile
          icon={<Calendar className="h-5 w-5 text-yellow-400" />}
          label="Week Logged"
          value={`${realData.daysLoggedThisWeek}/7`}
          helper="days tracked"
          progress={Math.round((realData.daysLoggedThisWeek / 7) * 100)}
          progressClass="bg-yellow-400"
        />
        <StatTile
          icon={<Droplets className="h-5 w-5 text-blue-400" />}
          label="Water Today"
          value={`${realData.dailyWater}ml`}
          helper="of 2500ml"
          progress={safePercent(realData.dailyWater, 2500)}
          progressClass="bg-blue-400"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t("weeklyAverages")}</h3>
          </div>

          {realData.historyAvailable === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-secondary/20 text-center">
              <Calendar className="h-8 w-8 text-slate-500" />
              <p className="max-w-sm text-sm text-muted-foreground">
                You need a few days of logged nutrition before weekly averages become meaningful.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <MacroProgressRow
                label="Avg Calories"
                current={realData.weeklyAverages.calories}
                target={realData.targets.calories}
                unit="kcal"
                barClass="bg-primary"
              />
              <MacroProgressRow
                label="Avg Protein"
                current={realData.weeklyAverages.protein}
                target={realData.targets.protein}
                unit="g"
                barClass="bg-green-400"
              />
              <MacroProgressRow
                label="Avg Carbs"
                current={realData.weeklyAverages.carbs}
                target={realData.targets.carbs}
                unit="g"
                barClass="bg-yellow-400"
              />
              <MacroProgressRow
                label="Avg Fats"
                current={realData.weeklyAverages.fats}
                target={realData.targets.fats}
                unit="g"
                barClass="bg-red-400"
              />
            </div>
          )}
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            {getTrendIcon(advice.weeklyPattern.trend)}
            <h3 className="font-semibold text-foreground">Pattern Recognition</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <PatternCard label="Consistency" value={`${advice.weeklyPattern.consistency}%`} />
            <PatternCard label="Best Macro" value={advice.weeklyPattern.bestMacro} />
            <PatternCard label="Weakest Macro" value={advice.weeklyPattern.worstMacro} />
            <PatternCard label="Trend" value={advice.weeklyPattern.trend} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/5 bg-secondary/30 p-4">
            <p className="text-sm font-medium text-foreground">{advice.macroBalance.assessment}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs ${macroStatusTone(advice.macroBalance.proteinStatus)}`}>
                Protein: {advice.macroBalance.proteinStatus}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs ${macroStatusTone(advice.macroBalance.carbStatus)}`}>
                Carbs: {advice.macroBalance.carbStatus}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs ${macroStatusTone(advice.macroBalance.fatStatus)}`}>
                Fats: {advice.macroBalance.fatStatus}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Weight Trend</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {realData.weightTrend > 0 ? "+" : ""}
                  {realData.weightTrend.toFixed(1)}kg
                </p>
              </div>
              {realData.weightTrend > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : realData.weightTrend < 0 ? (
                <TrendingDown className="h-5 w-5 text-red-400" />
              ) : (
                <Minus className="h-5 w-5 text-slate-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t("aiInsights")}</h2>
          <span className="text-xs text-muted-foreground">Generated from your actual intake and history</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {advice.insights.map((insight) => (
            <div key={insight.id} className={`rounded-2xl border p-4 ${insightBorder(insight.type)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {getInsightIcon(insight.type)}
                  <div>
                    <h3 className="font-medium text-foreground">{insight.title}</h3>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{insight.metric}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                    insight.priority === "high"
                      ? "bg-red-500/20 text-red-400"
                      : insight.priority === "medium"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {insight.priority}
                </span>
              </div>

              {insight.target > 0 && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {insight.current}
                      {insight.unit}
                    </span>
                    <span>
                      Target {insight.target}
                      {insight.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${safePercent(insight.current, insight.target)}%` }}
                    />
                  </div>
                </div>
              )}

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{insight.description}</p>

              {insight.action && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/[0.03] p-3">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-primary/90">{insight.action}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="stat-card">
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            <h3 className="font-semibold text-foreground">{t("topRecommendations")}</h3>
          </div>

          <div className="space-y-3">
            {advice.topRecommendations.map((recommendation) => (
              <div key={recommendation.rank} className="rounded-2xl border border-white/5 bg-secondary/40 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">
                    {recommendation.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium text-foreground">{recommendation.title}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${impactTone(recommendation.impact)}`}>
                        {recommendation.impact} impact
                      </span>
                      <span className="text-xs text-muted-foreground">{recommendation.timeframe}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{recommendation.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-card">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-foreground">{t("mealTimingStrategy")}</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {advice.mealTimingTips.map((tip, index) => (
              <div key={`${tip.meal}-${index}`} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">{tip.meal}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{tip.tip}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tip.foods?.map((food) => (
                    <span
                      key={food}
                      className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary"
                    >
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatTile = ({
  icon,
  label,
  value,
  helper,
  progress,
  progressClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  progress: number;
  progressClass: string;
}) => (
  <div className="stat-card p-4">
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
      <div className="rounded-xl bg-white/[0.03] p-3">{icon}</div>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
    <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full rounded-full ${progressClass}`} style={{ width: `${progress}%` }} />
    </div>
  </div>
);

const MacroProgressRow = ({
  label,
  current,
  target,
  unit,
  barClass,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  barClass: string;
}) => {
  const percent = safePercent(current, target);
  const difference = current - target;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {current}
            {unit}
          </span>
          <span className={`text-xs ${difference >= 0 ? "text-green-400" : "text-red-400"}`}>
            {difference > 0 ? "+" : ""}
            {difference}
            {unit}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const PatternCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <p className="mt-2 text-lg font-semibold capitalize text-foreground">{value}</p>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-56 rounded bg-secondary" />
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
      <div className="stat-card h-56 bg-secondary" />
      <div className="stat-card h-56 bg-secondary" />
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="stat-card h-32 bg-secondary" />
      ))}
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="stat-card h-72 bg-secondary" />
      <div className="stat-card h-72 bg-secondary" />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-56 rounded-2xl bg-secondary" />
      ))}
    </div>
  </div>
);

export default NutritionAdvice;

