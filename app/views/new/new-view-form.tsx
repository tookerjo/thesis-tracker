"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createView } from "./actions";
import { CONFIDENCE_LEVELS, TIME_HORIZONS } from "@/lib/views/field-options";
import { ErrorState } from "@/components/ui/error-state";

export function NewViewForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Basic sanity check only -- the server action re-validates before insert.
    if (!title.trim()) {
      setError("Thesis title is required.");
      return;
    }

    setSubmitting(true);

    const result = await createView({ title, confidenceLevel, timeHorizon });

    if ("error" in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/views/${result.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <label className="flex flex-col gap-1 text-sm text-neutral-500">
        Thesis Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="rounded-md border border-neutral-600 px-3 py-2 text-base text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-500">
        Confidence
        <select
          value={confidenceLevel}
          onChange={(event) => setConfidenceLevel(event.target.value)}
          className="rounded-md border border-neutral-600 px-3 py-2 text-base text-foreground"
        >
          <option value="">—</option>
          {CONFIDENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-500">
        Time Horizon
        <select
          value={timeHorizon}
          onChange={(event) => setTimeHorizon(event.target.value)}
          className="rounded-md border border-neutral-600 px-3 py-2 text-base text-foreground"
        >
          <option value="">—</option>
          {TIME_HORIZONS.map((horizon) => (
            <option key={horizon} value={horizon}>
              {horizon}
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
        {submitting ? "Creating…" : "Create View"}
      </button>
    </form>
  );
}
