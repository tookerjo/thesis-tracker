import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewViewForm } from "./new-view-form";

export default async function NewViewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <Link href="/views" className="text-sm text-neutral-500 hover:underline">
        ← Back to Views
      </Link>
      <h1 className="text-2xl font-semibold">New View</h1>
      <NewViewForm />
    </main>
  );
}
