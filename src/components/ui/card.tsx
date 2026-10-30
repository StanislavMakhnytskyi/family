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
        "mb-3.5 font-serif text-xl font-semibold text-ink",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeading };
