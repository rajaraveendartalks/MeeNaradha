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
 if(module.slug==="contests"){const start=payload.starts_at?new Date(String(payload.starts_at)):null;const end=payload.ends_at?new Date(String(payload.ends_at)):null;if(start&&end&&end<=start)throw new Error("Contest end time must be after the start time");if(payload.status==="published"&&!payload.rules_en&&!payload.rules_te)throw new Error("Published contests require participation rules");}
 if(module.slug==="polls"){const start=payload.starts_at?new Date(String(payload.starts_at)):null;const end=payload.ends_at?new Date(String(payload.ends_at)):null;if(start&&end&&end<=start)throw new Error("Poll end time must be after the start time");}
 if(module.slug==="reviews"){const rating=payload.rating as number|null;if(rating!==null&&(rating<0||rating>10))throw new Error("Review rating must be between 0 and 10");if(payload.movie_id&&payload.ott_title_id)throw new Error("Choose either a Movie or an OTT title, not both");}
 if(module.slug==="box-office"){if(!payload.movie_id)throw new Error("Select a movie");const rank=payload.rank as number|null;if(rank===null||rank<1||rank>5||!Number.isInteger(rank))throw new Error("Rank must be a whole number from 1 to 5");const weeks=payload.weeks_released as number|null;if(weeks!==null&&(weeks<0||!Number.isInteger(weeks)))throw new Error("Weeks released must be a non-negative whole number");const start=payload.period_start?new Date(String(payload.period_start)):null;const end=payload.period_end?new Date(String(payload.period_end)):null;if(start&&end&&end<start)throw new Error("Period end cannot be before period start");for(const key of ["gross_amount","net_amount"]){const value=payload[key] as number|null;if(value!==null&&value<0)throw new Error("Box Office amounts cannot be negative");}}
 const now=new Date().toISOString();
 let ottVideoId:string|null=null;
 if(module.slug==="ott"){
  payload.category="ott";
  const sourceUrl=String(form.get("_ott_video_url")||"").trim();
  if(sourceUrl){
   let externalId=""; let platform="video"; try{const u=new URL(sourceUrl);if(u.hostname==="youtu.be"){platform="youtube";externalId=u.pathname.split("/").filter(Boolean)[0]||""}else if(u.hostname.includes("youtube.com")){platform="youtube";externalId=u.searchParams.get("v")||"";if(!externalId){const p=u.pathname.split("/").filter(Boolean);if(["shorts","embed","live"].includes(p[0]))externalId=p[1]||""}}else if(u.hostname.includes("instagram.com"))platform="instagram";else if(u.hostname.includes("facebook.com")||u.hostname.includes("fb.watch"))platform="facebook";else if(u.hostname==="x.com"||u.hostname.includes("twitter.com"))platform="x"}catch{}
   let video:any=null;const existing=await supabase.from("videos").select("id").eq("video_url",sourceUrl).maybeSingle();if(existing.error)throw new Error(existing.error.message);video=existing.data;
   if(!video&&externalId){const byId=await supabase.from("videos").select("id").eq("external_id",externalId).maybeSingle();if(byId.error)throw new Error(byId.error.message);video=byId.data}
   if(!video){const thumb=externalId?`https://i.ytimg.com/vi/${externalId}/maxresdefault.jpg`:payload.hero_image_url||null;const created=await supabase.from("videos").insert({slug:String(payload.slug||externalId||crypto.randomUUID())+"-video",title_en:String(payload.headline_en||"OTT Video"),title_te:payload.headline_te||null,description_en:payload.dek_en||null,description_te:payload.dek_te||null,platform,external_id:externalId||null,video_url:sourceUrl,thumbnail_url:thumb,status:payload.status||"draft",updated_at:now}).select("id").single();if(created.error)throw new Error(created.error.message);video=created.data}
   ottVideoId=video?.id||null;
  }
 }
 if(module.slug==="short-films"){
  const sourceUrl=String(form.get("_short_film_video_url")||"").trim();
  if(sourceUrl){
   let externalId=""; try{const u=new URL(sourceUrl); if(u.hostname==="youtu.be")externalId=u.pathname.split("/").filter(Boolean)[0]||""; else if(u.hostname.includes("youtube.com")){externalId=u.searchParams.get("v")||""; if(!externalId){const p=u.pathname.split("/").filter(Boolean); if(["shorts","embed","live"].includes(p[0]))externalId=p[1]||""}}}catch{}
   let video:any=null;
   const existing=await supabase.from("videos").select("id").eq("video_url",sourceUrl).maybeSingle(); if(existing.error)throw new Error(existing.error.message); video=existing.data;
   if(!video&&externalId){const byId=await supabase.from("videos").select("id").eq("external_id",externalId).maybeSingle(); if(byId.error)throw new Error(byId.error.message); video=byId.data}
   if(!video){const title=String(payload.title_en||payload.slug||"Short Film"); const thumb=externalId?`https://i.ytimg.com/vi/${externalId}/maxresdefault.jpg`:payload.poster_url||null; const created=await supabase.from("videos").insert({slug:String(payload.slug||externalId||crypto.randomUUID()),title_en:title,title_te:payload.title_te||null,description_en:payload.synopsis_en||null,description_te:payload.synopsis_te||null,platform:externalId?"youtube":"video",external_id:externalId||null,video_url:sourceUrl,thumbnail_url:thumb,status:payload.status||"draft",updated_at:now}).select("id").single(); if(created.error)throw new Error(created.error.message); video=created.data}
   payload.video_id=video?.id||null; if(!payload.poster_url&&externalId)payload.poster_url=`https://i.ytimg.com/vi/${externalId}/maxresdefault.jpg`;
  }
 }
 if(module.slug!=="box-office")payload.updated_at=now;
 if(hasPublishedAt.has(module.slug)&&payload.status==="published")payload.published_at=now;
 let saved:any,error:any;if(id)({data:saved,error}=await supabase.from(module.table).update(payload).eq("id",id).select().single());else({data:saved,error}=await supabase.from(module.table).insert(payload).select().single());if(error)throw new Error(error.message);
 if(module.entityType&&saved?.id){const canonical=String(saved.slug||saved.id);const {data:entity,error:entityError}=await supabase.from("entity_registry").upsert({entity_type:module.entityType,entity_id:saved.id,canonical_slug:canonical},{onConflict:"entity_type,entity_id"}).select("id").single();if(entityError)throw new Error(entityError.message);if(entity?.id){const {data:item}=await supabase.from("editorial_items").select("id").eq("entity_id",entity.id).maybeSingle();const workflow=saved.status||"draft";const editorial={workflow_status:workflow,published_at:workflow==="published"?now:null,updated_at:now,assigned_editor_ref:user.id};if(item)await supabase.from("editorial_items").update(editorial).eq("id",item.id);else await supabase.from("editorial_items").insert({entity_id:entity.id,...editorial})}}
 if(module.slug==="ott"&&saved?.id&&ottVideoId){const [from,to]=await Promise.all([supabase.from("entity_registry").select("id").eq("entity_type","news_article").eq("entity_id",saved.id).single(),supabase.from("entity_registry").upsert({entity_type:"video",entity_id:ottVideoId,canonical_slug:String(payload.slug||ottVideoId)+"-video"},{onConflict:"entity_type,entity_id"}).select("id").single()]);if(from.error)throw new Error(from.error.message);if(to.error)throw new Error(to.error.message);const metadata={editorial_type:String(form.get("_ott_editorial_type")||"ott_news"),platform:String(form.get("_ott_platform")||""),title_name:String(form.get("_ott_title_name")||""),release_date:String(form.get("_ott_release_date")||"")};await supabase.from("entity_relations").delete().eq("from_entity_id",from.data.id).eq("relation_type","featured_video");const rel=await supabase.from("entity_relations").insert({from_entity_id:from.data.id,to_entity_id:to.data.id,relation_type:"featured_video",sort_order:0,metadata});if(rel.error)throw new Error(rel.error.message)}
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


