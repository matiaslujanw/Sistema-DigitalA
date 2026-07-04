import { FinanceWorkspace } from "@/components/finance-workspace";
import { getAppData } from "@/lib/data";
import { getOverviewMetrics } from "@/lib/metrics";

export default async function FinancePage() {
  const data = await getAppData();
  const metrics = getOverviewMetrics(data);
  const projectNames = Object.fromEntries(data.projects.map((project) => [project.id, project.name]));

  return <FinanceWorkspace initialMovements={data.cashMovements} metrics={metrics} projectNames={projectNames} source={data.source} />;
}
