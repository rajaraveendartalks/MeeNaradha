"use server";
import { revalidatePath } from "next/cache";
import { requireCmsAccess } from "../../../lib/cms-auth";
import { createClient } from "@supabase/supabase-js";

function adminDb() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error("Telegram inbox backend is not configured.");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function reviewTelegramDraft(formData:FormData) {
 const {user}=await requireCmsAccess();
 const id=String(formData.get("id")||"");
 const decision=String(formData.get("decision")||"");
 const text=String(formData.get("raw_text")||"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid draft ID");
 if(!["in_review","rejected"].includes(decision)) throw new Error("Invalid review action");
 if(text.length<1||text.length>10000) throw new Error("News text must be 1–10,000 characters");
 const db=adminDb();
 const {data:existing,error:readError}=await db.from("telegram_news_intake").select("id,status").eq("id",id).single();
 if(readError||!existing) throw new Error("Draft not found");
 if(!["draft","in_review"].includes(existing.status)) throw new Error("Draft can no longer be changed");
 const {error}=await db.from("telegram_news_intake").update({raw_text:text,status:decision,updated_at:new Date().toISOString()}).eq("id",id).in("status",["draft","in_review"]);
 if(error) throw new Error("Unable to update draft");
 console.info("Telegram inbox review", {id,decision,editor:user.id});
 revalidatePath("/cms/telegram-inbox");
}
