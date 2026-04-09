import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  Award,
  Brain,
  CheckCircle,
  ChevronRight,
  Dumbbell,
  Flame,
  Info,
  Minus,
  RefreshCw,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface FitnessAdviceResponse {
  overallScore: number;
  scoreLabel: string;
  summary: string;
  insights: Insight[];
  weeklyPattern: WeeklyPattern;
  topRecommendations: Recommendation[];
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

interface WeeklyPattern {
  consistency: number;
  avgFrequency: number;
  trend: "improving" | "declining" | "stable";
  totalSessions: number;
}

interface Recommendation {
  rank: number;
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  timeframe: string;
}

interface PersonalRecord {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

interface VolumePoint {
  date: string;
  volume: number;
  name: string;
  exerciseCount: number;
}

interface RealData {
  totalWorkouts: number;
  avgVolume: number;
  weeklyAvg: number;
  muscleDistribution: Record<string, number>;
  personalRecords: PersonalRecord[];
  volumeHistory: VolumePoint[];
  userName: string;
  goal: string;
}

type LoadState = "loading" | "ready" | "error";

// ── Helpers ──────────────────────────────────────────────────────────────────

const MUSCLE_COLORS: Record<string, string> = {
  chest: "#06b6d4",
  back: "#22c55e",
  shoulders: "#f59e0b",
  legs: "#ef4444",
  biceps: "#8b5cf6",
  triceps: "#ec4899",
  core: "#14b8a6",
  other: "#64748b",
};

const getUserId = (): string | null => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user).id : null;
};

const scoreTone = (score: number): string => {
  if (score >= 70) return "text-green-400";
  if (score >= 45) return "text-yellow-400";
  return "text-red-400";
};

