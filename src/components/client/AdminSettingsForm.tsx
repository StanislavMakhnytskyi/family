"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { saveSettings, type SettingsFormState } from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";

const initialState: SettingsFormState = {};

export function AdminSettingsForm({ showFullDates }: { showFullDates: boolean }) {
  const [state, formAction, isPending] = useActionState(saveSettings, initialState);

  return (
    <form action={formAction} className="flex max-w-[560px] flex-col gap-5">
      <label className="flex items-start gap-3 rounded-md border border-border bg-surface p-4 text-ink">
        <input
          type="checkbox"
          name="showFullDates"
          defaultChecked={showFullDates}
          className="mt-1"
        />
        <span>
          <span className="block text-small font-semibold">Показувати повні дати</span>
          <span className="mt-1 block text-caption text-muted">
            На дереві, сторінках людей і в картках родичів буде показано день, місяць і рік,
            якщо повна дата відома.
          </span>
        </span>
      </label>

      {state.error && (
        <p role="alert" className="rounded-sm border border-error/30 bg-error/5 px-3 py-2 text-caption text-error">
          {state.error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Зберегти
        </Button>
      </div>
    </form>
  );
}
