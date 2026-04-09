import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Dumbbell, Apple, TrendingUp, Droplet, Plus, RefreshCw, Lightbulb, AlertTriangle, CheckCircle2, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import StatCard from "@/components/dashboard/StatCard";
import { useNutrition } from "@/context/NutritionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

// ─── Custom Hook ─────────────────────────────────────────────────────────────
const useAnimatedNumber = (end: number, duration = 1200) => {
  const [displayValue, setDisplayValue] = useState(end);
  const prevEndRef = useRef(end);

  useEffect(() => {
    const start = prevEndRef.current;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      
      setDisplayValue(Math.floor(start + easeProgress * (end - start)));
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
        prevEndRef.current = end;
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [end, duration]);
  
  return displayValue;
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

const SmartAlerts = ({ intake, targets }: any) => {
  const alerts = [];
  if (targets.calories > 0 && (intake.calories / targets.calories) < 0.3) {
    alerts.push({ type: 'warning', text: "You're significantly under your calorie goal" });
  }
  if (targets.protein > 0 && (intake.protein / targets.protein) >= 1) {
    alerts.push({ type: 'success', text: "Great job hitting your protein goal! 💪" });
  }
  if (targets.calories > 0 && (intake.calories / targets.calories) > 1.1) {
    alerts.push({ type: 'warning', text: "You've exceeded your calorie goal" });
  }
  if (targets.fats > 0 && (intake.fats / targets.fats) > 1.2) {
    alerts.push({ type: 'warning', text: "Fats are high today" });
  }

  const topAlerts = alerts.slice(0, 2);
  if (topAlerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-6 animate-fade-in">
      {topAlerts.map((alert, i) => (
        <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${alert.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
          {alert.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <p className="font-medium text-sm">{alert.text}</p>
        </div>
      ))}
    </div>
  );
};

const AITipWidget = () => {
  const { t } = useTranslation();
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTip = useCallback(async () => {
    setLoading(true);
    const user = localStorage.getItem("user");
    if (!user) return;
    try {
      const { id } = JSON.parse(user);
      const res = await api.get(`/api/tip/${id}`);
      setTip(res.data.tip);
    } catch {
      setTip("Keep pushing towards your goals! Every small step counts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTip();
  }, [fetchTip]);

  return (
    <div className="stat-card relative overflow-hidden group h-full flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110" />
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2 text-primary">
          <Lightbulb className="h-5 w-5 fill-primary/20" />
          <h3 className="font-bold font-display">{t("coachTip")}</h3>
        </div>
        <button onClick={fetchTip} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="relative z-10 min-h-[48px] flex items-center flex-1">
        {loading ? (
           <div className="space-y-2 w-full animate-pulse">
             <div className="h-4 bg-secondary rounded w-full" />
             <div className="h-4 bg-secondary rounded w-4/5" />
           </div>
        ) : (
          <p className="text-sm text-foreground/90 font-medium leading-relaxed italic border-l-2 border-primary/50 pl-4 py-1">
            "{tip}"
          </p>
        )}
      </div>
    </div>
  );
};

const StreakWidget = ({ streak }: { streak: number }) => {
  const { t } = useTranslation();
  const animatedStreak = useAnimatedNumber(streak);
  
  return (
    <div className="stat-card flex items-center gap-5 justify-between bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 h-full">
      <div className="space-y-1">
        <h3 className="font-bold font-display text-foreground text-lg">{t("currentStreak")}</h3>
        <p className="text-sm text-foreground/80">
          {streak > 0 ? t("dayStreak", { count: streak }) : t("startStreak")}
        </p>
      </div>
      <div className="h-16 w-16 bg-orange-500/20 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
        <span className="text-3xl font-black text-orange-500 group-hover:scale-110 transition-transform flex items-center gap-1">
          {animatedStreak}
        </span>
      </div>
    </div>
  );
};

const WaterWidget = ({ water, onUpdateWater }: { water: number, onUpdateWater: (amt: number) => void }) => {
  const { t } = useTranslation();
  const [customAmount, setCustomAmount] = useState("");
  const goal = 2500;
  const animatedWater = useAnimatedNumber(water);
  const percentage = Math.min((water / goal) * 100, 100);

  const handleCustomAdd = () => {
    const amt = parseInt(customAmount);
    if (!isNaN(amt) && amt !== 0) {
      onUpdateWater(amt);
      setCustomAmount("");
    }
  };

  return (
    <div className="stat-card flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-blue-500">
          <Droplet className="h-5 w-5 fill-blue-500/20" />
          <h3 className="font-bold font-display text-foreground">{t("hydration")}</h3>
        </div>
        <span className="text-xs font-medium bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">
          {t("glasses", { count: Math.floor(water / 250) })}
        </span>
      </div>
      
      {/* Animated Drop / Progress */}
      <div className="relative h-4 bg-secondary rounded-full overflow-hidden mb-6 mt-auto">
        <div 
          className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-1000 ease-out" 
          style={{ width: `${percentage}%` }} 
        />
      </div>
      
      <div className="flex items-end justify-between mb-4">
        <div>
          <span className="text-2xl font-bold">{animatedWater}</span>
          <span className="text-muted-foreground ml-1">/ {goal} ml</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Button variant="outline" size="sm" onClick={() => onUpdateWater(-250)} className="text-xs bg-secondary/50 border-border hover:bg-red-500 hover:text-white transition-colors px-0">
          -250ml
        </Button>
        <Button variant="outline" size="sm" onClick={() => onUpdateWater(250)} className="text-xs bg-secondary/50 border-border hover:bg-blue-500 hover:text-white transition-colors px-0">
          +250ml
        </Button>
        <Button variant="outline" size="sm" onClick={() => onUpdateWater(500)} className="text-xs bg-secondary/50 border-border hover:bg-blue-500 hover:text-white transition-colors px-0">
          +500ml
        </Button>
        <div className="flex gap-1 relative overflow-hidden group">
          <Input 
            value={customAmount} 
            onChange={(e) => setCustomAmount(e.target.value)} 
            placeholder="±ml" 
            className="h-8 text-xs px-1 text-center" 
          />
          <button onClick={handleCustomAdd} className="bg-primary/20 hover:bg-primary text-primary hover:text-white transition-colors px-2 rounded-md">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

const RadialRing = ({ name, current, target, color }: { name: string; current: number; target: number; color: string }) => {
  const percentage = Math.min((current / target) * 100 || 0, 100);
  const data = [{ name, value: percentage, fill: color }];
  const animatedCurrent = useAnimatedNumber(current);

  return (
    <div className="flex flex-col items-center">
      <div className="h-28 w-28 md:h-32 md:w-32 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar 
              background={{ fill: "hsl(var(--secondary))" }} 
              dataKey="value" 
              cornerRadius={10} 
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="font-bold text-lg text-foreground">{animatedCurrent}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{name}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 font-medium">{current} / {target}</p>
    </div>
  );
};

const NutritionHistoryWidget = ({ targets }: { targets: any }) => {
  const { t } = useTranslation();
  const [days, setDays] = useState("7");
  const [history, setHistory] = useState<any[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const { id } = JSON.parse(userStr);
          const res = await api.get(`/api/profile/${id}/history?days=${days}`);
          setHistory(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [days]);

  const toggleExpand = (date: string) => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  const getStatusColor = (calories: number) => {
    if (!targets.calories) return "text-foreground";
    const ratio = calories / targets.calories;
    if (ratio > 1.1) return "text-red-500 font-bold";
    if (ratio < 0.9) return "text-yellow-500 font-bold";
    return "text-green-500 font-bold";
  };

  return (
    <div className="stat-card col-span-1 lg:col-span-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-semibold font-display text-foreground">{t("nutritionHistory")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("trackConsistency")}</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-11 w-[170px] rounded-xl border-primary/20 bg-gradient-to-b from-secondary/90 to-secondary/60 px-4 text-sm font-semibold text-foreground shadow-[0_10px_30px_rgba(8,145,178,0.12)] transition-colors hover:border-primary/35 hover:bg-secondary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/70 bg-card/95 backdrop-blur-md shadow-2xl">
            <SelectItem className="rounded-lg py-2.5 font-medium" value="7">{t("last7Days")}</SelectItem>
            <SelectItem className="rounded-lg py-2.5 font-medium" value="14">{t("last14Days")}</SelectItem>
            <SelectItem className="rounded-lg py-2.5 font-medium" value="30">{t("last30Days")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border">
          <Calendar className="h-10 w-10 mb-2 opacity-20" />
          <p>{t("noHistoricalData")}</p>
          <p className="text-xs mt-1">{t("dataSavedNightly")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-secondary/10 p-4 rounded-xl border border-border/50">
              <h4 className="text-sm font-medium mb-4">{t("caloricIntake")}</h4>
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(val) => val.substring(5)} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="calories" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-64 bg-secondary/10 p-4 rounded-xl border border-border/50">
              <h4 className="text-sm font-medium mb-4">{t("proteinIntakeG")}</h4>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(val) => val.substring(5)} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }}
                  />
                  <Bar dataKey="protein" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("date")}</th>
                    <th className="px-4 py-3 font-medium">{t("calories")}</th>
                    <th className="px-4 py-3 font-medium">{t("protein")}</th>
                    <th className="px-4 py-3 font-medium">{t("carbs")}</th>
                    <th className="px-4 py-3 font-medium">{t("fats")}</th>
                    <th className="px-4 py-3 font-medium">{t("water")}</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.slice().reverse().map((day) => (
                    <tr key={`wrap-${day.date}`} className="hover:bg-secondary/10 transition-colors group">
                      <td colSpan={7} className="p-0">
                        <div 
                           className="flex items-center w-full px-4 py-3 cursor-pointer border-b border-border/50"
                           onClick={() => toggleExpand(day.date)}
                        >
                          <div className="flex-1 font-medium">{day.date}</div>
                          <div className={`flex-1 ${getStatusColor(day.calories)}`}>{day.calories} <span className="text-xs text-muted-foreground font-normal">kcal</span></div>
                          <div className="flex-1 text-green-500">{day.protein}g</div>
                          <div className="flex-1 text-yellow-500">{day.carbs}g</div>
                          <div className="flex-1 text-red-500">{day.fats}g</div>
                          <div className="flex-1 text-blue-500">{day.water || 0}ml</div>
                          <div className="w-8 text-right">
                            {expandedDate === day.date ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground inline" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                            )}
                          </div>
                        </div>
                        {expandedDate === day.date && (
                            <div className="bg-secondary/10 px-4 py-4 border-b border-border/50">
                              <h5 className="text-xs font-bold text-muted-foreground mb-3 tracking-wider uppercase">{t("foodsLogged")}</h5>
                              {day.foods && day.foods.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {day.foods.map((f: any, i: number) => (
                                    <div key={i} className="bg-background border border-border p-3 rounded-lg flex justify-between items-center">
                                      <div className="overflow-hidden">
                                        <p className="font-medium text-sm truncate pr-2">{f.name}</p>
                                        <p className="text-xs text-muted-foreground">{f.quantity} {f.unit}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-primary">{f.calories} <span className="text-[10px] font-normal text-muted-foreground">kcal</span></p>
                                        <p className="text-[10px] text-muted-foreground gap-1 flex">
                                          <span className="text-green-500">{f.protein}p</span>
                                          <span className="text-yellow-500">{f.carbs}c</span>
                                          <span className="text-red-500">{f.fats}f</span>
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">{t("noSpecificFoodsTracking")}</p>
                              )}
                            </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const Dashboard = () => {
  const { t } = useTranslation();
  // Shared nutrition state
  const { intake, targets, dailyWater, currentStreak, updateWater } = useNutrition();
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
    }
  }, [navigate]);

  // Animated versions for the top StatCards
  const animatedCalories = useAnimatedNumber(intake.calories);
  const animatedProtein = useAnimatedNumber(intake.protein);
  const animatedWorkouts = useAnimatedNumber(5);
  const animatedVolume = useAnimatedNumber(70200);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-8">
      <div>
        <h1 data-page-title-anchor className="text-2xl md:text-3xl font-bold font-display text-foreground">{t("dashboardTitle")}</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">{t("dailyFitnessOverview")}</p>
      </div>

      <SmartAlerts intake={intake} targets={targets} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title={t("todaysCalories")}
          value={animatedCalories.toString()}
          subtitle={t("ofTarget", { value: targets.calories })}
          icon={<Flame className="h-5 w-5 md:h-6 md:w-6" />}
          variant="primary"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title={t("proteinIntake")}
          value={`${animatedProtein}g`}
          subtitle={t("ofTarget", { value: targets.protein })}
          icon={<Apple className="h-5 w-5 md:h-6 md:w-6" />}
          variant="accent"
        />
        <StatCard
          title={t("workoutsThisWeek")}
          value={animatedWorkouts.toString()}
          subtitle={t("sessionsCompleted")}
          icon={<Dumbbell className="h-5 w-5 md:h-6 md:w-6" />}
          variant="primary"
          trend={{ value: 25, isPositive: true }}
        />
        <StatCard
          title={t("weeklyVolume")}
          value={animatedVolume.toLocaleString()}
          subtitle={t("lbsLifted")}
          icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
          variant="warning"
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* New Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <AITipWidget />
        <StreakWidget streak={currentStreak} />
        <WaterWidget water={dailyWater} onUpdateWater={updateWater} />
      </div>

      {/* Progress Section */}
      <div className="stat-card">
        <h3 className="text-base md:text-lg font-semibold font-display text-foreground mb-4 md:mb-6">
          {t("macroTargets")}
        </h3>
        
        {/* Replaced linear bars with Radial Rings */}
        <div className="flex flex-wrap items-center justify-around gap-4 md:gap-8">
          <RadialRing 
            name={t("calories")} 
            current={intake.calories} 
            target={targets.calories} 
            color="hsl(var(--primary))" 
          />
          <RadialRing 
            name={t("protein")} 
            current={intake.protein} 
            target={targets.protein} 
            color="#22c55e" 
          />
          <RadialRing 
            name={t("carbs")} 
            current={intake.carbs} 
            target={targets.carbs} 
            color="#eab308" 
          />
          <RadialRing 
            name={t("fats")} 
            current={intake.fats} 
            target={targets.fats} 
            color="#ef4444" 
          />
        </div>
      </div>

      {/* Historical Array Tracker Matrix */}
      <NutritionHistoryWidget targets={targets} />

    </div>
  );
};

export default Dashboard;
