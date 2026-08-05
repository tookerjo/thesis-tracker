export function ErrorState({
  message,
  variant = "page",
}: {
  message: string;
  variant?: "page" | "inline";
}) {
  if (variant === "inline") {
    return <p className="text-sm text-red-600">{message}</p>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <p className="text-neutral-500">{message}</p>
    </main>
  );
}
