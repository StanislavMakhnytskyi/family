"use client";

import { useEffect, useState } from "react";

const MESSAGES: Record<string, string> = {
  saved: "Збережено.",
  deleted: "Видалено.",
};

// `flash` is the "<kind>.<timestamp>" cookie value, read by the dashboard
// layout on the server. The layout stays mounted across the redirect an action
// makes (even one back to the same URL), so a changed prop is the signal.
export function AdminFlash({ flash }: { flash?: string }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;
    document.cookie = "admin-flash=; Max-Age=0; path=/admin";
    const text = MESSAGES[flash.split(".")[0]];
    if (!text) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shows a one-shot message for a new flash value
    setMessage(text);
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [flash]);

  if (!message) return null;
  return (
    <p
      role="status"
      className="mb-4 animate-fade-in rounded-sm border border-border-strong bg-notice px-3 py-2 text-caption text-ink"
    >
      {message}
    </p>
  );
}
