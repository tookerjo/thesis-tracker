import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewEvidenceForm } from "./new-evidence-form";

type ViewRow = { id: string; title: string };

export default async function NewEvidencePage({
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

  // Confirm the parent view exists and belongs to the user before rendering
  // the form -- RLS collapses "doesn't exist" and "belongs to another user"
  // into the same zero-row result (same reasoning as app/views/[id]/page.tsx).
  const { data: view, error } = await supabase
    .from("views")
    .select("id, title")
    .eq("id", id)
    .returns<ViewRow[]>()
    .maybeSingle();

  if (error || !view) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <Link
        href={`/views/${view.id}`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Back to View
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Add Evidence</h1>
        <p className="text-sm text-neutral-500">{view.title}</p>
      </div>
      <NewEvidenceForm viewId={view.id} />
    </main>
  );
}
