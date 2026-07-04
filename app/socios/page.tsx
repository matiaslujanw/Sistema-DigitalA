import { PageHeader } from "@/components/ui";
import { events, partnerProfiles, projects } from "@/lib/mock-data";

export default function PartnersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Equipo"
        title="Socios, foco y carga operativa."
        description="La informacion de socios sale del sidebar y pasa a una ruta propia para usuarios, perfiles y responsabilidades."
        action="Invitar usuario"
      />

      <section className="people-grid">
        {partnerProfiles.map((partner) => {
          const assignedProjects = projects.filter((project) => project.partners.includes(partner.name));
          const trackedHours = events.filter((event) => event.owner === partner.name).reduce((sum, event) => sum + event.hours, 0);

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
                  <strong>{trackedHours}</strong>
                </div>
              </div>
              <footer>{partner.email}</footer>
            </article>
          );
        })}
      </section>
    </>
  );
}
