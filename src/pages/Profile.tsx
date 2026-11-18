import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BadgeCheck, Calendar, Download, Dumbbell, Flame, Loader2, Save, Target, Trophy, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { getStoredUser, storeUser } from "@/lib/auth";
import { type NutritionTargets, calculateTargets, isValidTargetInputs } from "@/lib/nutrition";
import {
  type UnitSystem,
  cmToFeetInches,
  feetInchesToCm,
  formatVolume,
  fromDisplayWeight,
  toDisplayWeight,
  useUnits,
  weightUnit,
} from "@/lib/units";
import ChangeEmailDialog from "@/components/profile/ChangeEmailDialog";
import MacroTargetsEditor from "@/components/profile/MacroTargetsEditor";
import FoodPreferencesCard, { type DietaryPreferences } from "@/components/profile/FoodPreferencesCard";

type ProfileResponse = {
  name: string;
  email: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  activityLevel?: string;
  fitnessGoal?: string;
  goal?: string;
  targetWeight?: number | null;
  createdAt?: string;
  currentStreak?: number;
  workouts?: { totalVolume?: number }[];
  nutritionTargets?: Partial<NutritionTargets>;
  dietaryPreferences?: Partial<DietaryPreferences>;
};

/** What the user edits. Body measurements are text in the user's display units. */
type FormState = {
  name: string;
  age: string;
  weight: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  targetWeight: string;
  gender: string;
  activityLevel: string;
  fitnessGoal: string;
  targets: NutritionTargets;
  diet: DietaryPreferences;
};

const DEFAULT_TARGETS: NutritionTargets = { calories: 2500, protein: 180, carbs: 270, fats: 70 };

const parseNumber = (value: string) => {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
};

const toFormState = (data: ProfileResponse, units: UnitSystem): FormState => {
  const height = data.height || 0;
  const { feet, inches } = cmToFeetInches(height);
  return {
    name: data.name || "",
    age: data.age ? String(data.age) : "",
    weight: data.weight ? String(toDisplayWeight(data.weight, units)) : "",
    heightCm: height ? String(Math.round(height)) : "",
    heightFt: height ? String(feet) : "",
    heightIn: height ? String(inches) : "",
    targetWeight: data.targetWeight ? String(toDisplayWeight(data.targetWeight, units)) : "",
    gender: data.gender || "Male",
    activityLevel: data.activityLevel || "Sedentary",
    fitnessGoal: data.fitnessGoal || data.goal || "Lose Weight",
    targets: {
      calories: data.nutritionTargets?.calories ?? DEFAULT_TARGETS.calories,
      protein: data.nutritionTargets?.protein ?? DEFAULT_TARGETS.protein,
      carbs: data.nutritionTargets?.carbs ?? DEFAULT_TARGETS.carbs,
      fats: data.nutritionTargets?.fats ?? DEFAULT_TARGETS.fats,
    },
    diet: {
      diet: data.dietaryPreferences?.diet || "none",
      allergies: data.dietaryPreferences?.allergies || [],
      dislikes: data.dietaryPreferences?.dislikes || "",
    },
  };
};

/** Body stats in metric (kg, cm) from the form, whatever the display units. */
const readBodyStats = (form: FormState, units: UnitSystem) => {
  const weightValue = parseNumber(form.weight);
  const targetWeightValue = parseNumber(form.targetWeight);
  const heightCm = units === "imperial"
    ? (() => {
      const feet = parseNumber(form.heightFt) ?? 0;
      const inches = Number(form.heightIn.replace(",", ".")) || 0;
      return feet > 0 ? feetInchesToCm(feet, inches) : null;
    })()
    : parseNumber(form.heightCm);

  return {
    age: parseNumber(form.age),
    weight: weightValue === null ? null : Math.round(fromDisplayWeight(weightValue, units) * 10) / 10,
    height: heightCm === null ? null : Math.round(heightCm),
    targetWeight: targetWeightValue === null ? null : Math.round(fromDisplayWeight(targetWeightValue, units) * 10) / 10,
  };
};

