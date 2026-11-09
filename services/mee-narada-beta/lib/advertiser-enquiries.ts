export * from '../../../supabase/functions/advertising/validation';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {EnquiryForm} from '../../../supabase/functions/advertising/validation';
export const enquiryStatuses={new:'New',contacted:'Contacted',proposal_sent:'Proposal sent',booked:'Booked',closed:'Closed'} as const;
export type EnquiryStatus=keyof typeof enquiryStatuses;
export type AdvertiserEnquiry=EnquiryForm&{id:string;reference:string;status:EnquiryStatus;staff_notes:string;revision:number;created_at:string;updated_at:string};
export async function submitAdvertiserEnquiry(form:EnquiryForm,key:string,started:number,fax:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,apiKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!apiKey)throw Error('The enquiry form is temporarily unavailable.');
 const response=await fetch(url+'/functions/v1/advertising',{method:'POST',headers:{apikey:apiKey,'content-type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',body:JSON.stringify({action:'enquiry',form,submission_key:key,started_at:started,fax_number:fax}),signal:AbortSignal.timeout(25000)}),data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'We could not save your enquiry. Please try again.');if(!data.reference||!data.received_at)throw Error('We could not confirm receipt. Your text is still here; please try again.');return data as {reference:string;received_at:string};
}
export async function enquireRpc(client:SupabaseClient,args:Record<string,unknown>){const result=await client.rpc('studio_advertiser_enquiries',args);if(result.error?.code==='40001')throw Error('This enquiry changed in another session. Reopen it first.');if(result.error)throw result.error;return result.data}
