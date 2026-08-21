import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LogoMark, SiteHeader } from "@/components/SiteHeader";
import { MapModalTrigger } from "@/components/client/MapModalTrigger";
import { PersonCard } from "@/components/PersonCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import {
  getGraveByPersonId,
  getMediaByPersonId,
  getPersonById,
  getRelatives,
} from "@/lib/data";
import { formatCoords, initials, lifespan } from "@/lib/utils";

export default async function PersonPage({
  params,
}: PageProps<"/person/[id]">) {
  const { id } = await params;
  const person = await getPersonById(id);
  if (!person) notFound();

  const t = await getTranslations();
  const [relatives, grave, media] = await Promise.all([
    getRelatives(id),
    getGraveByPersonId(id),
    getMediaByPersonId(id),
  ]);

  return (
    <div className="min-h-screen animate-fade-in">
      <SiteHeader
        left={
          <Button variant="ghost" asChild className="text-sm">
            <Link href="/">← {t("Person.backToTree")}</Link>
          </Button>
        }
        right={
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="font-serif text-base text-muted">
              {t("Common.appName")}
            </span>
          </div>
        }
      />

      <main className="mx-auto flex max-w-[780px] flex-col gap-[18px] px-[18px] py-7 pb-20">
        <Card className="flex flex-wrap items-center gap-[22px] p-[26px] animate-fade-up">
          <Avatar className="size-[120px]">
            {person.avatar && <AvatarImage src={person.avatar} alt="" />}
            <AvatarFallback className="text-[13px]">
              {initials(person.firstName, person.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-[200px] flex-1 basis-[240px]">
            <h1 className="m-0 mb-2 text-pretty font-serif text-[34px] leading-[1.12] font-medium tracking-tight text-ink">
              {person.firstName} {person.lastName}
            </h1>
            <p className="m-0 tabular-nums text-base text-muted">
              {lifespan(person.birthDate, person.deathDate)}
            </p>
          </div>
        </Card>

        {person.bio && person.bio.length > 0 && (
          <Card className="p-[26px] animate-fade-up">
            <CardHeading>{t("Person.biography")}</CardHeading>
            <div className="flex flex-col gap-3.5">
              {person.bio.map((paragraph, index) => (
                <p
                  key={index}
                  className="m-0 text-pretty text-[16.5px] leading-[1.68] text-ink"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Card>
        )}

        {grave && (
          <Card className="p-[26px] animate-fade-up">
            <CardHeading>{t("Person.burialPlace")}</CardHeading>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                {grave.address && (
                  <p className="m-0 mb-1.5 text-[17px] font-semibold text-ink">
                    {grave.address}
                  </p>
                )}
                <p className="m-0 font-mono text-xs text-faint">
                  {formatCoords(grave.latitude, grave.longitude)}
                  {grave.description ? ` · ${grave.description}` : ""}
                </p>
              </div>
              <MapModalTrigger
                label={t("Person.openMap")}
                address={grave.address ?? person.firstName}
                coordsLabel={formatCoords(grave.latitude, grave.longitude)}
                latitude={grave.latitude}
                longitude={grave.longitude}
              />
            </div>
          </Card>
        )}

        {(relatives.parents.length > 0 ||
          relatives.spouses.length > 0 ||
          relatives.children.length > 0) && (
          <Card className="p-[26px] animate-fade-up">
            <CardHeading className="mb-[18px]">{t("Person.family")}</CardHeading>

            {relatives.parents.length > 0 && (
              <RelativeSection
                label={t("Person.parents")}
                people={relatives.parents}
              />
            )}
            {relatives.spouses.length > 0 && (
              <RelativeSection
                label={t("Person.spouses")}
                people={relatives.spouses}
              />
            )}
            {relatives.children.length > 0 && (
              <RelativeSection
                label={t("Person.children")}
                people={relatives.children}
                last
              />
            )}
          </Card>
        )}

        {media.length > 0 && (
          <Card className="p-[26px] animate-fade-up">
            <CardHeading className="mb-4">{t("Person.gallery")}</CardHeading>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {media.map((item) => (
                <figure key={item.id} className="m-0">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border-strong shadow-gallery">
                    <Image
                      src={item.url}
                      alt={item.caption ?? ""}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  {item.caption && (
                    <figcaption className="mt-2 text-[13px] leading-snug text-muted">
                      {item.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

function RelativeSection({
  label,
  people,
  last = false,
}: {
  label: string;
  people: Awaited<ReturnType<typeof getRelatives>>["parents"];
  last?: boolean;
}) {
  return (
    <div className={last ? undefined : "mb-[22px]"}>
      <h3 className="m-0 mb-2.5 text-[13.5px] font-bold text-muted">
        {label}
      </h3>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}
