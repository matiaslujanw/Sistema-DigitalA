import { getAppData } from "@/lib/data";

export default async function PartnersPage() {
  const data = await getAppData();
  const activePartners = data.partnerProfiles.filter((partner) => partner.status === "Activo");
  const totalHours = data.events.reduce((sum, event) => sum + event.hours, 0);
  const coveredProjects = data.projects.filter((project) => project.partners.length > 0).length;
  const avgAllocation =
    data.partnerProfiles.length > 0
      ? Math.round(data.partnerProfiles.reduce((sum, partner) => sum + partner.allocation, 0) / data.partnerProfiles.length)
      : 0;

  return (
    <section className="executive-page partners-command">
      <header className="command-header">
        <div>
          <h1>Equipo Ejecutivo</h1>
          <p>Socios, foco operativo y carga de trabajo. Los usuarios se gestionan desde Supabase Auth (ver Ajustes).</p>
        </div>
      </header>

      <section className="ops-kpis">
        <article className="ops-kpi blue">
          <i aria-hidden="true" />
          <span>{data.partnerProfiles.length} perfiles</span>
          <small>Socios activos</small>
          <strong>{activePartners.length}</strong>
        </article>
        <article className="ops-kpi green">
          <i aria-hidden="true" />
          <span>Toda la operacion</span>
          <small>Horas registradas</small>
          <strong>{Math.round(totalHours)} hs</strong>
        </article>
        <article className="ops-kpi orange">
          <i aria-hidden="true" />
          <span>De {data.projects.length} en cartera</span>
          <small>Proyectos con socios asignados</small>
          <strong>{coveredProjects}</strong>
        </article>
        <article className="ops-kpi neutral">
          <i aria-hidden="true" />
          <span>Promedio del equipo</span>
          <small>Asignacion</small>
          <strong>{avgAllocation}%</strong>
        </article>
      </section>

      <section className="people-grid">
        {data.partnerProfiles.map((partner) => {
          const assignedProjects = data.projects.filter((project) => project.partners.includes(partner.name));
          const trackedHours = data.events.filter((event) => event.owner === partner.name).reduce((sum, event) => sum + event.hours, 0);

          return (
            <article className="person-card" key={partner.id}>
              <div className="person-avatar">{partner.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <span>{partner.status}</span>
                <strong>{partner.name}</strong>
                <small>{partner.role}</small>
              </div>
              <p>{partner.focus}</p>
              <div className="person-stats">
                <div>
                  <span>Asignacion</span>
                  <strong>{partner.allocation}%</strong>
                </div>
                <div>
                  <span>Proyectos</span>
                  <strong>{assignedProjects.length}</strong>
                </div>
                <div>
                  <span>Horas</span>
                  <strong>{Math.round(trackedHours)}</strong>
                </div>
              </div>
              <footer>{partner.email}</footer>
            </article>
          );
        })}
      </section>
    </section>
  );
}
