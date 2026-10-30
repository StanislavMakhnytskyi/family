import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { HomeLink, SiteHeader } from "@/components/SiteHeader";
import { PersonCard } from "@/components/PersonCard";
import { GalleryLightbox } from "@/components/client/GalleryLightbox";
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
    <div className="min-h-dvh animate-fade-in">
      <SiteHeader
        navLabel={t("Common.mainNav")}
        left={<HomeLink name={t("Common.appName")} />}
        right={
          <Button variant="ghost" asChild className="text-sm">
            <Link href="/">← {t("Person.backToTree")}</Link>
          </Button>
        }
      />

      <main className="mx-auto flex max-w-[980px] flex-col gap-4.5 px-4.5 py-7 pb-20">
        <Card className="flex flex-wrap items-center gap-6.5 p-7.5 animate-fade-up">
          <Avatar className="size-36">
            {person.avatar && <AvatarImage src={person.avatar.large} alt="" fetchPriority="high" />}
            <AvatarFallback className="text-small">
              {initials(person.firstName, person.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-[200px] flex-1 basis-[240px]">
            <h1 className="m-0 mb-2 text-pretty font-serif text-display leading-[1.1] font-medium tracking-tight text-ink">
              {person.firstName} {person.lastName}
            </h1>
            <p className="m-0 tabular-nums text-base text-muted">
              {lifespan(person.birthDate, person.deathDate, {
                born: t("Common.bornPrefix"),
                died: t("Common.diedPrefix"),
              })}
            </p>
            {!person.hidden && (
              <Button variant="ghost" asChild className="mt-4 text-sm">
                <Link href={`/?focus=${encodeURIComponent(person.id)}`}>
                  {t("Person.showInTree")}
                </Link>
              </Button>
            )}
          </div>
        </Card>

        {/* One column on phones (order: biography, burial, family, gallery);
            from lg up the text column sits beside a narrower side column. */}
        <div className="flex flex-col gap-4.5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="contents lg:flex lg:flex-col lg:gap-4.5">
            {person.bio && person.bio.length > 0 && (
              <Card className="order-1 p-6.5 animate-fade-up lg:order-none">
                <CardHeading>{t("Person.biography")}</CardHeading>
                <div className="flex flex-col gap-3.5">
                  {person.bio.map((paragraph, index) => (
                    <p
                      key={index}
                      className="m-0 text-pretty text-body leading-[1.68] text-ink"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </Card>
            )}

            {media.length > 0 && (
              <Card className="order-4 p-6.5 animate-fade-up lg:order-none">
                <CardHeading className="mb-4">{t("Person.gallery")}</CardHeading>
                <GalleryLightbox
                  items={media}
                  labels={{
                    close: t("Gallery.close"),
                    previous: t("Gallery.previous"),
                    next: t("Gallery.next"),
                    zoomIn: t("Gallery.zoomIn"),
                    zoomOut: t("Gallery.zoomOut"),
                    counter: t("Gallery.counter"),
                  }}
                />
              </Card>
            )}
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-4.5">
            {grave && (
              <Card className="order-2 p-6.5 animate-fade-up lg:order-none">
                <CardHeading>{t("Person.burialPlace")}</CardHeading>
                <div className="flex flex-col items-start gap-4">
                  <div>
                    {grave.address && (
                      <p className="m-0 text-body font-semibold text-ink">
                        {grave.address}
                      </p>
                    )}
                    {grave.description && (
                      <p className="m-0 mt-1.5 text-small text-muted">
                        {grave.description}
                      </p>
                    )}
                  </div>
                  <Button variant="primary" asChild>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${grave.latitude},${grave.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={formatCoords(grave.latitude, grave.longitude)}
                    >
                      {t("Person.openMap")}
                    </a>
                  </Button>
                </div>
              </Card>
            )}

            {(relatives.parents.length > 0 ||
              relatives.spouses.length > 0 ||
              relatives.siblings.length > 0 ||
              relatives.children.length > 0) && (
              <Card className="order-3 p-6.5 animate-fade-up lg:order-none">
                <CardHeading className="mb-4.5">{t("Person.family")}</CardHeading>

                <div className="[&>*+*]:mt-5.5">
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
                  {relatives.siblings.length > 0 && (
                    <RelativeSection
                      label={t("Person.siblings")}
                      people={relatives.siblings}
                    />
                  )}
                  {relatives.children.length > 0 && (
                    <RelativeSection
                      label={t("Person.children")}
                      people={relatives.children}
                    />
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function RelativeSection({
  label,
  people,
}: {
  label: string;
  people: Awaited<ReturnType<typeof getRelatives>>["parents"];
}) {
  return (
    <div>
      <h3 className="m-0 mb-2.5 text-caption font-bold text-muted">
        {label}
      </h3>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}
