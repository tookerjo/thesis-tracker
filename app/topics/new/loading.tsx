import { FormSkeleton } from "@/components/ui/form-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-40" />
      <FormSkeleton fields={2} />
    </main>
  );
}
