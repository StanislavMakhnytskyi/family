import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAdmin } from "@/app/admin/actions/auth";
import { LogoMark } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { getSelectedDataSource } from "@/lib/admin-data";

const NAV_ITEMS = [
  { href: "/admin/people", label: "Люди" },
  { href: "/admin/relationships", label: "Зв'язки" },
  { href: "/admin/graves", label: "Поховання" },
  { href: "/admin/media", label: "Медіа" },
  { href: "/admin/questions", label: "Питання" },
];

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const source = await getSelectedDataSource();
  if (!source) {
    redirect("/admin");
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border-divider bg-cream/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="font-serif text-lg font-medium text-ink">
              Адміністрування
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-muted">
              Джерело:{" "}
              <b className="text-ink">
                {source === "local" ? "локальні файли" : "Vercel Global Config"}
              </b>{" "}
              · <Link href="/admin" className="underline">Змінити</Link>
            </span>
            <form action={logoutAdmin}>
              <Button type="submit" variant="ghost" className="text-sm">
                Вийти
              </Button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1000px] gap-1 px-5 pb-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xs px-3 py-1.5 text-[14px] text-muted-4 hover:bg-surface-hover"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1000px] px-5 py-7">{children}</main>
    </div>
  );
}
