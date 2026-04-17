import Image from "next/image";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteLogo({
  siteName,
  logoUrl,
  className,
  iconClassName,
  textClassName,
  compact = false,
}: {
  siteName: string;
  logoUrl?: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  compact?: boolean;
}) {
  const iconShellClassName = cn(
    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-white/95 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950/90",
    compact ? "h-[3rem] w-[3rem]" : "h-[3.75rem] w-[3.75rem]",
    iconClassName
  );

  if (logoUrl) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <span className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden",
          compact ? "h-[3rem] w-[3rem]" : "h-[3.75rem] w-[3.75rem]",
          iconClassName
        )}>
          <Image
            src={logoUrl}
            alt={siteName}
            fill
            quality={75}
            sizes={compact ? "48px" : "60px"}
            priority={compact}
            className="object-contain object-center scale-125 transition-transform duration-300"
          />
        </span>
        <span className={cn("text-sm font-black uppercase tracking-[0.16em]", textClassName)}>
          {siteName}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn(iconShellClassName, "border-primary-blue/20 bg-[radial-gradient(circle_at_30%_30%,#3b82f6,rgba(0,86,210,0.92)_55%,#0f172a)] text-white dark:border-primary-blue/15")}>
        <Brain className={cn("h-5 w-5", compact && "h-4 w-4")} />
      </div>
      <span className={cn("text-sm font-black uppercase tracking-[0.16em]", textClassName)}>
        {siteName}
      </span>
    </div>
  );
}
