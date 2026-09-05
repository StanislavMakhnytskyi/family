"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import { saveRelationship, type RelationshipFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Person, Relationship } from "@/lib/schemas";

const initialState: RelationshipFormState = {};

const PERSON_LABELS: Record<Relationship["type"], [string, string]> = {
  "parent-child": ["Особа 1 (батько/матір)", "Особа 2 (дитина)"],
  spouse: ["Особа 1 (перший з подружжя)", "Особа 2 (другий з подружжя)"],
  sibling: ["Особа 1 (брат/сестра)", "Особа 2 (брат/сестра)"],
};

export function RelationshipForm({
  people,
  relationship,
}: {
  people: Person[];
  relationship?: Relationship;
}) {
  const [state, formAction, isPending] = useActionState(
    saveRelationship,
    initialState,
  );
  const [type, setType] = useState<Relationship["type"]>(
    relationship?.type ?? "parent-child",
  );
  const isNew = !relationship;
  const [person1Label, person2Label] = PERSON_LABELS[type];

  return (
    <form action={formAction} className="flex max-w-[480px] flex-col gap-4">
      <input type="hidden" name="mode" value={isNew ? "new" : "edit"} />
      {!isNew && <input type="hidden" name="id" value={relationship.id} />}

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Тип</span>
        <Select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as Relationship["type"])}
        >
          <option value="parent-child">Батько/матір → дитина</option>
          <option value="spouse">Подружжя</option>
          <option value="sibling">Брат/сестра</option>
        </Select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">
          {person1Label}
        </span>
        <Select name="person1Id" defaultValue={relationship?.person1Id ?? ""}>
          <option value="" disabled>
            Оберіть людину
          </option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.firstName} {person.lastName}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">
          {person2Label}
        </span>
        <Select name="person2Id" defaultValue={relationship?.person2Id ?? ""}>
          <option value="" disabled>
            Оберіть людину
          </option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.firstName} {person.lastName}
            </option>
          ))}
        </Select>
      </label>

      {state.error && (
        <p className="rounded-sm border border-error/30 bg-error/5 px-3 py-2 text-[13.5px] text-error">
          {state.error}
        </p>
      )}

      <div className="flex gap-2.5">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Зберегти
        </Button>
      </div>
    </form>
  );
}
