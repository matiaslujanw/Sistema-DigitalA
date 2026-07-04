import { cashMovements, costs, events, projects } from "./mock-data";
import type { CashDestination, ProjectStatus } from "./types";
import { projectStatuses } from "./project-statuses";

export function getOverviewMetrics() {
  const arsSold = projects.filter((project) => project.currency === "ARS").reduce((sum, project) => sum + project.salePrice, 0);
  const arsPaid = projects.filter((project) => project.currency === "ARS").reduce((sum, project) => sum + project.paidAmount, 0);
  const usdSold = projects.filter((project) => project.currency === "USD").reduce((sum, project) => sum + project.salePrice, 0);
  const usdPaid = projects.filter((project) => project.currency === "USD").reduce((sum, project) => sum + project.paidAmount, 0);
  const monthlyUsdCost = costs.filter((cost) => cost.currency === "USD" && cost.cadence === "Mensual").reduce((sum, cost) => sum + cost.amount, 0);
  const monthlyArsCost = costs.filter((cost) => cost.currency === "ARS" && cost.cadence === "Mensual").reduce((sum, cost) => sum + cost.amount, 0);
  const trackedHours = events.reduce((sum, event) => sum + event.hours, 0);
  const activeProjects = projects.filter((project) => project.status !== "En uso").length;

  return { activeProjects, arsPaid, arsSold, monthlyArsCost, monthlyUsdCost, trackedHours, usdPaid, usdSold };
}

export function getProjectsByStatus() {
  return projects.reduce<Record<ProjectStatus, number>>(
    (acc, project) => {
      acc[project.status] += 1;
      return acc;
    },
    Object.fromEntries(projectStatuses.map((status) => [status, 0])) as Record<ProjectStatus, number>
  );
}

export function getCashByDestination() {
  return cashMovements.reduce<Record<CashDestination, number>>(
    (acc, movement) => {
      acc[movement.destination] += movement.amount;
      return acc;
    },
    {
      Caja: 0,
      Cheques: 0,
      Dolares: 0,
      "Plazo fijo": 0,
      Reinversion: 0,
      "Reparto socios": 0
    }
  );
}
