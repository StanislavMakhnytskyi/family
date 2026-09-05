"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { verifyYears, type YearsState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Messages = {
  yearPlaceholder: string;
  submit: string;
  submitting: string;
  errorIncomplete: string;
  errorDuplicate: string;
  errorWrong: string;
  lockedPrefix: string;
};

const initialState: YearsState = { status: "idle" };

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function YearsGateForm({ messages }: { messages: Messages }) {
  const [state, formAction, isPending] = useActionState(
    verifyYears,
    initialState,
  );
  const [now, setNow] = useState(() => Date.now());
  const [values, setValues] = useState(["", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const locked = state.status === "locked" && (state.lockUntil ?? 0) > now;
  const filled = values.filter((year) => year !== "");
  const hasDuplicate = filled.length !== new Set(filled).size;

  useEffect(() => {
    if (state.status !== "locked") return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [state.status]);

  return (
    <form action={formAction} className="contents" aria-busy={isPending}>
      <div className="grid grid-cols-3 gap-2.5">
        {(["year1", "year2", "year3"] as const).map((name, index) => (
          <Input
            key={name}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            name={name}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder={messages.yearPlaceholder}
            disabled={locked}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={values[index]}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
              setValues((prev) => prev.map((v, i) => (i === index ? digits : v)));
              // Auto-advance once this box is full -- a 4-digit year never
              // needs more typing here, so move straight to the next box
              // instead of making the person tab/click over manually.
              if (digits.length === 4 && index < inputRefs.current.length - 1) {
                inputRefs.current[index + 1]?.focus();
              }
            }}
            onKeyDown={(event) => {
              // Symmetric convenience: Backspace on an already-empty box
              // jumps back to the previous one instead of doing nothing.
              if (event.key === "Backspace" && values[index] === "" && index > 0) {
                inputRefs.current[index - 1]?.focus();
              }
            }}
            className="text-center tabular-nums"
          />
        ))}
      </div>

      {hasDuplicate && (
        <p className="mt-2.5 ml-0.5 animate-fade-in text-[13.5px] text-error">
          {messages.errorDuplicate}
        </p>
      )}
      {!hasDuplicate && state.status === "error-incomplete" && (
        <p className="mt-2.5 ml-0.5 animate-fade-in text-[13.5px] text-error">
          {messages.errorIncomplete}
        </p>
      )}
      {!hasDuplicate && state.status === "error-duplicate" && (
        <p className="mt-2.5 ml-0.5 animate-fade-in text-[13.5px] text-error">
          {messages.errorDuplicate}
        </p>
      )}
      {!hasDuplicate && state.status === "error-wrong" && (
        <p className="mt-2.5 ml-0.5 animate-fade-in text-[13.5px] text-error">
          {messages.errorWrong.replace(
            "__REMAINING__",
            String(state.remaining ?? 0),
          )}
        </p>
      )}

      {locked && (
        <div className="mt-3.5 flex animate-fade-in items-center gap-2.5 rounded-sm border border-border-divider bg-[#f7ede0] px-3.5 py-3">
          <div className="size-2 shrink-0 rounded-full bg-terracotta" />
          <span className="text-[13.5px] text-muted-4">
            {messages.lockedPrefix}{" "}
            <b className="tabular-nums">
              {formatCountdown((state.lockUntil ?? 0) - now)}
            </b>
          </span>
        </div>
      )}

      <div className="mt-[18px]">
        <Button
          type="submit"
          variant="primary"
          disabled={locked || isPending || hasDuplicate}
          className="w-full"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? messages.submitting : messages.submit}
        </Button>
      </div>
    </form>
  );
}
