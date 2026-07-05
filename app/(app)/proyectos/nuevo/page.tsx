import { NewProjectForm } from "@/components/new-project-form";

export default async function NewProjectPage({
  searchParams
}: {
  searchParams: Promise<{ detalle?: string; nombre?: string }>;
}) {
  const params = await searchParams;

  return <NewProjectForm initialName={params.nombre ?? ""} initialDetail={params.detalle ?? ""} />;
}
