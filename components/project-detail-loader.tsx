"use client";

import Link from "next/link";
import type { Client, Project, ProjectEvent, ProjectNote, ProjectPayment } from "@/lib/types";
import { ProjectDetailEditor } from "./project-detail-editor";

export function ProjectDetailLoader({
  initialClient,
  initialEvents,
  initialNotes,
  initialPayments,
  initialProject,
  projectId,
  source
}: {
  initialClient: Client | null;
  initialEvents: ProjectEvent[];
  initialNotes: ProjectNote[];
  initialPayments: ProjectPayment[];
  initialProject: Project | null;
  projectId: string;
  source: "mock" | "supabase";
}) {
  if (!initialProject || !initialClient) {
    return (
      <section className="panel-block missing-project">
        <span className="eyebrow">Proyecto no encontrado</span>
        <strong>No encontramos este proyecto en {source === "supabase" ? "Supabase" : "los mocks"}.</strong>
        <Link className="command-button" href="/proyectos">Volver a proyectos</Link>
      </section>
    );
  }

  return (
    <ProjectDetailEditor
      client={initialClient}
      events={initialEvents}
      initialNotes={initialNotes}
      initialPayments={initialPayments}
      initialProject={initialProject}
      source={source}
    />
  );
}
