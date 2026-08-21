import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SiteHeader({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border-divider bg-cream/92 px-5 backdrop-blur-sm">
      {left}
      {right}
    </header>
  );
}

export function LogoMark({ size = 26 }: { size?: 26 | 34 }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-border-hover bg-[#f7f0e0]",
        size === 34 ? "size-[34px]" : "size-[26px]",
      )}
    >
      <div
        className={cn(
          "rounded-full bg-terracotta",
          size === 34 ? "size-2.5" : "size-2",
        )}
      />
    </div>
  );
}
