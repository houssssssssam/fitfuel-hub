import { cn } from "@/lib/utils";

interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  variant?: "primary" | "accent" | "warning" | "destructive";
}

const ProgressBar = ({ label, current, target, unit = "", variant = "primary" }: ProgressBarProps) => {
  const percentage = Math.min((current / target) * 100, 100);
  
  const variantStyles = {
    primary: "bg-primary",
    accent: "bg-accent",
    warning: "bg-warning",
    destructive: "bg-destructive",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {current}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
