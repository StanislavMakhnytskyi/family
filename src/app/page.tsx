import { getTranslations } from "next-intl/server";

import { logout } from "@/app/actions/auth";
import { LogoMark, SiteHeader } from "@/components/SiteHeader";
import { TreeClient } from "@/components/client/TreeClient";
import { Button } from "@/components/ui/button";
import { getPeople, getRelationships } from "@/lib/data";

export default async function TreePage() {
  const t = await getTranslations();
  const [people, relationships] = await Promise.all([
    getPeople(),
    getRelationships(),
  ]);

  return (
    <div className="flex h-dvh animate-fade-in flex-col overflow-hidden">
      <SiteHeader
        left={
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark size={26} />
            <span className="truncate font-serif text-lg font-medium text-ink">
              {t("Common.appName")}
            </span>
          </div>
        }
        right={
          <form action={logout}>
            <Button type="submit" variant="ghost" className="text-sm">
              {t("Tree.logout")}
            </Button>
          </form>
        }
      />
      <TreeClient people={people} relationships={relationships} hint={t("Tree.hint")} />
    </div>
  );
}
