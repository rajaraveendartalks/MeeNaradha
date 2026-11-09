export * from '../../../supabase/functions/publishing-requests/validation';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {PublicationForm} from '../../../supabase/functions/publishing-requests/validation';
export const publicationStatuses={submitted:'New request',in_review:'In review',needs_changes:'Changes requested',accepted:'Accepted for editing',declined:'Declined',draft_created:'Article draft created'} as const;
export type PublicationStatus=keyof typeof publicationStatuses;
export type PublicationRequest=PublicationForm&{id:string;reference:string;status:PublicationStatus;internal_notes:string;article_id:string|null;revision:number;created_at:string;updated_at:string};
export type PublicationListItem=Pick<PublicationRequest,'id'|'reference'|'status'|'organisation_name'|'applicant_type'|'article_title'|'email'|'category'|'created_at'|'article_id'|'revision'>;
export type PublicationReceipt={reference:string;received_at:string};
export async function submitPublicationForm(form:PublicationForm,key:string,startedAt:number,faxNumber:string):Promise<PublicationReceipt>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,apiKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!apiKey)throw Error('The publishing form is temporarily unavailable. Please try again later.');
  const response=await fetch(url+'/functions/v1/publishing-requests',{method:'POST',headers:{'content-type':'application/json',apikey:apiKey},credentials:'omit',referrerPolicy:'no-referrer',body:JSON.stringify({form,submission_key:key,started_at:startedAt,fax_number:faxNumber}),signal:AbortSignal.timeout(25000)});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'We could not save your request. Please try again.');
  if(!data.reference||!data.received_at)throw Error('We could not confirm your request. Please try again.');return data;
}
export async function loadPublicationRequests(client:SupabaseClient,status:string,search:string,page:number):Promise<{items:PublicationListItem[];count:number}>{const result=await client.rpc('studio_list_publication_requests',{p_status:status,p_search:search.trim().slice(0,100),p_page:page});if(result.error)throw result.error;return result.data}
export async function loadPublicationRequest(client:SupabaseClient,id:string):Promise<PublicationRequest>{const result=await client.rpc('studio_get_publication_request',{p_id:id});if(result.error)throw result.error;if(!result.data)throw Error('This publishing request was not found.');return result.data}
export async function reviewPublicationRequest(client:SupabaseClient,row:PublicationRequest,status:PublicationStatus,notes:string):Promise<PublicationRequest>{const result=await client.rpc('studio_review_publication_request',{p_id:row.id,p_revision:row.revision,p_status:status,p_notes:notes.trim()});if(result.error?.code==='40001')throw Error('This request changed in another session. Reopen it before saving.');if(result.error)throw result.error;return result.data}
export async function createPublicationDraft(client:SupabaseClient,row:PublicationRequest):Promise<{article_id:string}>{const result=await client.rpc('studio_publication_request_draft',{p_id:row.id,p_revision:row.revision});if(result.error?.code==='40001')throw Error('This request changed in another session. Reopen it before creating a draft.');if(result.error)throw result.error;return result.data}
