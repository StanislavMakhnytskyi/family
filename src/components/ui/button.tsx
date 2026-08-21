import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xs text-[15px] font-bold transition-[background-color,border-color,transform] duration-150 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-terracotta text-surface shadow-btn-primary hover:bg-terracotta-hover disabled:bg-terracotta-disabled disabled:shadow-none",
        ghost:
          "bg-surface-muted border border-border-ghost text-muted-4 font-semibold hover:bg-surface-hover hover:border-border-hover",
      },
      size: {
        default: "px-5 py-3.5",
        icon: "size-[42px] p-0 rounded-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
