"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary-blue text-white hover:bg-primary-blue/90",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
        ghost: "text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        danger: "bg-rose-600 text-white hover:bg-rose-700",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-6 text-base",
        xl: "h-[52px] rounded-2xl px-8 py-4 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const content = (
      <span className="inline-flex items-center justify-center gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
      </span>
    );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
