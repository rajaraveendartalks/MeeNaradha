import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const origin = new URL(request.url).origin;
  if (!email || !password) return NextResponse.redirect(new URL("/cms/login?error=Email%20and%20password%20are%20required.", origin), 303);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.redirect(new URL("/cms/login?error=Invalid%20email%20or%20password.", origin), 303);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: role } = user ? await supabase.from("user_roles").select("role").eq("user_id", user.id).single() : { data: null };
  if (!role || !["editor","admin"].includes(role.role)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/cms/login?error=This%20account%20does%20not%20have%20CMS%20access.", origin), 303);
  }
  return NextResponse.redirect(new URL("/cms", origin), 303);
}
