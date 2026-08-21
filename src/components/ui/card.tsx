import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border border-border bg-surface shadow-card",
        className,
      )}
      {...props}
    />
  );
}

function CardHeading({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-heading"
      className={cn(
        "mb-3.5 font-serif text-[15px] font-semibold tracking-[0.08em] text-label uppercase",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeading };
