import Link from "next/link";

export function NotFoundState({
  message = "This page couldn't be found, or you don't have access to it.",
}: {
  message?: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <p className="text-neutral-500">{message}</p>
      <Link href="/views" className="text-sm underline hover:no-underline">
        Back to Views
      </Link>
    </main>
  );
}
