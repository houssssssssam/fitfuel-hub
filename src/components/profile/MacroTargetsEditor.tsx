import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  KCAL_PER_GRAM,
  MACRO_PRESETS,
  type MacroKey,
  type NutritionTargets,
  calorieMismatch,
  caloriesFromGrams,
  gramsFromPercents,
  percentsFromGrams,
  rebalancePercents,
} from "@/lib/nutrition";

type Props = {
  targets: NutritionTargets;
  onChange: (targets: NutritionTargets) => void;
  onRecalculate: () => void;
  canRecalculate: boolean;
  outdated: boolean;
};

const MACROS: { key: MacroKey; label: string; color: string; bar: string }[] = [
  { key: "protein", label: "Protein", color: "text-green-400", bar: "bg-green-500" },
  { key: "carbs", label: "Carbs", color: "text-yellow-400", bar: "bg-yellow-500" },
  { key: "fats", label: "Fats", color: "text-red-400", bar: "bg-red-500" },
];

const toInt = (value: string) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

export default function MacroTargetsEditor({ targets, onChange, onRecalculate, canRecalculate, outdated }: Props) {
  const percents = percentsFromGrams(targets);
  const macroCalories = caloriesFromGrams(targets);
  const mismatch = calorieMismatch(targets);
  const isBalanced = targets.calories > 0 && Math.abs(mismatch) <= 0.02;
  const activePreset = MACRO_PRESETS.find(
    (preset) =>
      Math.abs(preset.percents.protein - percents.protein) <= 1
      && Math.abs(preset.percents.carbs - percents.carbs) <= 1
      && Math.abs(preset.percents.fats - percents.fats) <= 1,
  )?.id;

  // Calories change: keep the same split, scale the grams.
  const setCalories = (calories: number) => {
    // While the field is being retyped (empty or 0), keep the grams so the split isn't lost.
    if (calories <= 0) {
      onChange({ ...targets, calories });
      return;
    }
    onChange({ calories, ...gramsFromPercents(calories, percents) });
  };

  // Percent change: rebalance the other macros so the split stays at 100%.
  const setPercent = (key: MacroKey, value: number) => {
    const next = rebalancePercents(percents, key, value);
    onChange({ calories: targets.calories, ...gramsFromPercents(targets.calories, next) });
  };

  // Grams change: keep the typed grams, rebalance the others to fit the calorie target.
  const setGrams = (key: MacroKey, grams: number) => {
    if (targets.calories <= 0) {
      onChange({ ...targets, [key]: grams });
      return;
    }
    const percent = (grams * KCAL_PER_GRAM[key] * 100) / targets.calories;
    const next = rebalancePercents(percents, key, percent);
    const rebalanced = gramsFromPercents(targets.calories, next);
    const maxGrams = Math.floor(targets.calories / KCAL_PER_GRAM[key]);
    onChange({ calories: targets.calories, ...rebalanced, [key]: Math.min(grams, maxGrams) });
  };

  return (
    <div className="space-y-5">
      {outdated && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">Your targets may be out of date</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Your weight, activity or goal changed since these targets were set.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onRecalculate} className="shrink-0 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Recalculate
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm">Daily calories</Label>
          <button
            type="button"
            onClick={onRecalculate}
            disabled={!canRecalculate}
            title={canRecalculate ? "Calculate from your age, weight, height, activity and goal" : "Fill in age, weight and height first"}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recalculate from my profile
          </button>
        </div>
        <div className="relative">
          <Input
            type="number"
            min={800}
            max={10000}
            value={targets.calories || ""}
            onChange={(event) => setCalories(toInt(event.target.value))}
            className="bg-secondary border-border pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kcal</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Macro split</Label>
        <div className="flex flex-wrap gap-2">
          {MACRO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange({ calories: targets.calories, ...gramsFromPercents(targets.calories, preset.percents) })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activePreset === preset.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {preset.label}
              <span className="ml-1 opacity-70">
                {preset.percents.protein}/{preset.percents.carbs}/{preset.percents.fats}
              </span>
            </button>
          ))}
        </div>

        <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary mt-3">
          {MACROS.map((macro) => (
            <div
              key={macro.key}
              className={cn("h-full transition-all duration-300", macro.bar)}
              style={{ width: `${percents[macro.key]}%` }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {MACROS.map((macro) => (
          <div key={macro.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className={cn("text-sm font-semibold", macro.color)}>{macro.label}</Label>
              <span className="text-xs text-muted-foreground">
                {targets[macro.key] * KCAL_PER_GRAM[macro.key]} kcal
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Slider
                value={[percents[macro.key]]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => setPercent(macro.key, value)}
                className="flex-1"
                aria-label={`${macro.label} percentage`}
              />
              <div className="relative w-[4.5rem] shrink-0">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={percents[macro.key]}
                  onChange={(event) => setPercent(macro.key, toInt(event.target.value))}
                  className="bg-secondary border-border pr-6 h-9 text-sm"
                  aria-label={`${macro.label} percent`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <div className="relative w-[5rem] shrink-0">
                <Input
                  type="number"
                  min={0}
                  value={targets[macro.key]}
                  onChange={(event) => setGrams(macro.key, toInt(event.target.value))}
                  className="bg-secondary border-border pr-6 h-9 text-sm"
                  aria-label={`${macro.label} grams`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">g</span>
              </div>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">
          Changing protein or fats adjusts carbs (and changing carbs adjusts fats) so the split always adds up to 100% of your calories.
        </p>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs",
          isBalanced ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-warning/40 bg-warning/10 text-warning",
        )}
      >
        {isBalanced ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
        <span>
          {targets.protein} g P × 4 + {targets.carbs} g C × 4 + {targets.fats} g F × 9 ={" "}
          <strong>{macroCalories.toLocaleString()} kcal</strong>
          {targets.calories <= 0
            ? " — enter your daily calories"
            : isBalanced
              ? " — matches your calorie target"
              : ` — ${Math.abs(Math.round(mismatch * 100))}% ${mismatch > 0 ? "above" : "below"} your ${targets.calories.toLocaleString()} kcal target`}
        </span>
      </div>
    </div>
  );
}
