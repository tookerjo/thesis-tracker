import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditTopicForm } from "./edit-topic-form";

type EditableTopicRow = {
  id: string;
  name: string;
  framing_note: string | null;
};

export default async function EditTopicPage({
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
    .select("id, name, framing_note")
    .eq("id", id)
    .returns<EditableTopicRow[]>()
    .maybeSingle();

  // error covers malformed ids; !topic covers both "doesn't exist" and
  // "belongs to another user" -- same reasoning as app/views/[id]/page.tsx.
  if (error || !topic) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <Link
        href={`/topics/${topic.id}`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Back to Topic
      </Link>
      <h1 className="text-2xl font-semibold">Edit Topic</h1>
      <EditTopicForm
        topicId={topic.id}
        initialName={topic.name}
        initialFramingNote={topic.framing_note}
      />
    </main>
  );
}
