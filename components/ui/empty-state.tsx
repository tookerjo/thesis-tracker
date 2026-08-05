import Link from "next/link";

export function EmptyState({
  message,
  cta,
}: {
  message: string;
  cta?: { href: string; label: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <p className="text-neutral-500">{message}</p>
      {cta && (
        <Link href={cta.href} className="text-sm underline hover:no-underline">
          {cta.label}
        </Link>
      )}
    </main>
  );
}
