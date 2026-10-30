"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { LogoMark } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center gap-4 px-5 text-center">
      <LogoMark size={34} />
      <h1 className="m-0 font-serif text-3xl font-medium text-ink">{t("title")}</h1>
      <p role="alert" className="m-0 text-body text-muted">
        {t("body")}
      </p>
      <Button type="button" onClick={reset}>
        {t("retry")}
      </Button>
    </main>
  );
}
