"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth";
import { GearIcon, LogOutIcon, MoonIcon, SunIcon } from "@/components/ui-icons";

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

export function AppFrame({ children, userEmail }: { children: ReactNode; userEmail?: string }) {
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
        <div className="rail-header">
          <Link className="brand-card" href="/dashboard" aria-label="Digital Amenities">
            <span className="brand-mark" aria-hidden="true">DA</span>
            <span className="rail-copy">
              <strong>Digital Amenities</strong>
              <small>Executive Suite</small>
            </span>
          </Link>
        </div>

        <nav className="route-list" aria-label="Navegacion principal">
          {routes.map((route) => (
            <Link
              className={`${pathname.startsWith(route.href) ? "active" : ""} ${route.separated ? "separated" : ""}`}
              href={route.href}
              key={route.href}
              title={route.label}
            >
              {route.icon === "settings" ? (
                <GearIcon className="nav-svg-icon" />
              ) : (
                <span className={`nav-icon nav-icon-${route.icon}`} aria-hidden="true" />
              )}
              <span className="route-label">{route.label}</span>
            </Link>
          ))}
        </nav>

        <div className="rail-status">
          <div className="rail-user-avatar" />
          <div className="rail-copy">
            <strong title={userEmail ?? "Invitado"}>{userEmail ?? "Invitado"}</strong>
            <small>Admin</small>
          </div>
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
            <div className="suite-control-group">
              <button
                aria-label={collapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
                className="topbar-icon topbar-icon-rail rail-toggle"
                title={collapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
                type="button"
                onClick={() => setCollapsed((current) => !current)}
              >
                <span aria-hidden="true" />
              </button>
              <button
                aria-label={theme === "dark" ? "Activar modo dia" : "Activar modo noche"}
                className="topbar-icon theme-button"
                title={theme === "dark" ? "Activar modo dia" : "Activar modo noche"}
                type="button"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? <SunIcon className="button-icon theme-icon theme-icon-sun" /> : <MoonIcon className="button-icon theme-icon theme-icon-moon" />}
              </button>
              {userEmail ? (
                <form action={signOutAction}>
                  <button aria-label="Cerrar sesion" className="topbar-icon logout-button" title="Cerrar sesion" type="submit">
                    <LogOutIcon className="button-icon" />
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
