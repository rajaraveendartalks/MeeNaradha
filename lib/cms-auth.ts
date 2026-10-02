import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export async function requireCmsAccess() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/cms/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleRow || !["editor", "admin"].includes(roleRow.role)) {
    redirect("/cms/login?error=CMS%20access%20is%20restricted.");
  }

  return { supabase, user, role: roleRow.role as "editor" | "admin" };
}
