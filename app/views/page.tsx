import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/format/relative-time";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type ViewRow = {
  id: string;
  title: string;
  confidence_level: string | null;
  time_horizon: string | null;
  updated_at: string;
};

export default async function ViewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: views, error } = await supabase
    .from("views")
    .select("id, title, confidence_level, time_horizon, updated_at")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ViewRow[]>();

  if (error) {
    return <ErrorState message="Unable to load views right now." />;
  }

  if (views.length === 0) {
    return (
      <EmptyState
        message="No views yet"
        cta={{ href: "/views/new", label: "Create your first View" }}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Views</h1>
        <Link href="/views/new" className="text-sm text-neutral-500 hover:underline">
          New View
        </Link>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-neutral-200 text-sm text-neutral-500">
            <th className="py-2 pr-4 font-medium">Title</th>
            <th className="py-2 pr-4 font-medium">Confidence</th>
            <th className="py-2 pr-4 font-medium">Time Horizon</th>
            <th className="py-2 pr-4 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => (
            <tr key={view.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">
                <Link href={`/views/${view.id}`} className="hover:underline">
                  {view.title}
                </Link>
              </td>
              <td className="py-2 pr-4">{view.confidence_level}</td>
              <td className="py-2 pr-4">{view.time_horizon}</td>
              <td className="py-2 pr-4 text-neutral-500">
                {formatRelativeTime(view.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
