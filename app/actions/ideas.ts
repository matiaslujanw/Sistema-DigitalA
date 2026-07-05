"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IdeaUrgency } from "@/lib/types";

type IdeaInput = {
  body: string;
  kind: string;
  need: string;
  title: string;
  urgency: IdeaUrgency;
};

export async function createIdeaAction(input: IdeaInput) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ideas")
    .insert({
      body: input.body,
      kind: input.kind || "Nota",
      need: input.need,
      title: input.title || "Nota sin titulo",
      urgency: input.urgency
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/ideas");
  return data.id as string;
}

export async function updateIdeaAction(ideaId: string, input: IdeaInput) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("ideas")
    .update({
      body: input.body,
      kind: input.kind || "Nota",
      need: input.need,
      title: input.title || "Nota sin titulo",
      updated_at: new Date().toISOString(),
      urgency: input.urgency
    })
    .eq("id", ideaId);

  if (error) throw new Error(error.message);

  revalidatePath("/ideas");
}

export async function deleteIdeaAction(ideaId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("ideas").delete().eq("id", ideaId);

  if (error) throw new Error(error.message);

  revalidatePath("/ideas");
}
