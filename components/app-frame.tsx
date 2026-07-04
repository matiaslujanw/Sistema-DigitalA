"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

const routes = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/proyectos", label: "Proyectos", icon: "projects" },
  { href: "/ideas", label: "Ideas", icon: "ideas" },
  { href: "/cronograma", label: "Cronograma", icon: "calendar" },
  { href: "/finanzas", label: "Finanzas", icon: "finance" },
  { href: "/costos", label: "Costos", icon: "costs" },
  { href: "/socios", label: "Socios", icon: "partners" },
  { href: "/reuniones", label: "Reuniones", icon: "meetings" },
  { href: "/ajustes", label: "Ajustes", icon: "settings", separated: true }
] satisfies Array<{ href: Route; icon: string; label: string; separated?: boolean }>;

const routeMeta = [
  { match: "/dashboard", eyebrow: "Vista general" },
  { match: "/proyectos", eyebrow: "Portfolio de proyectos" },
  { match: "/ideas", eyebrow: "Notas e ideas" },
  { match: "/cronograma", eyebrow: "Cronograma maestro" },
  { match: "/finanzas", eyebrow: "Control financiero" },
  { match: "/costos", eyebrow: "Infraestructura y stack" },
  { match: "/socios", eyebrow: "Equipo ejecutivo" },
  { match: "/reuniones", eyebrow: "Agenda y reuniones" },
  { match: "/ajustes", eyebrow: "Configuracion" }
];

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const activeMeta = routeMeta.find((route) => pathname.startsWith(route.match)) ?? routeMeta[0];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("da-theme");
    const savedRail = window.localStorage.getItem("da-rail-collapsed");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    if (savedRail) setCollapsed(savedRail === "true");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("da-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("da-rail-collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <main className={`product-shell ${collapsed ? "rail-collapsed" : ""}`}>
      <aside className="rail">
        <Link className="brand-card" href="/dashboard" aria-label="Digital Amenities">
          <span className="rail-copy">
            <strong>Digital Amenities</strong>
            <small>Executive Suite</small>
          </span>
        </Link>

        <nav className="route-list" aria-label="Navegacion principal">
          {routes.map((route) => (
            <Link
              className={`${pathname.startsWith(route.href) ? "active" : ""} ${route.separated ? "separated" : ""}`}
              href={route.href}
              key={route.href}
            >
              <span className={`nav-icon nav-icon-${route.icon}`} aria-hidden="true" />
              <span>{collapsed ? route.label.slice(0, 2) : route.label}</span>
            </Link>
          ))}
        </nav>

        <div className="rail-status">
          <div className="rail-user-avatar" />
          <div className="rail-copy">
            <strong>J. Arquero</strong>
            <small>Managing Partner</small>
          </div>
        </div>

        <div className="rail-controls">
          <button
            aria-label={collapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
            className="icon-button rail-toggle"
            type="button"
            onClick={() => setCollapsed((current) => !current)}
          >
            <span aria-hidden="true" />
          </button>
          <button
            aria-label={theme === "dark" ? "Activar modo dia" : "Activar modo noche"}
            className="icon-button theme-button"
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            <span className={`theme-glyph ${theme === "dark" ? "theme-glyph-sun" : "theme-glyph-moon"}`} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <section className="screen">
        <header className="suite-topbar">
          <div className="suite-title">
            <strong>Executive Dashboard</strong>
            <span>{activeMeta.eyebrow}</span>
          </div>
          <div className="suite-actions">
            <label className="suite-search">
              <span aria-hidden="true" />
              <input placeholder="Buscar transaccion o proyecto" />
            </label>
            <button className="topbar-icon topbar-icon-bell" aria-label="Notificaciones" type="button" />
            <button className="topbar-icon topbar-icon-wallet" aria-label="Caja" type="button" />
            <button className="topbar-icon topbar-icon-switch" aria-label="Cambiar vista" type="button" />
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
