import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProgressBar({
  progress,
  className,
  showPercentage = false,
  size = "md",
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full rounded-full bg-white/10", sizeClasses[size])}>
        <div
          className={cn(
            "h-full rounded-full bg-primary-blue transition-[width] duration-300 ease-out",
            clampedProgress === 100 ? "bg-emerald-500" : ""
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <div className="mt-1 text-right">
          <span className="text-xs font-medium text-slate-400">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
}
