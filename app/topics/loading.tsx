import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <Skeleton className="h-8 w-24" />
      <TableSkeleton
        columns={[
          { label: "Name", cellWidthClassName: "w-48" },
          { label: "Views", cellWidthClassName: "w-12" },
        ]}
      />
    </main>
  );
}
