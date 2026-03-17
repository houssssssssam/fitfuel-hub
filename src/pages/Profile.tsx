import { User, Mail, Target, Save, Calendar, Trophy, Flame, Dumbbell } from "lucide-react";
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


const Profile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [targets, setTargets] = useState({
    calories: "2800",
    protein: "180",
    carbs: "320",
    fats: "85",
  });

  const stats = {
    memberSince: "January 2026",
    totalWorkouts: 156,
    totalVolume: "2.4M lbs",
    streak: 12,
  };
  useEffect(() => {
  const user = localStorage.getItem("user");
  if (!user) return;

  const parsedUser = JSON.parse(user);
  const userId = parsedUser.id;

  api
    .get(`/api/profile/${userId}`)
    .then((res) => {
      const data = res.data;
      setProfile({
        ...res.data,
        age: res.data.age || "",
        weight: res.data.weight || "",
        height: res.data.height || "",
        gender: res.data.gender || "male",
        activityLevel: res.data.activityLevel || "sedentary",
        goal: res.data.goal || "maintain",
      });
      setTargets({
        calories: data.nutritionTargets?.calories?.toString() || "2800",
        protein: data.nutritionTargets?.protein?.toString() || "180",
        carbs: data.nutritionTargets?.carbs?.toString() || "320",
        fats: data.nutritionTargets?.fats?.toString() || "85",
      });
      setLoading(false);
    })
    .catch(() => setLoading(false));
}, []);


  const handleSaveProfile = async () => {
  try {
    const user = localStorage.getItem("user");
    if (!user) return;

    const parsedUser = JSON.parse(user);
    const userId = parsedUser.id;

    console.log("SENDING PROFILE:", profile);

    await api.put(`/api/profile/${userId}`, profile);

    toast.success("Profile updated successfully!");
  } catch (err) {
    toast.error("Failed to update profile");
  }
};


  const handleSaveTargets = async () => {
  try {
    const user = localStorage.getItem("user");
    if (!user) return;

    const parsedUser = JSON.parse(user);

    await api.put(`/api/profile/${parsedUser.id}`, {
      nutritionTargets: {
        calories: Number(targets.calories),
        protein: Number(targets.protein),
        carbs: Number(targets.carbs),
        fats: Number(targets.fats),
      },
    });

    toast.success("Nutrition targets updated!");
  } catch (error) {
    console.error(error);
    toast.error("Failed to update targets");
  }
};

if (loading || !profile) {
  return <p className="text-center">Loading profile...</p>;
}

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Profile</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Manage your account and fitness settings
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="stat-card text-center py-4 md:py-6">
          <Calendar className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-primary" />
          <p className="text-lg md:text-2xl font-bold font-display text-foreground">{stats.memberSince}</p>
          <p className="text-xs md:text-sm text-muted-foreground">Member Since</p>
        </div>
        <div className="stat-card text-center py-4 md:py-6">
          <Dumbbell className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-accent" />
          <p className="text-lg md:text-2xl font-bold font-display text-foreground">{stats.totalWorkouts}</p>
          <p className="text-xs md:text-sm text-muted-foreground">Total Workouts</p>
        </div>
        <div className="stat-card text-center py-4 md:py-6">
          <Trophy className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-warning" />
          <p className="text-lg md:text-2xl font-bold font-display text-foreground">{stats.totalVolume}</p>
          <p className="text-xs md:text-sm text-muted-foreground">Total Volume</p>
        </div>
        <div className="stat-card text-center py-4 md:py-6">
          <Flame className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-destructive" />
          <p className="text-lg md:text-2xl font-bold font-display text-foreground">{stats.streak} days</p>
          <p className="text-xs md:text-sm text-muted-foreground">Current Streak</p>
        </div>
      </div>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
        {/* Personal Information */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-base md:text-lg font-semibold font-display text-foreground">
              Personal Information
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Full Name</Label>
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
              <Label className="text-sm">Email</Label>
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
                <Label className="text-sm">Age</Label>
                <Input
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Weight (kg)</Label>
                <Input
                  type="number"
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Height (cm)</Label>
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
                <Label className="text-sm">Gender</Label>
                <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Activity Level</Label>
                <Select value={profile.activityLevel} onValueChange={(v) => setProfile({ ...profile, activityLevel: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="sedentary">Sedentary</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="active">Very Active</SelectItem>
                    <SelectItem value="extreme">Extremely Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Fitness Goal</Label>
              <Select value={profile.goal} onValueChange={(v) => setProfile({ ...profile, goal: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="cut">Cut (Lose Fat)</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                  <SelectItem value="bulk">Bulk (Build Muscle)</SelectItem>
                  <SelectItem value="recomp">Body Recomposition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="gradient" className="w-full gap-2" onClick={handleSaveProfile}>
              <Save className="h-4 w-4" />
              Save Profile
            </Button>
          </div>
        </div>

        {/* Nutrition Targets */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-base md:text-lg font-semibold font-display text-foreground">
              Daily Nutrition Targets
            </h2>
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

            <div className="p-3 md:p-4 rounded-lg bg-secondary/50 mt-4 md:mt-6">
              <h4 className="font-medium text-foreground mb-2 text-sm md:text-base">Macro Distribution</h4>
              <div className="space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protein</span>
                  <span className="text-foreground">
                    {Math.round((parseInt(targets.protein) * 4 / parseInt(targets.calories)) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carbs</span>
                  <span className="text-foreground">
                    {Math.round((parseInt(targets.carbs) * 4 / parseInt(targets.calories)) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fats</span>
                  <span className="text-foreground">
                    {Math.round((parseInt(targets.fats) * 9 / parseInt(targets.calories)) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <Button variant="success" className="w-full gap-2" onClick={handleSaveTargets}>
              <Save className="h-4 w-4" />
              Update Targets
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
