import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFullDate } from "@/lib/format/full-date";

type TopicDetailRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  view_topics: { views: { id: string; title: string } | null }[];
};

export default async function TopicDetailPage({
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

  const { data: topic, error } = await supabase
    .from("topics")
    .select("id, name, created_at, updated_at, view_topics(views(id, title))")
    .eq("id", id)
    .returns<TopicDetailRow[]>()
    .maybeSingle();

  // error covers malformed ids (invalid uuid syntax); !topic covers both
  // "doesn't exist" and "belongs to another user" — RLS makes those two
  // cases produce the identical zero-row result, so this branch can't
  // distinguish them even if it wanted to.
  if (error || !topic) {
    notFound();
  }

  const linkedViews = topic.view_topics
    .map((entry) => entry.views)
    .filter((view): view is { id: string; title: string } => view !== null);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <Link href="/topics" className="text-sm text-neutral-500 hover:underline">
        ← Back to Topics
      </Link>
      <h1 className="text-2xl font-semibold">{topic.name}</h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
        <dt className="text-sm text-neutral-500">Created</dt>
        <dd>{formatFullDate(topic.created_at)}</dd>
        <dt className="text-sm text-neutral-500">Updated</dt>
        <dd>{formatFullDate(topic.updated_at)}</dd>
      </dl>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Views</h2>
        {linkedViews.length === 0 ? (
          <p className="text-sm text-neutral-500">No views linked to this topic yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {linkedViews.map((view) => (
              <li key={view.id}>
                <Link href={`/views/${view.id}`} className="text-sm hover:underline">
                  {view.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
