import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFullDate } from "@/lib/format/full-date";
import { STANCE_OPTIONS } from "@/lib/evidence/field-options";
import { ErrorState } from "@/components/ui/error-state";
import { TopicLinks } from "./topic-links";

type EvidenceLink = {
  id: string;
  stance: string | null;
  evidence_items: { id: string; link: string | null; note: string | null } | null;
};

type TopicRef = { id: string; name: string };

type ViewDetailRow = {
  id: string;
  title: string;
  confidence_level: string | null;
  time_horizon: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
  view_evidence: EvidenceLink[];
  view_topics: { topics: TopicRef | null }[];
};

type EvidenceItem = {
  key: string;
  stance: string | null;
  link: string | null;
  note: string | null;
};

// stance is one of STANCE_OPTIONS or null (DB CHECK), so null-stance evidence
// falls into a trailing "Unspecified" group. Labels are display-cased copies
// of the stored lowercase values.
const STANCE_LABELS: Record<string, string> = {
  for: "For",
  against: "Against",
  context: "Context",
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
    .select(
      "id, title, confidence_level, time_horizon, tags, created_at, updated_at, view_evidence(id, stance, evidence_items(id, link, note)), view_topics(topics(id, name))",
    )
    .eq("id", id)
    .returns<ViewDetailRow[]>()
    .maybeSingle();

  // A genuine query failure (bad SQL, schema drift, DB down) is NOT a 404 —
  // collapsing it into notFound() is how a schema-drift bug once disguised
  // itself as a missing view. Surface it as an error instead. Only a real
  // zero-row result is a 404: !view covers both "doesn't exist" and "belongs
  // to another user", which RLS makes indistinguishable here — both are a 404.
  if (error) {
    return <ErrorState message="Unable to load this view right now." />;
  }
  if (!view) {
    notFound();
  }

  // Topics linked to this view (flattened from the join rows), and the user's
  // other topics not yet linked -- the latter feeds the "link a topic" dropdown.
  // RLS scopes the topics query to the user, so availableTopics can only ever
  // contain the user's own topics.
  const linkedTopics: TopicRef[] = view.view_topics
    .map((entry) => entry.topics)
    .filter((topic): topic is TopicRef => topic !== null);
  const linkedTopicIds = new Set(linkedTopics.map((topic) => topic.id));

  const { data: allTopics } = await supabase
    .from("topics")
    .select("id, name")
    .order("name", { ascending: true })
    .returns<TopicRef[]>();
  const availableTopics = (allTopics ?? []).filter(
    (topic) => !linkedTopicIds.has(topic.id),
  );

  // Flatten the join rows to the evidence itself, carrying stance down from
  // the view_evidence link (ADR-006: stance is per-link, not per-item). The
  // view_evidence.id is the stable key. Defends against a null embedded
  // evidence_items row even though the FK makes that unreachable.
  const evidence: EvidenceItem[] = view.view_evidence
    .map((entry) =>
      entry.evidence_items
        ? {
            key: entry.id,
            stance: entry.stance,
            link: entry.evidence_items.link,
            note: entry.evidence_items.note,
          }
        : null,
    )
    .filter((item): item is EvidenceItem => item !== null);

  // Group in the canonical stance order, with null-stance evidence last.
  // Only non-empty groups render.
  const stanceGroups = [
    ...STANCE_OPTIONS.map((stance) => ({
      key: stance,
      label: STANCE_LABELS[stance],
      items: evidence.filter((item) => item.stance === stance),
    })),
    {
      key: "unspecified",
      label: "Unspecified",
      items: evidence.filter((item) => item.stance === null),
    },
  ].filter((group) => group.items.length > 0);

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
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-500">Topics</h2>
        <TopicLinks
          viewId={view.id}
          linkedTopics={linkedTopics}
          availableTopics={availableTopics}
        />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">Evidence</h2>
          <Link
            href={`/views/${view.id}/evidence/new`}
            className="text-sm text-neutral-500 hover:underline"
          >
            Add evidence
          </Link>
        </div>
        {evidence.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No evidence attached to this view yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {stanceGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {group.label}
                  <span className="rounded-full border border-neutral-600 px-2 py-0.5 text-xs font-normal normal-case">
                    {group.items.length}
                  </span>
                </h3>
                <ul className="flex flex-col gap-3">
                  {group.items.map((item) => (
                    <li key={item.key} className="flex flex-col gap-0.5">
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-sm hover:underline"
                        >
                          {item.link}
                        </a>
                      )}
                      {item.note && (
                        <p className="text-sm text-foreground">{item.note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
