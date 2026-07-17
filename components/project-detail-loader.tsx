"use client";

import Link from "next/link";
import type { Client, Cost, Idea, Project, ProjectEvent, ProjectNote, ProjectPayment } from "@/lib/types";
import { ProjectDetailEditor } from "./project-detail-editor";

export function ProjectDetailLoader({
  initialClient,
  initialCosts,
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
  initialCosts: Cost[];
  initialEvents: ProjectEvent[];
  initialIdeas: Idea[];
  initialNotes: ProjectNote[];
  initialPayments: ProjectPayment[];
  initialProject: Project | null;
  partnerNames: string[];
  projectId: string;
  source: "mock" | "supabase";
}) {
  if (!initialProject) {
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
      costs={initialCosts}
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
