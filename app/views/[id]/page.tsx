import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFullDate } from "@/lib/format/full-date";

type ViewDetailRow = {
  id: string;
  title: string;
  confidence_level: string | null;
  time_horizon: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
};

export default async function ViewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: view, error } = await supabase
    .from("views")
    .select("id, title, confidence_level, time_horizon, tags, created_at, updated_at")
    .eq("id", id)
    .returns<ViewDetailRow[]>()
    .maybeSingle();

  // error covers malformed ids (invalid uuid syntax); !view covers both
  // "doesn't exist" and "belongs to another user" — RLS makes those two
  // cases produce the identical zero-row result, so this branch can't
  // distinguish them even if it wanted to.
  if (error || !view) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <Link href="/views" className="text-sm text-neutral-500 hover:underline">
        ← Back to Views
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{view.title}</h1>
        <Link
          href={`/views/${view.id}/edit`}
          className="text-sm text-neutral-500 hover:underline"
        >
          Edit
        </Link>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
        <dt className="text-sm text-neutral-500">Confidence</dt>
        <dd>{view.confidence_level}</dd>
        <dt className="text-sm text-neutral-500">Time Horizon</dt>
        <dd>{view.time_horizon}</dd>
        <dt className="text-sm text-neutral-500">Tags</dt>
        <dd>{view.tags}</dd>
        <dt className="text-sm text-neutral-500">Created</dt>
        <dd>{formatFullDate(view.created_at)}</dd>
        <dt className="text-sm text-neutral-500">Updated</dt>
        <dd>{formatFullDate(view.updated_at)}</dd>
      </dl>
    </main>
  );
}
