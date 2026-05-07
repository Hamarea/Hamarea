import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary-100)] text-[var(--color-primary-700)]",
        secondary: "bg-[var(--color-secondary-100)] text-[var(--color-secondary-700)]",
        accent: "bg-[var(--color-accent-100)] text-[var(--color-accent-700)]",
        success: "bg-[var(--color-secondary-100)] text-[var(--color-secondary-700)]",
        warning: "bg-amber-100 text-amber-800",
        danger: "bg-red-100 text-red-700",
        outline: "border border-[var(--color-border)] text-[var(--color-foreground)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
