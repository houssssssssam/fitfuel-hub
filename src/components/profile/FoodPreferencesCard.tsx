import { useState } from "react";
import { Plus, Salad, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DietaryPreferences = {
  diet: string;
  allergies: string[];
  dislikes: string;
};

const DIET_OPTIONS = [
  { value: "none", label: "No restrictions" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "keto", label: "Keto / low carb" },
  { value: "gluten-free", label: "Gluten-free" },
];

const COMMON_ALLERGIES = ["Peanuts", "Tree nuts", "Dairy / lactose", "Gluten", "Eggs", "Shellfish", "Fish", "Soy", "Sesame"];
const MAX_ALLERGIES = 15;

type Props = {
  value: DietaryPreferences;
  onChange: (value: DietaryPreferences) => void;
};

export default function FoodPreferencesCard({ value, onChange }: Props) {
  const [customAllergy, setCustomAllergy] = useState("");
  const hasAllergy = (name: string) => value.allergies.some((item) => item.toLowerCase() === name.toLowerCase());

  const toggleAllergy = (name: string) => {
    onChange({
      ...value,
      allergies: hasAllergy(name)
        ? value.allergies.filter((item) => item.toLowerCase() !== name.toLowerCase())
        : [...value.allergies, name].slice(0, MAX_ALLERGIES),
    });
  };

  const addCustomAllergy = () => {
    const name = customAllergy.trim().slice(0, 40);
    if (!name) return;
    if (!hasAllergy(name)) {
      onChange({ ...value, allergies: [...value.allergies, name].slice(0, MAX_ALLERGIES) });
    }
    setCustomAllergy("");
  };

  const customAllergies = value.allergies.filter(
    (item) => !COMMON_ALLERGIES.some((common) => common.toLowerCase() === item.toLowerCase()),
  );

  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-1">
        <Salad className="h-5 w-5 text-primary" />
        <h2 className="text-base md:text-lg font-semibold font-display text-foreground">Food Preferences</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4 md:mb-6">
        FuelBot, meal suggestions, the weekly plan and nutrition advice follow these.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Diet</Label>
            <Select value={value.diet} onValueChange={(diet) => onChange({ ...value, diet })}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {DIET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Foods you don't like</Label>
            <Input
              value={value.dislikes}
              maxLength={200}
              placeholder="e.g. mushrooms, olives, liver"
              onChange={(event) => onChange({ ...value, dislikes: event.target.value })}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Allergies & intolerances</Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGIES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleAllergy(name)}
                aria-pressed={hasAllergy(name)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  hasAllergy(name)
                    ? "border-destructive/60 bg-destructive/15 text-destructive"
                    : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {name}
              </button>
            ))}
            {customAllergies.map((name) => (
              <span
                key={name}
                className="flex items-center gap-1 rounded-full border border-destructive/60 bg-destructive/15 pl-3 pr-1.5 py-1 text-xs font-medium text-destructive"
              >
                {name}
                <button type="button" onClick={() => toggleAllergy(name)} aria-label={`Remove ${name}`} className="rounded-full p-0.5 hover:bg-destructive/20">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Input
              value={customAllergy}
              maxLength={40}
              placeholder="Add another…"
              onChange={(event) => setCustomAllergy(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomAllergy();
                }
              }}
              className="bg-secondary border-border h-9 text-sm"
            />
            <button
              type="button"
              onClick={addCustomAllergy}
              disabled={!customAllergy.trim() || value.allergies.length >= MAX_ALLERGIES}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-40"
              aria-label="Add allergy"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
