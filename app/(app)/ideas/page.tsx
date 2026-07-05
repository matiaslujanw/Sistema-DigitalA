import { IdeasWorkspace } from "@/components/ideas-workspace";
import { getAppData } from "@/lib/data";

export default async function IdeasPage() {
  const data = await getAppData();

  return <IdeasWorkspace initialIdeas={data.ideas} projects={data.projects} source={data.source} />;
}
