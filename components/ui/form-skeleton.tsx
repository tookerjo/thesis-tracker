import { Skeleton } from "./skeleton";

export function FormSkeleton({ fields }: { fields: number }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
