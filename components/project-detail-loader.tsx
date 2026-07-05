"use client";

import Link from "next/link";
import type { Client, Idea, Project, ProjectEvent, ProjectNote, ProjectPayment } from "@/lib/types";
import { ProjectDetailEditor } from "./project-detail-editor";

export function ProjectDetailLoader({
  initialClient,
  initialEvents,
  initialIdeas,
  initialNotes,
  initialPayments,
  initialProject,
  partnerNames,
  projectId,
  source
}: {
  initialClient: Client | null;
  initialEvents: ProjectEvent[];
  initialIdeas: Idea[];
  initialNotes: ProjectNote[];
  initialPayments: ProjectPayment[];
  initialProject: Project | null;
  partnerNames: string[];
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
      ideas={initialIdeas}
      initialNotes={initialNotes}
      initialPayments={initialPayments}
      initialProject={initialProject}
      partnerNames={partnerNames}
      source={source}
    />
  );
}
