"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTopic } from "./actions";
import { ErrorState } from "@/components/ui/error-state";

export function EditTopicForm({
  topicId,
  initialName,
  initialFramingNote,
}: {
  topicId: string;
  initialName: string;
  initialFramingNote: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [framingNote, setFramingNote] = useState(initialFramingNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Basic sanity check only -- the server action re-validates before update.
    if (!name.trim()) {
      setError("Topic name is required.");
      return;
    }

    setSubmitting(true);

    const result = await updateTopic({
      id: topicId,
      name,
      framingNote,
    });

    if ("error" in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/topics/${result.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <label className="flex flex-col gap-1 text-sm text-neutral-500">
        Name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="rounded-md border border-neutral-600 px-3 py-2 text-base text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-500">
        Framing Note
        <textarea
          value={framingNote}
          onChange={(event) => setFramingNote(event.target.value)}
          rows={4}
          className="rounded-md border border-neutral-600 px-3 py-2 text-base text-foreground"
        />
      </label>
      {error && <ErrorState message={error} variant="inline" />}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
