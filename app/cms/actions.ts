"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { getCmsModule } from "../../lib/cms";
async function staff(){const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Authentication required");const {data}=await supabase.from("user_roles").select("role").eq("user_id",user.id).single();if(!data||!["editor","admin"].includes(data.role))throw new Error("Editor or admin role required");return{supabase,user,role:data.role as "editor"|"admin"}}
const empty=(v:FormDataEntryValue|null)=>v===""?null:v;
const hasPublishedAt=new Set(["movies","news","galleries","videos","reviews"]);
export async function saveContent(form:FormData){
 const {supabase,user}=await staff();const module=getCmsModule(String(form.get("_module")));if(!module)throw new Error("Unknown CMS module");
 const id=String(form.get("_id")||"");const payload:Record<string,unknown>={};
 for(const f of module.fields){const raw=form.get(f.name);if(f.type==="checkbox")payload[f.name]=raw==="on";else if(f.type==="number")payload[f.name]=raw===""||raw===null?null:Number(raw);else payload[f.name]=empty(raw)}
 const now=new Date().toISOString();
 if(module.slug!=="box-office")payload.updated_at=now;
 if(hasPublishedAt.has(module.slug)&&payload.status==="published")payload.published_at=now;
 let saved:any,error:any;if(id)({data:saved,error}=await supabase.from(module.table).update(payload).eq("id",id).select().single());else({data:saved,error}=await supabase.from(module.table).insert(payload).select().single());if(error)throw new Error(error.message);
 if(module.entityType&&saved?.id){const canonical=String(saved.slug||saved.id);const {data:entity,error:entityError}=await supabase.from("entity_registry").upsert({entity_type:module.entityType,entity_id:saved.id,canonical_slug:canonical},{onConflict:"entity_type,entity_id"}).select("id").single();if(entityError)throw new Error(entityError.message);if(entity?.id){const {data:item}=await supabase.from("editorial_items").select("id").eq("entity_id",entity.id).maybeSingle();const workflow=saved.status||"draft";const editorial={workflow_status:workflow,published_at:workflow==="published"?now:null,updated_at:now,assigned_editor_ref:user.id};if(item)await supabase.from("editorial_items").update(editorial).eq("id",item.id);else await supabase.from("editorial_items").insert({entity_id:entity.id,...editorial})}}
 revalidatePath("/cms");revalidatePath("/cms/"+module.slug);redirect("/cms/"+module.slug)
}
export async function deleteContent(form:FormData){const {supabase,role}=await staff();if(role!=="admin")throw new Error("Admin role required");const module=getCmsModule(String(form.get("_module")));const id=String(form.get("_id")||"");if(!module||!id)throw new Error("Invalid delete");const {error}=await supabase.from(module.table).delete().eq("id",id);if(error)throw new Error(error.message);revalidatePath("/cms/"+module.slug);redirect("/cms/"+module.slug)}
