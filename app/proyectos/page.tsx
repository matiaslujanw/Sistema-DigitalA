import { ProjectsWorkspace } from "@/components/projects-workspace";
import { getAppData } from "@/lib/data";

export default async function ProjectsPage() {
  const data = await getAppData();

  return (
    <ProjectsWorkspace
      clients={data.clients}
      events={data.events}
      payments={data.payments}
      projects={data.projects}
      source={data.source}
    />
  );
}
