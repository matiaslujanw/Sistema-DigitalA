import type { ProjectStatus } from "@/lib/types";
import Link from "next/link";
import type { Route } from "next";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  actionHref
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
  actionHref?: Route;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && actionHref ? <Link className="command-button" href={actionHref}>{action}</Link> : null}
      {action && !actionHref ? <button className="command-button" type="button">{action}</button> : null}
    </header>
  );
}

export function StatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}

export function EmptyAction({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-action">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}
