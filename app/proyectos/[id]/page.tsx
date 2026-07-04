import { ProjectDetailLoader } from "@/components/project-detail-loader";
import { clients, events, projectPayments, projects } from "@/lib/mock-data";

export function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = projects.find((item) => item.id === id);
  const client = project ? clients.find((item) => item.id === project.clientId) ?? null : null;

  return (
    <ProjectDetailLoader
      initialClient={client}
      initialEvents={project ? events.filter((event) => event.projectId === project.id) : []}
      initialPayments={project ? projectPayments.filter((payment) => payment.projectId === project.id) : []}
      initialProject={project ?? null}
      projectId={id}
    />
  );
}
