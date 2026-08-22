"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

import { savePerson, type PersonFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bioToTextareaValue } from "@/lib/admin-forms";
import { slugifyName } from "@/lib/slug";
import type { Person } from "@/lib/schemas";

const initialState: PersonFormState = {};

export function PersonForm({ person }: { person?: Person }) {
  const [state, formAction, isPending] = useActionState(
    savePerson,
    initialState,
  );
  const isNew = !person;

  const [firstName, setFirstName] = useState(person?.firstName ?? "");
  const [lastName, setLastName] = useState(person?.lastName ?? "");
  const [id, setId] = useState(person?.id ?? "");
  // Once someone types directly into the id field, stop overwriting it —
  // otherwise a deliberate custom id would keep getting clobbered by the
  // next keystroke in firstName/lastName.
  const idTouchedRef = useRef(false);

  function handleFirstNameChange(value: string) {
    setFirstName(value);
    if (!idTouchedRef.current) setId(slugifyName(value, lastName));
  }

  function handleLastNameChange(value: string) {
    setLastName(value);
    if (!idTouchedRef.current) setId(slugifyName(firstName, value));
  }

  return (
    <form action={formAction} className="flex max-w-[560px] flex-col gap-4">
      <input type="hidden" name="mode" value={isNew ? "new" : "edit"} />
      {!isNew && (
        <input type="hidden" name="originalId" value={person.id} />
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">ID</span>
        <Input
          name="id"
          value={id}
          onChange={(event) => {
            idTouchedRef.current = true;
            setId(event.target.value);
          }}
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted-4">Ім&apos;я</span>
          <Input
            name="firstName"
            value={firstName}
            onChange={(event) => handleFirstNameChange(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted-4">Прізвище</span>
          <Input
            name="lastName"
            value={lastName}
            onChange={(event) => handleLastNameChange(event.target.value)}
            required
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted-4">
            Дата народження
          </span>
          <Input
            name="birthDate"
            defaultValue={person?.birthDate}
            placeholder="1928"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted-4">
            Дата смерті
          </span>
          <Input
            name="deathDate"
            defaultValue={person?.deathDate}
            placeholder="необов'язково"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">
          Біографія (абзаци через порожній рядок)
        </span>
        <Textarea
          name="bio"
          defaultValue={bioToTextareaValue(person?.bio)}
          rows={6}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Фото</span>
        {person?.avatar && (
          <div className="relative size-20 overflow-hidden rounded-full border border-border-strong">
            <Image
              src={person.avatar}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}
        <input
          type="file"
          name="avatarFile"
          accept="image/*"
          className="text-[13.5px] text-muted"
        />
        {person?.avatar && (
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" name="removeAvatar" /> Прибрати фото
          </label>
        )}
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
