import { CronogramaWorkspace } from "@/components/cronograma-workspace";
import { getAppData } from "@/lib/data";

export default async function CronogramaPage() {
  const data = await getAppData();

  return <CronogramaWorkspace clients={data.clients} events={data.events} projects={data.projects} />;
}
