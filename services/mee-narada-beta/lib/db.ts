import { createClient } from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const configured=Boolean(url&&key);
export const db=configured?createClient(url!,key!,{auth:{persistSession:typeof window!=="undefined",autoRefreshToken:typeof window!=="undefined",detectSessionInUrl:typeof window!=="undefined"}}):null;
export type Article={id:string;slug:string;headline_te:string|null;headline_en:string|null;dek_te:string|null;body_te:string|null;body_en:string|null;hero_image_url:string|null;category:string|null;status:string;published_at:string|null;created_at:string};
export type Gallery={id:string;slug:string;title_te:string|null;title_en:string|null;description_te:string|null;cover_image_url:string|null;status:string;created_at:string};
export function titleOf(v:{headline_te?:string|null;headline_en?:string|null;title_te?:string|null;title_en?:string|null}){return v.headline_te||v.title_te||v.headline_en||v.title_en||"Untitled";}
