"use client";

import { useEffect, useState } from "react";
import { signOutAction } from "@/app/actions/auth";

export function SettingsWorkspace({
  source,
  supabaseHost,
  userEmail
}: {
  source: "mock" | "supabase";
  supabaseHost: string | null;
  userEmail: string | null;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("da-theme");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
  }, []);

  function applyTheme(next: "dark" | "light") {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("da-theme", next);
  }

  return (
    <section className="executive-page settings-command">
      <header className="command-header">
        <div>
          <h1>Ajustes</h1>
          <p>Cuenta, apariencia y estado de la fuente de datos del sistema.</p>
        </div>
      </header>

      <div className="settings-grid">
        <article className="executive-panel settings-panel">
          <h2>Cuenta</h2>
          <div className="settings-row">
            <span>Usuario</span>
            <strong>{userEmail ?? "Sin sesion (modo local)"}</strong>
          </div>
          <div className="settings-row">
            <span>Rol</span>
            <strong>Admin</strong>
          </div>
          <p className="settings-note">
            Los usuarios se crean desde el panel de Supabase, en Authentication → Users. Por ahora todos los socios comparten el rol admin.
          </p>
          {userEmail ? (
            <form action={signOutAction}>
              <button className="ghost-button settings-danger" type="submit">Cerrar sesion</button>
            </form>
          ) : null}
        </article>

        <article className="executive-panel settings-panel">
          <h2>Apariencia</h2>
          <div className="settings-row">
            <span>Tema</span>
            <div className="settings-theme-picker" role="radiogroup" aria-label="Tema">
              <button className={theme === "dark" ? "active" : ""} type="button" onClick={() => applyTheme("dark")}>
                Noche
              </button>
              <button className={theme === "light" ? "active" : ""} type="button" onClick={() => applyTheme("light")}>
                Dia
              </button>
            </div>
          </div>
          <p className="settings-note">La preferencia se guarda en este navegador y tambien se puede cambiar desde el sidebar.</p>
        </article>

        <article className="executive-panel settings-panel">
          <h2>Fuente de datos</h2>
          <div className="settings-row">
            <span>Estado</span>
            <strong className={source === "supabase" ? "settings-ok" : "settings-warn"}>
              {source === "supabase" ? "Supabase conectado" : "Datos mock locales"}
            </strong>
          </div>
          <div className="settings-row">
            <span>Proyecto</span>
            <strong>{supabaseHost ?? "Sin configurar"}</strong>
          </div>
          <p className="settings-note">
            {source === "supabase"
              ? "Los proyectos, pagos, reuniones y movimientos se guardan en Supabase y se comparten entre socios."
              : "Configura NEXT_PUBLIC_SUPABASE_URL y las claves en .env.local, aplica supabase/schema.sql y corre npm run seed:supabase."}
          </p>
        </article>
      </div>
    </section>
  );
}