const GOAL_OPTIONS = [
  { value: "Lose Weight", label: "Cut (Lose Fat)" },
  { value: "Maintain Weight", label: "Maintain" },
  { value: "Build Muscle", label: "Bulk (Build Muscle)" },
  { value: "Improve Fitness", label: "Body Recomposition" },
];

const ACTIVITY_OPTIONS = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Extremely Active"];

const Profile = () => {
  const { t } = useTranslation();
  const units = useUnits();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  useEffect(() => {
    const id = getStoredUser()?.id;
    if (!id) {
      setLoading(false);
      return;
    }

    void api
      .get<ProfileResponse>(`/api/profile/${id}`)
      .then((res) => setData(res.data))
      .catch(() => toast.error("Couldn't load your profile"))
      .finally(() => setLoading(false));
  }, []);

  // (Re)build the form from server data, and whenever the display units change.
  useEffect(() => {
    if (!data) return;
    const next = toFormState(data, units);
    setForm(next);
    setSaved(next);
  }, [data, units]);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  if (loading || !form || !data || !saved) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  const update = (changes: Partial<FormState>) => setForm({ ...form, ...changes });

  const body = readBodyStats(form, units);
  const targetInputs = {
    age: body.age ?? undefined,
    weight: body.weight ?? undefined,
    height: body.height ?? undefined,
    gender: form.gender,
    activityLevel: form.activityLevel,
    fitnessGoal: form.fitnessGoal,
  };
  const canRecalculate = isValidTargetInputs(targetInputs);
  const targetsChanged = JSON.stringify(form.targets) !== JSON.stringify(saved.targets);
  const bodyChanged = ["weight", "heightCm", "heightFt", "heightIn", "age", "gender", "activityLevel", "fitnessGoal"].some(
    (key) => form[key as keyof FormState] !== saved[key as keyof FormState],
  );
  const targetsOutdated = bodyChanged && !targetsChanged && canRecalculate;

  const handleRecalculate = () => {
    if (!isValidTargetInputs(targetInputs)) {
      toast.error("Fill in your age, weight and height first.");
      return;
    }
    update({ targets: calculateTargets(targetInputs) });
    toast.success("Targets recalculated. Review them, then save.");
  };

  const handleSave = async () => {
    const id = getStoredUser()?.id;
    if (!id) return;
    if (!form.name.trim()) {
      toast.error("Name can't be empty.");
      return;
    }
    if (form.targets.calories < 800) {
      toast.error("Daily calories must be at least 800 kcal.");
      return;
    }

    setSaving(true);
    try {
      const { data: updated } = await api.put<ProfileResponse>(`/api/profile/${id}`, {
        name: form.name.trim(),
        age: body.age ?? undefined,
        weight: body.weight ?? undefined,
        height: body.height ?? undefined,
        gender: form.gender,
        activityLevel: form.activityLevel,
        fitnessGoal: form.fitnessGoal,
        goal: form.fitnessGoal,
        targetWeight: body.targetWeight,
        nutritionTargets: form.targets,
        dietaryPreferences: form.diet,
      });
      setData(updated);

      const stored = getStoredUser();
      if (stored) {
        storeUser({ ...stored, name: updated.name });
        window.dispatchEvent(new Event("userupdated"));
      }
      toast.success("Profile saved");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save your profile");
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChanged = (email: string) => {
    setData({ ...data, email });
    const stored = getStoredUser();
    if (stored) {
      storeUser({ ...stored, email });
      window.dispatchEvent(new Event("userupdated"));
    }
  };

  const rawVolume = data.workouts?.reduce((sum, workout) => sum + (workout.totalVolume || 0), 0) || 0;
  const streak = data.currentStreak || 0;
  const stats = {
    memberSince: data.createdAt
      ? new Date(data.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : "—",
    totalWorkouts: data.workouts?.length || 0,
    totalVolume: formatVolume(rawVolume, units),
    streak: `${streak} ${streak === 1 ? "day" : "days"}`,
  };

  const unit = weightUnit(units);

  return (
    <div className={`space-y-6 md:space-y-8 animate-fade-in ${isDirty ? "pb-24" : ""}`}>
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
          <p className="text-lg md:text-2xl font-bold font-display text-foreground">{stats.streak}</p>
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
              <Input
                value={form.name}
                maxLength={60}
                onChange={(e) => update({ name: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{t("email")}</Label>
              <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 h-10">
                <span className="flex-1 truncate text-sm text-foreground">{data.email}</span>
                <span className="flex items-center gap-1 text-[11px] font-medium text-green-400 shrink-0">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
                <button
                  type="button"
                  onClick={() => setEmailDialogOpen(true)}
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                >
                  Change
                </button>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm">{t("age")}</Label>
                <Input
                  type="number"
                  min={10}
                  max={120}
                  value={form.age}
                  onChange={(e) => update({ age: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Weight ({unit})</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => update({ weight: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Height ({units === "imperial" ? "ft / in" : "cm"})</Label>
                {units === "imperial" ? (
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      min={3}
                      max={8}
                      value={form.heightFt}
                      onChange={(e) => update({ heightFt: e.target.value })}
                      className="bg-secondary border-border px-2"
                      aria-label="Feet"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={11}
                      value={form.heightIn}
                      onChange={(e) => update({ heightIn: e.target.value })}
                      className="bg-secondary border-border px-2"
                      aria-label="Inches"
                    />
                  </div>
                ) : (
                  <Input
                    type="number"
                    value={form.heightCm}
                    onChange={(e) => update({ heightCm: e.target.value })}
                    className="bg-secondary border-border"
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm">{t("gender")}</Label>
                <Select value={form.gender} onValueChange={(value) => update({ gender: value })}>
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
                <Select value={form.activityLevel} onValueChange={(value) => update({ activityLevel: value })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {ACTIVITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm">{t("fitnessGoal")}</Label>
                <Select value={form.fitnessGoal} onValueChange={(value) => update({ fitnessGoal: value })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {GOAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Target weight ({unit})</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Optional"
                  value={form.targetWeight}
                  onChange={(e) => update({ targetWeight: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            {body.targetWeight !== null && body.weight !== null && (
              <p className="text-xs text-muted-foreground -mt-1">
                {Math.abs(body.targetWeight - body.weight) < 0.1
                  ? "You're at your target weight."
                  : `${toDisplayWeight(Math.abs(body.targetWeight - body.weight), units)} ${unit} to ${body.targetWeight < body.weight ? "lose" : "gain"}.`}
              </p>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-base md:text-lg font-semibold font-display text-foreground">{t("dailyNutritionTargets")}</h2>
          </div>
          <MacroTargetsEditor
            targets={form.targets}
            onChange={(targets) => update({ targets })}
            onRecalculate={handleRecalculate}
            canRecalculate={canRecalculate}
            outdated={targetsOutdated}
          />
        </div>
      </div>

      <FoodPreferencesCard value={form.diet} onChange={(diet) => update({ diet })} />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Download className="h-3.5 w-3.5" />
        Want a copy of your data?{" "}
        <Link to="/settings?section=data" className="text-primary hover:underline">
          Export it from Settings → Data & Storage
        </Link>
      </p>

      {/* Rendered at the document root: the page's fade-in animation leaves a transform
          on its wrapper, which would pin this bar to the page instead of the screen. */}
      {isDirty && createPortal(
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-xl animate-in fade-in slide-in-from-bottom-4 sm:bottom-6 max-sm:bottom-24">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-2xl">
            <p className="flex-1 text-sm text-foreground">You have unsaved changes</p>
            <Button variant="ghost" size="sm" onClick={() => setForm(saved)} disabled={saving}>
              Discard
            </Button>
            <Button variant="gradient" size="sm" onClick={() => void handleSave()} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </div>,
        document.body,
      )}

      <ChangeEmailDialog
        open={emailDialogOpen}
        currentEmail={data.email}
        onOpenChange={setEmailDialogOpen}
        onChanged={handleEmailChanged}
      />
    </div>
  );
};

export default Profile;
