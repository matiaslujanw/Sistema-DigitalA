import { QuickNoveltyForm } from "@/components/quick-novelty-form";
import { getAppData } from "@/lib/data";

export default async function NewNoveltyPage() {
  const data = await getAppData();

  return (
    <QuickNoveltyForm
      clients={data.clients}
      partnerNames={data.partnerProfiles.map((partner) => partner.name)}
      projects={data.projects}
      source={data.source}
    />
  );
}
