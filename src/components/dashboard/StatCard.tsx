import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "accent" | "warning";
}

const StatCard = ({ title, value, subtitle, icon, trend, variant = "default" }: StatCardProps) => {
  const variantStyles = {
    default: "border-border/50 hover:border-primary/30",
    primary: "border-primary/30 hover:border-primary/50",
    accent: "border-accent/30 hover:border-accent/50",
    warning: "border-warning/30 hover:border-warning/50",
  };

  const iconStyles = {
    default: "bg-secondary text-muted-foreground",
    primary: "bg-primary/20 text-primary",
    accent: "bg-accent/20 text-accent",
    warning: "bg-warning/20 text-warning",
  };

  return (
    <div
      className={cn(
        "stat-card group animate-fade-in",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="space-y-1">
            <p className="text-3xl font-bold font-display text-foreground">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.isPositive ? "text-accent" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs last week</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconStyles[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
