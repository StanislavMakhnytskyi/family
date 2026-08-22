"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { saveGrave, type GraveFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Grave, Person } from "@/lib/schemas";

const initialState: GraveFormState = {};

export function GraveForm({
  people,
  grave,
}: {
  people: Person[];
  grave?: Grave;
}) {
  const [state, formAction, isPending] = useActionState(saveGrave, initialState);
  const isNew = !grave;

  return (
    <form action={formAction} className="flex max-w-[480px] flex-col gap-4">
      <input type="hidden" name="mode" value={isNew ? "new" : "edit"} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Людина</span>
        <Select
          name="personId"
          defaultValue={grave?.personId ?? ""}
          disabled={!isNew}
        >
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

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted-4">Широта</span>
          <Input
            name="latitude"
            type="number"
            step="any"
            defaultValue={grave?.latitude}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted-4">Довгота</span>
          <Input
            name="longitude"
            type="number"
            step="any"
            defaultValue={grave?.longitude}
            required
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Адреса</span>
        <Input name="address" defaultValue={grave?.address} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Опис</span>
        <Input
          name="description"
          defaultValue={grave?.description}
          placeholder="ділянка, ряд..."
        />
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
