"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvidence } from "./actions";
import { STANCE_OPTIONS } from "@/lib/evidence/field-options";
import { ErrorState } from "@/components/ui/error-state";

export function NewEvidenceForm({ viewId }: { viewId: string }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [stance, setStance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Basic sanity check only -- the server action re-validates before insert.
    if (!link.trim() && !note.trim()) {
      setError("Add a link or a note.");
      return;
    }

    setSubmitting(true);

    const result = await createEvidence({ viewId, link, note, stance });

    if ("error" in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/views/${viewId}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <label className="flex flex-col gap-1 text-sm text-neutral-500">
        Link
        <input
          type="url"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          className="rounded-md border border-neutral-600 px-3 py-2 text-base text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-500">
        Note
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          className="rounded-md border border-neutral-600 px-3 py-2 text-base text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-500">
        Stance
        <select
          value={stance}
          onChange={(event) => setStance(event.target.value)}
          className="rounded-md border border-neutral-600 px-3 py-2 text-base text-foreground"
        >
          <option value="">—</option>
          {STANCE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {error && <ErrorState message={error} variant="inline" />}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add Evidence"}
      </button>
    </form>
  );
}
