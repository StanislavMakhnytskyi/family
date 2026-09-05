import { getTranslations } from "next-intl/server";

import { logout } from "@/app/actions/auth";
import { LogoMark, SiteHeader } from "@/components/SiteHeader";
import { TreeClient } from "@/components/client/TreeClient";
import { Button } from "@/components/ui/button";
import { getPeople, getRelationships } from "@/lib/data";

export default async function TreePage() {
  const t = await getTranslations();
  const [allPeople, allRelationships] = await Promise.all([
    getPeople(),
    getRelationships(),
  ]);

  // A person marked "hidden" in the admin panel keeps their own page and
  // any mention in a relative's "Family" section -- they're stripped only
  // here, before the tree layout ever sees them, so the tree itself
  // doesn't get cluttered with people the owner would rather keep out of
  // the overview (see Person.hidden in schemas.ts).
  const hiddenIds = new Set(
    allPeople.filter((person) => person.hidden).map((person) => person.id),
  );
  const people = allPeople.filter((person) => !hiddenIds.has(person.id));
  const relationships = allRelationships.filter(
    (rel) => !hiddenIds.has(rel.person1Id) && !hiddenIds.has(rel.person2Id),
  );

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
      <TreeClient
        people={people}
        relationships={relationships}
        hint={t("Tree.hint")}
        lifespanLabels={{ born: t("Common.bornPrefix"), died: t("Common.diedPrefix") }}
      />
    </div>
  );
}
