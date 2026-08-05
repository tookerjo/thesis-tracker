import { Skeleton } from "./skeleton";

export function DetailSkeleton({ fields }: { fields: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-10" />
      </div>
      <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-3">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="col-span-2 grid grid-cols-[max-content_1fr] gap-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
