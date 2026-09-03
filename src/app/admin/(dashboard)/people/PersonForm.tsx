"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { CalendarDays, Loader2 } from "lucide-react";

import { savePerson, type PersonFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bioToTextareaValue } from "@/lib/admin-forms";
import { slugifyName } from "@/lib/slug";
import type { Person } from "@/lib/schemas";

const initialState: PersonFormState = {};

// The stored value can be a bare year ("1928", the common case when only
// that much is known) or a full date ("1928-05-12"). The public site only
// ever shows the year (lifespan() slices the first 4 characters), so
// widening this to a full date is purely additive -- no schema or public
// display change needed. The visible field stays free text (so a bare year
// stays easy to type and legacy values still display), with a native date
// picker alongside it as a convenience for filling in the full date.
function DateField({
  name,
  label,
  optional,
  value,
  onChange,
}: {
  name: string;
  label: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted-4">
        {label}{" "}
        {optional && (
          <span className="font-normal text-faint">(необов&apos;язково)</span>
        )}
      </span>
      <div className="relative">
        <Input
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="1928 або 1928-05-12"
          className="pr-10"
        />
        <button
          type="button"
          aria-label="Обрати дату"
          onClick={() => {
            const picker = pickerRef.current;
            if (!picker) return;
            // Safari < 16.4 has no showPicker() -- fall back to a synthetic
            // click, which still opens the native date picker there.
            try {
              picker.showPicker();
            } catch {
              picker.click();
            }
          }}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink"
        >
          <CalendarDays className="size-4" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-y-0 right-0 size-0 opacity-0"
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
        />
      </div>
    </label>
  );
}

export function PersonForm({ person }: { person?: Person }) {
  const [state, formAction, isPending] = useActionState(
    savePerson,
    initialState,
  );
  const isNew = !person;

  const [firstName, setFirstName] = useState(person?.firstName ?? "");
  const [lastName, setLastName] = useState(person?.lastName ?? "");
  const [id, setId] = useState(person?.id ?? "");
  const [birthDate, setBirthDate] = useState(person?.birthDate ?? "");
  const [deathDate, setDeathDate] = useState(person?.deathDate ?? "");
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
          <span className="text-[13px] font-semibold text-muted-4">
            Прізвище <span className="font-normal text-faint">(необов&apos;язково)</span>
          </span>
          <Input
            name="lastName"
            value={lastName}
            onChange={(event) => handleLastNameChange(event.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DateField
          name="birthDate"
          label="Дата народження"
          optional
          value={birthDate}
          onChange={setBirthDate}
        />
        <DateField
          name="deathDate"
          label="Дата смерті"
          optional
          value={deathDate}
          onChange={setDeathDate}
        />
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
              src={person.avatar.small}
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
