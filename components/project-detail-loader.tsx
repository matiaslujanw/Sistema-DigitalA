"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { localKeys } from "@/lib/local-keys";
import type { Client, Project, ProjectEvent, ProjectNote, ProjectPayment } from "@/lib/types";
import { ProjectDetailEditor } from "./project-detail-editor";

type StoredProject = Project & {
  notes?: ProjectNote[];
  payments?: ProjectPayment[];
};

export function ProjectDetailLoader({
  initialClient,
  initialEvents,
  initialPayments,
  initialProject,
  projectId
}: {
  initialClient: Client | null;
  initialEvents: ProjectEvent[];
  initialPayments: ProjectPayment[];
  initialProject: Project | null;
  projectId: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [project, setProject] = useState<Project | null>(initialProject);
  const [client, setClient] = useState<Client | null>(initialClient);
  const [events, setEvents] = useState<ProjectEvent[]>(initialEvents);
  const [payments, setPayments] = useState<ProjectPayment[]>(initialPayments);
  const [notes, setNotes] = useState<ProjectNote[]>([]);

  useEffect(() => {
    const localProjects = readLocal<Project[]>(localKeys.projects, []);
    const localClients = readLocal<Client[]>(localKeys.clients, []);
    const localEvents = readLocal<ProjectEvent[]>(localKeys.events, []);
    const localNotes = readLocal<ProjectNote[]>(localKeys.notes, []);
    const savedProject = readLocal<StoredProject | null>(`da-project-${projectId}`, null);
    const resolvedProject = savedProject ?? localProjects.find((item) => item.id === projectId) ?? initialProject;
    const resolvedClient = resolvedProject
      ? localClients.find((item) => item.id === resolvedProject.clientId) ?? initialClient
      : initialClient;

    setProject(resolvedProject);
    setClient(resolvedClient);
    setEvents([...initialEvents, ...localEvents.filter((event) => event.projectId === projectId)]);
    setPayments(savedProject?.payments ?? initialPayments);
    setNotes(uniqueById([...(savedProject?.notes ?? []), ...localNotes.filter((note) => note.projectId === projectId)]));
    setLoaded(true);
  }, [initialClient, initialEvents, initialPayments, initialProject, projectId]);

  if (!loaded) return null;

  if (!project || !client) {
    return (
      <section className="panel-block missing-project">
        <span className="eyebrow">Proyecto no encontrado</span>
        <strong>No encontramos este proyecto local ni en los mocks.</strong>
        <Link className="command-button" href="/proyectos">Volver a proyectos</Link>
      </section>
    );
  }

  return (
    <ProjectDetailEditor
      client={client}
      events={events}
      initialNotes={notes}
      initialPayments={payments}
      initialProject={project}
    />
  );
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
