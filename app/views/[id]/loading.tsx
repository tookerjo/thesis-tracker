import { DetailSkeleton } from "@/components/ui/detail-skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <DetailSkeleton fields={5} />
    </main>
  );
}