export async function saveGalleryImages(form:FormData){
 const {supabase}=await staff();const galleryId=String(form.get("_gallery_id")||"");if(!galleryId)throw new Error("Gallery required");
 const rows=Number(form.get("_gallery_rows")||0);const images:Record<string,unknown>[]=[];
 for(let i=0;i<rows;i++){const imageUrl=String(form.get("gallery_image_"+i)||"").trim();if(!imageUrl)continue;images.push({gallery_id:galleryId,image_url:imageUrl,alt_en:empty(form.get("gallery_alt_en_"+i)),alt_te:empty(form.get("gallery_alt_te_"+i)),caption_en:empty(form.get("gallery_caption_en_"+i)),caption_te:empty(form.get("gallery_caption_te_"+i)),credit:empty(form.get("gallery_credit_"+i)),sort_order:form.get("gallery_order_"+i)===""?i:Number(form.get("gallery_order_"+i))})}
 const {error:removeError}=await supabase.from("gallery_images").delete().eq("gallery_id",galleryId);if(removeError)throw new Error(removeError.message);
 if(images.length){const {error}=await supabase.from("gallery_images").insert(images);if(error)throw new Error(error.message)}
 revalidatePath("/cms/galleries/"+galleryId);revalidatePath("/cms/galleries");redirect("/cms/galleries/"+galleryId)
}

export async function savePollOptions(form:FormData){
 const {supabase}=await staff();const pollId=String(form.get("_poll_id")||"");if(!pollId)throw new Error("Poll required");
 const rows=Number(form.get("_poll_option_rows")||0);const options:Record<string,unknown>[]=[];
 for(let i=0;i<rows;i++){const labelEn=String(form.get("poll_option_en_"+i)||"").trim();if(!labelEn)continue;options.push({poll_id:pollId,label_en:labelEn,label_te:empty(form.get("poll_option_te_"+i)),sort_order:form.get("poll_option_order_"+i)===""?i:Number(form.get("poll_option_order_"+i))})}
 if(options.length<2)throw new Error("Add at least two poll options");
 const existing=await supabase.from("poll_options").select("id").eq("poll_id",pollId);if(existing.error)throw new Error(existing.error.message);
 const existingIds=(existing.data||[]).map((x:any)=>x.id);if(existingIds.length){const votes=await supabase.from("poll_votes").select("id").in("option_id",existingIds).limit(1);if(votes.error)throw new Error(votes.error.message);if(votes.data?.length)throw new Error("Poll options cannot be replaced after voting has started");}
 const removed=await supabase.from("poll_options").delete().eq("poll_id",pollId);if(removed.error)throw new Error(removed.error.message);const added=await supabase.from("poll_options").insert(options);if(added.error)throw new Error(added.error.message);
 revalidatePath("/cms/polls/"+pollId);revalidatePath("/cms/polls");redirect("/cms/polls/"+pollId)
}
