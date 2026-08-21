import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Person } from "@/lib/schemas";
import { initials, lifespan } from "@/lib/utils";

export function PersonCard({ person }: { person: Person }) {
  return (
    <Link
      href={`/person/${person.id}`}
      className="group flex items-center gap-3 rounded-md border border-border bg-surface px-3.5 py-2.5 transition-colors hover:border-border-hover hover:bg-surface-hover"
    >
      <Avatar className="size-10">
        {person.avatar && <AvatarImage src={person.avatar} alt="" />}
        <AvatarFallback className="text-[10px]">
          {initials(person.firstName, person.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate text-[14.5px] font-semibold text-ink">
          {person.firstName} {person.lastName}
        </div>
        <div className="text-[12.5px] tabular-nums text-muted-3">
          {lifespan(person.birthDate, person.deathDate)}
        </div>
      </div>
    </Link>
  );
}
