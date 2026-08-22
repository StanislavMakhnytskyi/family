"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { verifyAdminLogin, type AdminLoginState } from "@/app/admin/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AdminLoginState = { status: "idle" };

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(
    verifyAdminLogin,
    initialState,
  );
  const [now, setNow] = useState(() => Date.now());

  const locked = state.status === "locked" && (state.lockUntil ?? 0) > now;

  useEffect(() => {
    if (state.status !== "locked") return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [state.status]);

  return (
    <form action={formAction} className="contents" aria-busy={isPending}>
      <div className="flex flex-col gap-3">
        <Input
          name="username"
          placeholder="Логін"
          disabled={locked}
          autoComplete="username"
        />
        <Input
          name="password"
          type="password"
          placeholder="Пароль"
          disabled={locked}
          autoComplete="current-password"
        />
      </div>

      {state.status === "error-invalid" && (
        <p className="mt-2.5 ml-0.5 animate-fade-in text-[13.5px] text-error">
          Невірний логін або пароль. Залишилось спроб: {state.remaining ?? 0}
        </p>
      )}

      {locked && (
        <div className="mt-3.5 flex animate-fade-in items-center gap-2.5 rounded-sm border border-border-divider bg-[#f7ede0] px-3.5 py-3">
          <div className="size-2 shrink-0 rounded-full bg-terracotta" />
          <span className="text-[13.5px] text-muted-4">
            Спробуйте через{" "}
            <b className="tabular-nums">
              {formatCountdown((state.lockUntil ?? 0) - now)}
            </b>
          </span>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={locked || isPending}
        className="mt-[18px] w-full"
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {isPending ? "Зачекайте…" : "Увійти"}
      </Button>
    </form>
  );
}
