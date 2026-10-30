import type { ReactNode } from "react";
import Link from "next/link";

export function SiteHeader({
  left,
  right,
  navLabel,
}: {
  left: ReactNode;
  right: ReactNode;
  navLabel: string;
}) {
  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-border-divider bg-cream/92 px-5 backdrop-blur-sm">
      <nav
        aria-label={navLabel}
        className="flex h-full items-center justify-between gap-3"
      >
        {left}
        {right}
      </nav>
    </header>
  );
}

// The logo and app name always sit at the left of the header, on every page,
// and take you back to the tree.
export function HomeLink({ name }: { name: string }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-xs">
      <LogoMark size={26} />
      <span className="truncate font-serif text-lg font-medium text-ink">{name}</span>
    </Link>
  );
}

export function LogoMark({ size = 26 }: { size?: 26 | 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className="shrink-0"
      aria-hidden="true"
    >
      <g fill="none" strokeLinecap="round" strokeWidth={16}>
        <path d="M15,178 C15,95 65,95 65,178" className="stroke-flag-yellow" />
        <path d="M135,178 C135,95 185,95 185,178" className="stroke-flag-yellow" />
        <path d="M70,178 C70,58 130,58 130,178" className="stroke-flag-blue" />
      </g>
      <circle cx={40} cy={88} r={12} className="fill-flag-yellow" />
      <circle cx={160} cy={88} r={12} className="fill-flag-yellow" />
      <circle cx={100} cy={50} r={15} className="fill-flag-blue" />
    </svg>
  );
}
