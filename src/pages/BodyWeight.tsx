import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowDown, ArrowRight, ArrowUp, Calendar, Info, Loader2, Plus, Scale, Target, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

export default function BodyWeight() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userStr = localStorage.getItem("user");
  const userId = userStr ? JSON.parse(userStr).id : null;

  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [goalWeight, setGoalWeight] = useState<number | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await api.get(`/api/profile/${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });

  const addLog = useMutation({
    mutationFn: async () => {
      await api.post(`/api/profile/${userId}/weight`, { weight: Number(weight), date, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Weight logged successfully.");
      setWeight("");
      setNote("");
    },
    onError: () => toast.error("Failed to log weight"),
  });

  const deleteLog = useMutation({
    mutationFn: async (logId: string) => {
      await api.delete(`/api/profile/${userId}/weight/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Log deleted.");
    },
    onError: () => toast.error("Failed to delete log"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const logs = profile?.weightLogs || [];
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latestWeight = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].weight : profile?.weight || 0;
  const startingWeight = sortedLogs.length > 0 ? sortedLogs[0].weight : profile?.weight || 0;
  const totalChange = latestWeight - startingWeight;

  // Trend logic based on last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLogs = sortedLogs.filter(log => new Date(log.date) >= sevenDaysAgo);
  const trendBase = recentLogs.length > 1 ? recentLogs[0].weight : startingWeight;
  const recentDiff = latestWeight - trendBase;

  const getTrendIcon = () => {
    if (recentDiff < -0.5) return <TrendingDown className="h-4 w-4 text-green-500" />;
    if (recentDiff > 0.5) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <ArrowRight className="h-4 w-4 text-yellow-500" />;
  };

  const getTrendText = () => {
    if (recentDiff < -0.5) return "Losing weight";
    if (recentDiff > 0.5) return "Gaining weight";
    return "Maintaining";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    addLog.mutate();
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 data-page-title-anchor className="text-3xl font-display font-bold text-foreground">{t("bodyWeightTitle")}</h2>
          <p className="text-muted-foreground mt-1">Monitor your body composition over time.</p>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm uppercase tracking-wider">{t("currentWeight")}</span>
          </div>
          <div className="text-4xl font-bold font-display">{latestWeight} <span className="text-xl text-muted-foreground">kg</span></div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-sm uppercase tracking-wider">{t("startingWeight")}</span>
          </div>
          <div className="text-4xl font-bold font-display">{startingWeight} <span className="text-xl text-muted-foreground">kg</span></div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Target className="h-5 w-5 text-purple-500" />
            <span className="font-semibold text-sm uppercase tracking-wider">{t("totalChange")}</span>
          </div>
          <div className="flex items-end gap-2">
            <div className={`text-4xl font-bold font-display ${totalChange < 0 ? 'text-green-500' : totalChange > 0 ? 'text-red-500' : ''}`}>
              {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} <span className="text-xl text-muted-foreground">kg</span>
            </div>
          </div>
        </div>

        <div className="stat-card flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Info className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold text-sm uppercase tracking-wider">7-Day Trend</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center h-10 w-10 rounded-full ${recentDiff < -0.5 ? 'bg-green-500/20' : recentDiff > 0.5 ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
              {getTrendIcon()}
            </div>
            <div className="font-medium text-lg text-foreground">{getTrendText()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CHART SECTION */}
        <div className="lg:col-span-2 stat-card flex flex-col">
          <h3 className="text-xl font-bold text-foreground mb-6">Weight Progression</h3>
          {sortedLogs.length > 1 ? (
            <div className="flex-1 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sortedLogs} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              Not enough data points to generate chart. Log your weight for a few days!
            </div>
          )}
        </div>

        {/* CONTROLS SECTION */}
        <div className="space-y-6">
          <div className="stat-card">
            <h3 className="text-xl font-bold text-foreground mb-4">{t("logWeight")}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  required
                  value={weight} 
                  onChange={e => setWeight(e.target.value)}
                  placeholder="e.g. 72.5"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  required
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Input 
                  type="text" 
                  value={note} 
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Heavy dinner last night"
                  className="bg-secondary/50"
                />
              </div>
              <Button type="submit" disabled={addLog.isPending} className="w-full gap-2">
                {addLog.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save Log
              </Button>
            </form>
          </div>

          <div className="stat-card">
            <h3 className="text-xl font-bold text-foreground mb-4">Goal Tracker</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Target Goal Weight</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    step="0.1"
                    value={goalWeight || ""}
                    onChange={e => setGoalWeight(Number(e.target.value))}
                    placeholder="e.g. 68.0"
                    className="bg-secondary/50"
                  />
                </div>
              </div>
              {goalWeight && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center text-center">
                  <span className="text-muted-foreground text-sm uppercase font-bold tracking-wider mb-1">Distance to Goal</span>
                  <span className="text-2xl font-bold text-primary font-display">{Math.abs(latestWeight - goalWeight).toFixed(1)} kg</span>
                  <span className="text-sm text-muted-foreground mt-1">
                    {goalWeight < latestWeight ? "to lose!" : "to gain!"} Keep pushing.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* HISTORY TABLE */}
      <div className="stat-card">
        <h3 className="text-xl font-bold text-foreground mb-6">Log History</h3>
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Date</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Weight (kg)</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Change</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider hidden sm:table-cell">Note</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...sortedLogs].reverse().map((log, i, arr) => {
                  const prevLog = arr[i + 1]; // Previous chronological element is the NEXT element in the reversed array
                  const diff = prevLog ? (log.weight - prevLog.weight).toFixed(1) : "0.0";
                  const diffNum = Number(diff);
                  return (
                    <tr key={log._id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors group">
                      <td className="py-4 px-4 whitespace-nowrap">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="py-4 px-4 font-bold text-foreground">{log.weight}</td>
                      <td className="py-4 px-4">
                        {diffNum !== 0 ? (
                          <span className={`flex items-center gap-1 text-sm font-medium ${diffNum < 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {diffNum < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                            {Math.abs(diffNum)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm font-medium">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground hidden sm:table-cell">{log.note || "-"}</td>
                      <td className="py-4 px-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteLog.mutate(log._id)}
                          disabled={deleteLog.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-6">No weight history available.</p>
        )}
      </div>

    </div>
  );
}

