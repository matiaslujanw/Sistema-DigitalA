import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppFrame } from "@/components/app-frame";
import { createSupabaseAuthServerClient, isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let userEmail: string | undefined;

  // Defense in depth: the middleware already gates access, but re-check server-side.
  // When Supabase auth isn't configured we skip the guard so mock-data dev keeps working.
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    userEmail = user.email ?? undefined;
  }

  return <AppFrame userEmail={userEmail}>{children}</AppFrame>;
}
