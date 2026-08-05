import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewTopicForm } from "./new-topic-form";

export default async function NewTopicPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <Link href="/topics" className="text-sm text-neutral-500 hover:underline">
        ← Back to Topics
      </Link>
      <h1 className="text-2xl font-semibold">New Topic</h1>
      <NewTopicForm />
    </main>
  );
}
