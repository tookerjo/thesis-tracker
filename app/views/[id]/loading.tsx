import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <DetailSkeleton fields={5} />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <Skeleton className="h-4 w-full max-w-xs" />
      </div>
    </main>
  );
}
