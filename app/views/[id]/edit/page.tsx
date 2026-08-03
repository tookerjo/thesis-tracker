import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditViewForm } from "./edit-view-form";

type EditableViewRow = {
  id: string;
  title: string;
  confidence_level: string | null;
  time_horizon: string | null;
};

export default async function EditViewPage({
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
    .select("id, title, confidence_level, time_horizon")
    .eq("id", id)
    .returns<EditableViewRow[]>()
    .maybeSingle();

  // error covers malformed ids; !view covers both "doesn't exist" and
  // "belongs to another user" -- same reasoning as app/views/[id]/page.tsx.
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
      <h1 className="text-2xl font-semibold">Edit View</h1>
      <EditViewForm
        viewId={view.id}
        initialTitle={view.title}
        initialConfidenceLevel={view.confidence_level}
        initialTimeHorizon={view.time_horizon}
      />
    </main>
  );
}
