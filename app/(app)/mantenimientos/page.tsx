import { MaintenanceWorkspace } from "@/components/maintenance-workspace";
import { getAppData } from "@/lib/data";

export default async function MaintenancePage() {
  const data = await getAppData();

  return (
    <MaintenanceWorkspace
      clients={data.clients}
      contracts={data.maintenanceContracts}
      projects={data.projects}
      source={data.source}
    />
  );
}
