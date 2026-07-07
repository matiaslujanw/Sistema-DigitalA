"use server";

import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient, isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";

export async function signOutAction() {
  if (!isSupabaseAuthConfigured()) {
    redirect("/login");
  }

  const supabase = await createSupabaseAuthServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
