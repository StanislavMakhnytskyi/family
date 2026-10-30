import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoMark } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center gap-4 px-5 text-center">
      <LogoMark size={34} />
      <h1 className="m-0 font-serif text-3xl font-medium text-ink">{t("title")}</h1>
      <p className="m-0 text-body text-muted">{t("body")}</p>
      <Button asChild>
        <Link href="/">{t("back")}</Link>
      </Button>
    </main>
  );
}
