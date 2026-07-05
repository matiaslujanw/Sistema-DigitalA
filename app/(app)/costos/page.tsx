import { CostsWorkspace } from "@/components/costs-workspace";
import { getAppData } from "@/lib/data";

export default async function CostsPage() {
  const data = await getAppData();

  return <CostsWorkspace costs={data.costs} projects={data.projects} source={data.source} />;
}
