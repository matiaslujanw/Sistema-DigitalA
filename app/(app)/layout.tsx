import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppFrame } from "@/components/app-frame";
import { createSupabaseAuthServerClient, isSupabaseAuthConfigured, shouldRequireSupabaseAuth } from "@/lib/supabase/auth-server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let userEmail: string | undefined;

  // Defense in depth: the middleware already gates access, but re-check server-side.
  // Local dev can run without Supabase auth; production fails closed.
  if (shouldRequireSupabaseAuth()) {
    if (!isSupabaseAuthConfigured()) {
      redirect("/login");
    }

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
