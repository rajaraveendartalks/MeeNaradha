export const goals={movie_promotion:'Movie / trailer promotion',brand_campaign:'Brand campaign',event:'Event / launch',other:'Other'} as const;
export const placements=['article_header','article_sidebar','article_inline','home_header','home_feed'] as const;
export type EnquiryForm={company:string;contact_name:string;email:string;phone:string;website:string;goal:keyof typeof goals;placement_interest:string;budget:string;start_date:string;end_date:string;brief:string;media_url:string;contact_consent:boolean};
export const emptyEnquiry:EnquiryForm={company:'',contact_name:'',email:'',phone:'',website:'',goal:'movie_promotion',placement_interest:'any',budget:'',start_date:'',end_date:'',brief:'',media_url:'',contact_consent:false};
export class EnquiryValidationError extends Error{constructor(public field:string,message:string){super(message);this.name='EnquiryValidationError'}}
export function validateEnquiry(input:unknown,today=new Date(Date.now()+330*60000).toISOString().slice(0,10)):EnquiryForm{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new EnquiryValidationError('form','Check your enquiry and try again.');const raw=input as Record<string,unknown>;
 const text=(key:keyof EnquiryForm,max:number,min=0)=>{if(typeof raw[key]!=='string')throw new EnquiryValidationError(key,'Please check this field.');const value=(raw[key] as string).trim();if(value.length<min||value.length>max||value.includes('\u0000'))throw new EnquiryValidationError(key,'Please check '+key.replaceAll('_',' ')+' (up to '+max+' characters).');return value};
 const form:EnquiryForm={company:text('company',160,2),contact_name:text('contact_name',100,2),email:text('email',254,5).toLowerCase(),phone:text('phone',40),website:text('website',2048),goal:text('goal',30) as EnquiryForm['goal'],placement_interest:text('placement_interest',30),budget:text('budget',80),start_date:text('start_date',10),end_date:text('end_date',10),brief:text('brief',3000,20),media_url:text('media_url',2048),contact_consent:raw.contact_consent===true};
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(form.email))throw new EnquiryValidationError('email','Enter a valid email address.');
 if(form.phone&&(!/^[+0-9().\-\s]+$/.test(form.phone)||form.phone.replace(/\D/g,'').length<7||form.phone.replace(/\D/g,'').length>18))throw new EnquiryValidationError('phone','Enter a valid phone number with country code.');
 if(!Object.hasOwn(goals,form.goal)||!['any',...placements].includes(form.placement_interest))throw new EnquiryValidationError('goal','Choose a campaign goal and placement.');
 for(const key of ['website','media_url'] as const)if(form[key]){try{const url=new URL(form[key]);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error();form[key]=url.href}catch{throw new EnquiryValidationError(key,'Use a link beginning with http:// or https://.')}}
 for(const key of ['start_date','end_date'] as const)if(form[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(form[key])||!Number.isFinite(Date.parse(form[key]+'T12:00:00Z'))||new Date(form[key]+'T12:00:00Z').toISOString().slice(0,10)!==form[key]||form[key]<today))throw new EnquiryValidationError(key,'Choose today or a future date.');
 if(form.start_date&&form.end_date&&form.end_date<form.start_date)throw new EnquiryValidationError('end_date','Choose an end date on or after the start date.');
 if(!form.contact_consent)throw new EnquiryValidationError('contact_consent','Allow Mee Narada to contact you about this enquiry.');return form;
}
export type AdEvent={campaign_id:string;placement:typeof placements[number];kind:'impression'|'viewable'|'click';display_id:string;article_id:string|null;category:string;device:'desktop'|'mobile'};
export function validateAdEvent(input:unknown):AdEvent{
 const uuid=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid event');const raw=input as Record<string,unknown>;
 if(!uuid(raw.campaign_id)||!uuid(raw.display_id)||!placements.includes(raw.placement as AdEvent['placement'])||!['impression','viewable','click'].includes(String(raw.kind))||!['desktop','mobile'].includes(String(raw.device))||typeof raw.category!=='string'||raw.category.length>64||raw.category!==''&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.category)||raw.article_id!==null&&!uuid(raw.article_id))throw Error('Invalid event');
 if(String(raw.placement).startsWith('article_')&&!uuid(raw.article_id)||String(raw.placement).startsWith('home_')&&raw.article_id!==null)throw Error('Invalid context');
 return {campaign_id:raw.campaign_id as string,display_id:raw.display_id as string,placement:raw.placement as AdEvent['placement'],kind:raw.kind as AdEvent['kind'],article_id:raw.article_id as string|null,category:raw.category,device:raw.device as AdEvent['device']};
}
