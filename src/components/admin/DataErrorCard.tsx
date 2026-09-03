import Link from "next/link";
import { Button } from "@/components/ui/button";

// Rendered by an admin list page when readDataSafe() couldn't load the
// data, instead of letting the page throw -- see the comment on
// readDataSafe() in src/lib/admin-data.ts for why that matters
// specifically for these five pages. Visually mirrors the (dashboard)
// error.tsx boundary (which still exists as a fallback for reads outside
// these pages), but as a plain link "retry" rather than a client-side
// reset, since this isn't an error boundary.
export function DataErrorCard({
  message,
  retryHref,
}: {
  message: string;
  retryHref: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-error/30 bg-error/5 p-6">
      <h1 className="font-serif text-xl text-ink">Не вдалося завантажити дані</h1>
      <p className="m-0 text-[14.5px] text-error">{message}</p>
      <div>
        <Button asChild>
          <Link href={retryHref}>Спробувати ще раз</Link>
        </Button>
      </div>
    </div>
  );
}