const scoreStroke = (score: number): string => {
  if (score >= 70) return "#4ade80";
  if (score >= 45) return "#facc15";
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

const impactTone = (impact: Recommendation["impact"]): string => {
  if (impact === "high") return "bg-red-500/20 text-red-400";
  if (impact === "medium") return "bg-yellow-500/20 text-yellow-400";
  return "bg-green-500/20 text-green-400";
};

// ── Main Component ───────────────────────────────────────────────────────────

const FitnessAdvice = () => {
  const [advice, setAdvice] = useState<FitnessAdviceResponse | null>(null);
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
      const res = await api.get<FitnessAdviceResponse>(`/api/fitness-advice/${userId}`);
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

  const muscleChartData = useMemo(() => {
    if (!advice?.realData?.muscleDistribution) return [];
    return Object.entries(advice.realData.muscleDistribution).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: MUSCLE_COLORS[name] || MUSCLE_COLORS.other,
    }));
  }, [advice]);

  if (state === "loading") return <LoadingSkeleton />;

  if (state === "error" || !advice) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 data-page-title-anchor className="text-2xl md:text-3xl font-bold font-display text-foreground">
            AI Fitness Coach
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            We couldn&apos;t generate your fitness analysis right now.
          </p>
        </div>
        <div className="stat-card border border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold text-foreground">Analysis unavailable</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Try refreshing to generate a new analysis from your workout history.
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

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 data-page-title-anchor className="text-2xl md:text-3xl font-bold font-display text-foreground">
            AI Fitness Coach
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered analysis of your real workout data, {realData.userName}
          </p>
        </div>
        <button
          onClick={() => fetchAdvice(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-secondary/70 px-4 py-2.5 text-sm text-foreground transition-all hover:bg-secondary disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Analysis
        </button>
      </div>

      {/* Score + Stats Row */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        {/* Score Card */}
        <div className="stat-card border border-primary/20 bg-gradient-to-br from-primary/12 via-background to-background overflow-hidden">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                <Award className="h-3.5 w-3.5" />
                Fitness Score
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">{advice.scoreLabel}</h2>
                  <span className={`text-sm font-semibold ${scoreTone(advice.overallScore)}`}>
                    {advice.overallScore}/100
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{advice.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                  Goal: {realData.goal}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                  {realData.totalWorkouts} sessions (30d)
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                  {realData.weeklyAvg} sessions/week
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
                <span className={`text-4xl font-bold ${scoreTone(advice.overallScore)}`}>
                  {advice.overallScore}
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Muscle Distribution */}
        <div className="stat-card border border-white/5 bg-gradient-to-br from-slate-950 to-slate-900/70">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Muscle Coverage</h3>
          </div>

          {muscleChartData.length > 0 ? (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={muscleChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {muscleChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(2, 6, 23, 0.95)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                      }}
                      formatter={(value: number, name: string) => [`${value} exercises`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {muscleChartData.map((m) => (
                  <span
                    key={m.name}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium flex items-center gap-1.5"
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.fill }} />
                    {m.name}: {m.value}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-center">
              <Activity className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-sm text-muted-foreground">Log workouts to see muscle coverage</p>
            </div>
          )}
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          icon={<Dumbbell className="h-5 w-5 text-primary" />}
          label="Sessions (30d)"
          value={`${realData.totalWorkouts}`}
          helper={`${realData.weeklyAvg}/week avg`}
        />
        <StatTile
          icon={<Flame className="h-5 w-5 text-orange-400" />}
          label="Avg Volume"
          value={`${realData.avgVolume.toLocaleString()}`}
          helper="lbs per session"
        />
        <StatTile
          icon={<Trophy className="h-5 w-5 text-yellow-400" />}
          label="Personal Records"
          value={`${realData.personalRecords?.length || 0}`}
          helper="tracked PRs"
        />
        <StatTile
          icon={<Activity className="h-5 w-5 text-green-400" />}
          label="Muscle Groups"
          value={`${Object.keys(realData.muscleDistribution || {}).length}`}
          helper="of 7 covered"
        />
      </div>

      {/* Volume Over Time + Weekly Pattern */}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Volume Chart */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Volume Progression</h3>
          </div>

          {(realData.volumeHistory?.length || 0) > 1 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={realData.volumeHistory}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: string) => val.substring(5)}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(2, 6, 23, 0.95)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} lbs`, "Volume"]}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#06b6d4"
                    fillOpacity={1}
                    fill="url(#colorVolume)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl">
              <Dumbbell className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-sm text-muted-foreground">Log more workouts to see volume trends</p>
            </div>
          )}
        </div>

        {/* Weekly Pattern */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            {getTrendIcon(advice.weeklyPattern.trend)}
            <h3 className="font-semibold text-foreground">Training Pattern</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <PatternCard label="Consistency" value={`${advice.weeklyPattern.consistency}%`} />
            <PatternCard label="Avg Frequency" value={`${advice.weeklyPattern.avgFrequency}/week`} />
            <PatternCard label="Total Sessions" value={`${advice.weeklyPattern.totalSessions}`} />
            <PatternCard label="Trend" value={advice.weeklyPattern.trend} />
          </div>

          {/* Personal Records */}
          {(realData.personalRecords?.length || 0) > 0 && (
            <div className="mt-4 rounded-2xl border border-yellow-500/10 bg-yellow-500/5 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-yellow-400 mb-3">
                <Trophy className="h-4 w-4" />
                Personal Records
              </h4>
              <div className="space-y-2">
                {realData.personalRecords.slice(0, 5).map((pr, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground capitalize">{pr.exercise}</span>
                    <span className="text-sm font-bold text-yellow-400">
                      {pr.weight} lbs × {pr.reps}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI Insights</h2>
          <span className="text-xs text-muted-foreground">Based on your real workout data</span>
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
                      {insight.current} {insight.unit}
                    </span>
                    <span>
                      Target {insight.target} {insight.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(
                          100,
                          insight.target > 0 ? Math.round((insight.current / insight.target) * 100) : 0
                        )}%`,
                      }}
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

      {/* Recommendations */}
      <div className="stat-card">
        <div className="mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400" />
          <h3 className="font-semibold text-foreground">Top Recommendations</h3>
        </div>

        <div className="space-y-3">
          {advice.topRecommendations.map((rec) => (
            <div key={rec.rank} className="rounded-2xl border border-white/5 bg-secondary/40 p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">
                  {rec.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-foreground">{rec.title}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${impactTone(rec.impact)}`}>
                      {rec.impact} impact
                    </span>
                    <span className="text-xs text-muted-foreground">{rec.timeframe}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{rec.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Subcomponents ────────────────────────────────────────────────────────────

const StatTile = ({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
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
  </div>
);

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

export default FitnessAdvice;
