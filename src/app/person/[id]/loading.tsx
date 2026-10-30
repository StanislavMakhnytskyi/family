import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PersonLoading() {
  return (
    <div className="min-h-dvh" aria-busy="true">
      <div className="h-16 border-b border-border-divider" />
      <main className="mx-auto flex max-w-[980px] flex-col gap-4.5 px-4.5 py-7">
        <Card className="flex flex-wrap items-center gap-6.5 p-7.5">
          <Skeleton className="size-36 rounded-full" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-10 w-3/4 max-w-sm" />
            <Skeleton className="h-5 w-32" />
          </div>
        </Card>
        <div className="flex flex-col gap-4.5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="flex flex-col gap-3 p-6.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
          <Card className="flex flex-col gap-3 p-6.5">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </Card>
        </div>
      </main>
    </div>
  );
}
