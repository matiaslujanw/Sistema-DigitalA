import { SettingsWorkspace } from "@/components/settings-workspace";
import { getAppData } from "@/lib/data";
import { createSupabaseAuthServerClient, isSupabaseAuthConfigured } from "@/lib/supabase/auth-server";

export default async function AjustesPage() {
  const data = await getAppData();

  let userEmail: string | null = null;
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null;

  return <SettingsWorkspace source={data.source} supabaseHost={supabaseHost} userEmail={userEmail} />;
}
