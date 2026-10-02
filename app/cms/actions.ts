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

export async function saveMovieRelationships(form:FormData){
 const {supabase}=await staff();const movieId=String(form.get("_movie_id")||"");if(!movieId)throw new Error("Movie required");
 const creditRows=Number(form.get("_credit_rows")||0);const credits:Record<string,unknown>[]=[];
 for(let i=0;i<creditRows;i++){const personId=String(form.get("credit_person_"+i)||"");if(!personId)continue;credits.push({movie_id:movieId,person_id:personId,credit_type:String(form.get("credit_type_"+i)||"actor"),character_name_en:empty(form.get("character_en_"+i)),character_name_te:empty(form.get("character_te_"+i)),billing_order:form.get("billing_"+i)===""?null:Number(form.get("billing_"+i))})}
 const companyRows=Number(form.get("_company_rows")||0);const links:Record<string,unknown>[]=[];
 for(let i=0;i<companyRows;i++){const companyId=String(form.get("company_"+i)||"");if(!companyId)continue;links.push({movie_id:movieId,company_id:companyId,relationship_type:String(form.get("relationship_"+i)||"production").trim()||"production"})}
 const {error:creditDelete}=await supabase.from("movie_credits").delete().eq("movie_id",movieId);if(creditDelete)throw new Error(creditDelete.message);
 if(credits.length){const {error}=await supabase.from("movie_credits").insert(credits);if(error)throw new Error(error.message)}
 const {error:companyDelete}=await supabase.from("movie_companies").delete().eq("movie_id",movieId);if(companyDelete)throw new Error(companyDelete.message);
 if(links.length){const {error}=await supabase.from("movie_companies").insert(links);if(error)throw new Error(error.message)}
 revalidatePath("/cms/movies/"+movieId);revalidatePath("/cms/movies");redirect("/cms/movies/"+movieId)
}
