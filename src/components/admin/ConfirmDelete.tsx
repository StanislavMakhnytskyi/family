"use client";

import { useState } from "react";

// Deleting is permanent, so the first click only arms the button; it must be
// confirmed (inside the same <form>, so the server action still receives the
// hidden fields).
export function ConfirmDelete() {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="cursor-pointer px-2 py-2.5 text-error underline"
      >
        Видалити
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="submit"
        className="cursor-pointer rounded-xs bg-error px-3 py-2 font-semibold text-surface"
      >
        Підтвердити
      </button>
      <button
        type="button"
        autoFocus
        onClick={() => setArmed(false)}
        className="cursor-pointer px-2 py-2.5 text-muted underline"
      >
        Скасувати
      </button>
    </span>
  );
}
