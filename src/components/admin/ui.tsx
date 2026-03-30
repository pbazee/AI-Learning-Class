"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
  icon?: ReactNode;
};

export function AdminPageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{children}</div>;
}

export function AdminStatCard({
  label,
  value,
  detail,
  trend,
  trendLabel = "vs previous period",
  accent = "from-blue-600 to-cyan-500",
}: {
  label: string;
  value: string | number;
  detail?: string;
  trend?: number;
  trendLabel?: string;
  accent?: string;
}) {
  const trendTone =
    trend == null
      ? "text-slate-400"
      : trend > 0
        ? "text-emerald-400"
        : trend < 0
          ? "text-rose-400"
          : "text-slate-300";

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl">
      <div className={cn("h-1.5 w-full bg-gradient-to-r", accent)} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          {trend != null ? (
            <span className={cn("rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold", trendTone)}>
              {trend > 0 ? "+" : ""}
              {trend}%
            </span>
          ) : null}
        </div>
        <p className="mt-4 text-3xl font-black tracking-tight text-white">{value}</p>
        {detail ? <p className="mt-2 text-sm text-slate-400">{detail}</p> : null}
        {trend != null ? <p className="mt-3 text-xs text-slate-500">{trendLabel}</p> : null}
      </div>
    </div>
  );
}

export function AdminCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-slate-950/72 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}

export function AdminButton({
  className,
  variant = "primary",
  busy = false,
  icon,
  children,
  ...props
}: ButtonProps) {
  const styles = {
    primary: "bg-blue-600 text-white shadow-[0_20px_40px_-20px_rgba(37,99,235,0.95)] hover:bg-blue-500",
    secondary: "border border-white/10 bg-slate-900/70 text-slate-100 hover:border-blue-400/30 hover:bg-slate-900",
    ghost: "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className
      )}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function CreateButton({ children = "Create", ...props }: Omit<ButtonProps, "icon">) {
  return (
    <AdminButton icon={<Plus className="h-4 w-4" />} {...props}>
      {children}
    </AdminButton>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-slate-100">{children}</label>;
}

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/15",
        props.className
      )}
    />
  );
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/15",
        props.className
      )}
    />
  );
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none transition-all focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/15",
        props.className
      )}
    />
  );
}

export function AdminSwitch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left"
    >
      <div>
        <p className="text-sm font-semibold text-slate-100">{label}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <span className={cn("relative h-6 w-11 rounded-full transition-all", checked ? "bg-blue-600" : "bg-slate-800")}>
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-all",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function AdminCheckbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left"
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
          checked ? "border-blue-500 bg-blue-600 text-white" : "border-white/15 bg-black/30 text-transparent"
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-slate-100">{label}</span>
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </span>
    </button>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const tones = {
    success: "bg-emerald-500/15 text-emerald-300",
    warning: "bg-amber-500/15 text-amber-300",
    danger: "bg-rose-500/15 text-rose-300",
    info: "bg-blue-500/15 text-blue-300",
    neutral: "bg-white/5 text-slate-300",
  };

  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <AdminCard className="border-dashed p-10 text-center">
      <h3 className="text-lg font-bold text-slate-100">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </AdminCard>
  );
}

export function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl" | "2xl";
}) {
  if (!open) {
    return null;
  }

  const width = {
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
    "2xl": "max-w-7xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 sm:p-6">
      <div className={cn("my-8 w-full rounded-[32px] border border-white/10 bg-[#04070d] shadow-2xl", width[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <h3 className="text-xl font-black text-slate-50">{title}</h3>
            {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/10 p-2 text-slate-400 hover:border-blue-300/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-6">{children}</div>
        {footer ? <div className="border-t border-white/10 px-6 py-5">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AdminDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "lg" | "xl" | "full";
}) {
  if (!open) {
    return null;
  }

  const width = {
    lg: "w-full max-w-3xl",
    xl: "w-full max-w-5xl",
    full: "w-full max-w-[92rem]",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className={cn("flex h-full flex-col border-l border-white/10 bg-[#050811] shadow-2xl", width[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <h3 className="text-2xl font-black text-slate-50">{title}</h3>
            {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-slate-400 hover:border-blue-300/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer ? <div className="border-t border-white/10 px-6 py-5">{footer}</div> : null}
      </div>
    </div>
  );
}
