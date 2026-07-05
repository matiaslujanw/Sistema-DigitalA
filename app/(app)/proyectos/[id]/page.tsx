import { ProjectDetailLoader } from "@/components/project-detail-loader";
import { getProjectDetail } from "@/lib/data";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProjectDetail(id);

  return (
    <ProjectDetailLoader
      initialClient={detail.client}
      initialEvents={detail.events}
      initialNotes={detail.notes}
      initialPayments={detail.payments}
      initialProject={detail.project}
      projectId={id}
      source={detail.source}
    />
  );
}
