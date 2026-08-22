"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-error/30 bg-error/5 p-6">
      <h1 className="font-serif text-xl text-ink">Не вдалося завантажити дані</h1>
      <p className="m-0 text-[14.5px] text-error">{error.message}</p>
      <div>
        <Button type="button" onClick={reset}>
          Спробувати ще раз
        </Button>
      </div>
    </div>
  );
}
