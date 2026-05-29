import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,transform,opacity] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]",
        secondary:
          "bg-[var(--color-secondary-400)] text-white hover:bg-[var(--color-secondary-500)]",
        accent:
          "bg-[var(--color-accent-400)] text-white hover:bg-[var(--color-accent-500)]",
        outline:
          "border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-primary-50)]",
        ghost:
          "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-primary-50)]",
        link: "text-[var(--color-primary-600)] underline-offset-4 hover:underline bg-transparent",
        destructive: "bg-[var(--color-danger)] text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
