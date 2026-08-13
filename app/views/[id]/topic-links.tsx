"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { linkTopic, unlinkTopic } from "./actions";
import { ErrorState } from "@/components/ui/error-state";

type TopicRef = { id: string; name: string };

export function TopicLinks({
  viewId,
  linkedTopics,
  availableTopics,
}: {
  viewId: string;
  linkedTopics: TopicRef[];
  availableTopics: TopicRef[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!selected) return;

    setPending(true);
    const result = await linkTopic({ viewId, topicId: selected });
    if ("error" in result) {
      setError(result.error);
      setPending(false);
      return;
    }
    setSelected("");
    setPending(false);
    router.refresh();
  }

  async function handleUnlink(topicId: string) {
    setError(null);
    setPending(true);
    const result = await unlinkTopic({ viewId, topicId });
    if ("error" in result) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {linkedTopics.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No topics linked to this view yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linkedTopics.map((topic) => (
            <li key={topic.id} className="flex items-center gap-3">
              <Link
                href={`/topics/${topic.id}`}
                className="text-sm hover:underline"
              >
                {topic.name}
              </Link>
              <button
                type="button"
                onClick={() => handleUnlink(topic.id)}
                disabled={pending}
                className="text-xs text-neutral-500 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {availableTopics.length > 0 && (
        <form onSubmit={handleLink} className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="rounded-md border border-neutral-600 px-3 py-2 text-sm text-foreground"
          >
            <option value="">Link a topic…</option>
            {availableTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || !selected}
            className="rounded-md bg-black px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "…" : "Link"}
          </button>
        </form>
      )}

      {error && <ErrorState message={error} variant="inline" />}
    </div>
  );
}
