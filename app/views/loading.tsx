import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <Skeleton className="h-8 w-24" />
      <TableSkeleton
        columns={[
          { label: "Title", cellWidthClassName: "w-48" },
          { label: "Confidence", cellWidthClassName: "w-20" },
          { label: "Time Horizon", cellWidthClassName: "w-24" },
          { label: "Updated", cellWidthClassName: "w-20" },
        ]}
      />
    </main>
  );
}
