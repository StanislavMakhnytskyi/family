"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

import { saveMedia, type MediaFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Media, Person } from "@/lib/schemas";

const initialState: MediaFormState = {};

export function MediaForm({
  people,
  media,
}: {
  people: Person[];
  media?: Media;
}) {
  const [state, formAction, isPending] = useActionState(saveMedia, initialState);
  const isNew = !media;

  return (
    <form action={formAction} className="flex max-w-[480px] flex-col gap-4">
      <input type="hidden" name="mode" value={isNew ? "new" : "edit"} />
      {!isNew && <input type="hidden" name="id" value={media.id} />}

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">
          Люди на фото <span className="font-normal text-faint">(можна обрати декількох)</span>
        </span>
        <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-sm border border-border-strong bg-surface-muted p-3">
          {people.map((person) => (
            <label
              key={person.id}
              className="flex items-center gap-2 text-[13.5px] text-ink"
            >
              <input
                type="checkbox"
                name="personIds"
                value={person.id}
                defaultChecked={media?.personIds.includes(person.id) ?? false}
              />
              {person.firstName} {person.lastName}
            </label>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Тип</span>
        <Select name="type" defaultValue={media?.type ?? "photo"}>
          <option value="photo">Фото</option>
          <option value="document">Документ</option>
        </Select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Підпис</span>
        <Input name="caption" defaultValue={media?.caption} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Рік</span>
        <Input name="year" type="number" defaultValue={media?.year} />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">
          Файл {isNew ? "" : "(залиште порожнім, щоб не змінювати)"}
        </span>
        {media?.url && (
          <div className="relative aspect-[4/3] w-40 overflow-hidden rounded-md border border-border-strong">
            <Image src={media.url} alt="" fill unoptimized className="object-cover" />
          </div>
        )}
        <input
          type="file"
          name="file"
          accept="image/*,application/pdf"
          className="text-[13.5px] text-muted"
        />
      </div>

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
