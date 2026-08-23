import type { ReactNode } from "react";

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
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className="shrink-0"
      aria-hidden="true"
    >
      <g fill="none" strokeLinecap="round">
        <path d="M15,178 C15,95 65,95 65,178" stroke="#FFD500" strokeWidth={16} />
        <path d="M135,178 C135,95 185,95 185,178" stroke="#FFD500" strokeWidth={16} />
        <path d="M70,178 C70,58 130,58 130,178" stroke="#005BBB" strokeWidth={16} />
      </g>
      <circle cx={40} cy={88} r={12} fill="#FFD500" />
      <circle cx={160} cy={88} r={12} fill="#FFD500" />
      <circle cx={100} cy={50} r={15} fill="#005BBB" />
    </svg>
  );
}
