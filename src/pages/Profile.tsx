import { User, Mail, Target, Save, Calendar, Trophy, Flame, Dumbbell, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { exportNutritionCSV, exportFoodsCSV, exportWorkoutsCSV } from "@/utils/exportData";
import { useTranslation } from "react-i18next";

type ProfileData = {
  name: string;
  email: string;
  age: string | number;
  weight: string | number;
  height: string | number;
  gender: string;
  activityLevel: string;
  fitnessGoal: string;
  createdAt?: string;
  currentStreak?: number;
  workouts?: { totalVolume?: number }[];
};

const Profile = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState({
    calories: "2800",
    protein: "180",
    carbs: "320",
    fats: "85",
  });

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) return;

    const { id } = JSON.parse(user) as { id: string };

    void api
      .get(`/api/profile/${id}`)
      .then((res) => {
        const data = res.data;
        setProfile({
          ...data,
          age: data.age || "",
          weight: data.weight || "",
          height: data.height || "",
          gender: data.gender || "Male",
          activityLevel: data.activityLevel || "Sedentary",
          fitnessGoal: data.fitnessGoal || data.goal || "Lose Weight",
        });
        setTargets({
          calories: data.nutritionTargets?.calories?.toString() || "2800",
          protein: data.nutritionTargets?.protein?.toString() || "180",
          carbs: data.nutritionTargets?.carbs?.toString() || "320",
          fats: data.nutritionTargets?.fats?.toString() || "85",
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const formatVolume = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString());
  const rawVolume = profile?.workouts?.reduce((sum, workout) => sum + (workout.totalVolume || 0), 0) || 0;
  const stats = {
    memberSince: profile?.createdAt
      ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Unknown",
    totalWorkouts: profile?.workouts?.length || 0,
    totalVolume: `${formatVolume(rawVolume)} lbs`,
    streak: profile?.currentStreak || 0,
  };

  const handleSaveProfile = async () => {
    try {
      const user = localStorage.getItem("user");
      if (!user || !profile) return;

      const { id } = JSON.parse(user) as { id: string };
      await api.put(`/api/profile/${id}`, profile);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    }
  };

  const handleSaveTargets = async () => {
    try {
      const user = localStorage.getItem("user");
      if (!user) return;

      const { id } = JSON.parse(user) as { id: string };
      await api.put(`/api/profile/${id}`, {
        nutritionTargets: {
          calories: Number(targets.calories),
          protein: Number(targets.protein),
          carbs: Number(targets.carbs),
          fats: Number(targets.fats),
        },
      });
      toast.success("Nutrition targets updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update targets");
    }
  };

  const handleExportNutrition = async () => {
    try {
      const user = localStorage.getItem("user");
      if (!user) return;

      const { id } = JSON.parse(user) as { id: string };
      const res = await api.get(`/api/profile/${id}/history?days=90`);
      exportNutritionCSV(res.data || []);
      toast.success("Downloaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export nutrition history");
    }
  };

  const handleExportFoods = async () => {
    try {
      const user = localStorage.getItem("user");
      if (!user) return;

      const { id } = JSON.parse(user) as { id: string };
      const res = await api.get(`/api/profile/${id}`);
      exportFoodsCSV(res.data.foods || []);
      toast.success("Downloaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export food log");
    }
  };

  const handleExportWorkouts = async () => {
    try {
      const user = localStorage.getItem("user");
      if (!user) return;

      const { id } = JSON.parse(user) as { id: string };
      const res = await api.get(`/api/profile/${id}/workouts`);
      exportWorkoutsCSV(res.data || []);
      toast.success("Downloaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export workouts");
    }
  };

  if (loading || !profile) {
    return <p className="text-center">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t("profileTitle")}</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">{t("accountSettings")}</p>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="stat-card text-center py-4 md:py-6">
          <Calendar className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-primary" />
          <p className="text-lg md:text-2xl font-bold font-display text-foreground">{stats.memberSince}</p>
          <p className="text-xs md:text-sm text-muted-foreground">{t("memberSince")}</p>
        </div>
        <div className="stat-card text-center py-4 md:py-6">
          <Dumbbell className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-accent" />
          <p className="text-lg md:text-2xl font-bold font-display text-foreground">{stats.totalWorkouts}</p>
          <p className="text-xs md:text-sm text-muted-foreground">{t("totalWorkouts")}</p>
        </div>
        <div className="stat-card text-center py-4 md:py-6">
          <Trophy className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-warning" />
          <p className="text-lg md:text-2xl font-bold font-display text-foreground">{stats.totalVolume}</p>
          <p className="text-xs md:text-sm text-muted-foreground">{t("totalVolumeKg")}</p>
        </div>
        <div className="stat-card text-center py-4 md:py-6">
          <Flame className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-destructive" />
          <p className="text-lg md:text-2xl font-bold font-display text-foreground">{stats.streak} days</p>
          <p className="text-xs md:text-sm text-muted-foreground">{t("currentStreak")}</p>
        </div>
      </div>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-base md:text-lg font-semibold font-display text-foreground">{t("personalInformation")}</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">{t("fullName")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm">{t("age")}</Label>
                <Input
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t("weightKg")}</Label>
                <Input
                  type="number"
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t("heightCm")}</Label>
                <Input
                  type="number"
                  value={profile.height}
                  onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm">{t("gender")}</Label>
                <Select value={profile.gender} onValueChange={(value) => setProfile({ ...profile, gender: value })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{t("activityLevel")}</Label>
                <Select value={profile.activityLevel} onValueChange={(value) => setProfile({ ...profile, activityLevel: value })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="Sedentary">Sedentary</SelectItem>
                    <SelectItem value="Lightly Active">Lightly Active</SelectItem>
                    <SelectItem value="Moderately Active">Moderately Active</SelectItem>
                    <SelectItem value="Very Active">Very Active</SelectItem>
                    <SelectItem value="Extremely Active">Extremely Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{t("fitnessGoal")}</Label>
              <Select value={profile.fitnessGoal} onValueChange={(value) => setProfile({ ...profile, fitnessGoal: value })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Lose Weight">Cut (Lose Fat)</SelectItem>
                  <SelectItem value="Maintain Weight">Maintain</SelectItem>
                  <SelectItem value="Build Muscle">Bulk (Build Muscle)</SelectItem>
                  <SelectItem value="Improve Fitness">Body Recomposition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="gradient" className="w-full gap-2" onClick={handleSaveProfile}>
              <Save className="h-4 w-4" />
              {t("saveProfile")}
            </Button>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-base md:text-lg font-semibold font-display text-foreground">{t("dailyNutritionTargets")}</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Daily Calories</Label>
              <Input
                type="number"
                value={targets.calories}
                onChange={(e) => setTargets({ ...targets, calories: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Protein (g)</Label>
              <Input
                type="number"
                value={targets.protein}
                onChange={(e) => setTargets({ ...targets, protein: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Carbohydrates (g)</Label>
              <Input
                type="number"
                value={targets.carbs}
                onChange={(e) => setTargets({ ...targets, carbs: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Fats (g)</Label>
              <Input
                type="number"
                value={targets.fats}
                onChange={(e) => setTargets({ ...targets, fats: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <Button variant="success" className="w-full gap-2" onClick={handleSaveTargets}>
              <Save className="h-4 w-4" />
              {t("updateTargets")}
            </Button>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-base md:text-lg font-semibold font-display text-foreground">Export Your Data</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button variant="outline" className="w-full gap-2 justify-between" onClick={handleExportNutrition}>
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Nutrition History</span>
            </div>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">CSV</span>
          </Button>
          <Button variant="outline" className="w-full gap-2 justify-between" onClick={handleExportFoods}>
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Food Log</span>
            </div>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">CSV</span>
          </Button>
          <Button variant="outline" className="w-full gap-2 justify-between" onClick={handleExportWorkouts}>
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Workouts</span>
            </div>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">CSV</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
