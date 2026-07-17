import { FinanceWorkspace } from "@/components/finance-workspace";
import { getAppData } from "@/lib/data";

export default async function FinancePage() {
  const data = await getAppData();
  const projectNames = Object.fromEntries(data.projects.map((project) => [project.id, project.name]));
  const partners = data.partnerProfiles
    .filter((partner) => partner.status === "Activo")
    .map((partner) => ({ id: partner.id, name: partner.name }));

  return (
    <FinanceWorkspace
      movements={data.cashMovements}
      partners={partners}
      payments={data.payments}
      projectNames={projectNames}
      source={data.source}
    />
  );
}
