import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type TopicRow = {
  id: string;
  name: string;
  view_topics: { count: number }[];
};

export default async function TopicsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: topics, error } = await supabase
    .from("topics")
    .select("id, name, view_topics(count)")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<TopicRow[]>();

  if (error) {
    return <ErrorState message="Unable to load topics right now." />;
  }

  if (topics.length === 0) {
    return <EmptyState message="No topics yet" />;
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Topics</h1>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-neutral-200 text-sm text-neutral-500">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Views</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((topic) => (
            <tr key={topic.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{topic.name}</td>
              <td className="py-2 pr-4">{topic.view_topics[0]?.count ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
