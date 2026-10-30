"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Розділи адміністрування"
      className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-5 pb-2"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-xs px-3 py-2.5 text-small whitespace-nowrap hover:bg-surface-hover",
              active ? "bg-surface-hover font-semibold text-ink" : "text-muted-4",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
