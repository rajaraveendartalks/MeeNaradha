export const applicantTypes=[['production_house','Production house'],['studio','Studio'],['creator','Independent creator']] as const;
export const requestContentTypes=[['article','Article'],['press_release','Press release'],['announcement','Launch announcement'],['interview','Interview']] as const;
export type ApplicantType=typeof applicantTypes[number][0];
export type RequestContentType=typeof requestContentTypes[number][0];
export type PublicationForm={applicant_type:ApplicantType;organisation_name:string;contact_name:string;email:string;phone:string;official_url:string;article_title:string;article_language:'te'|'en';category:string;content_type:RequestContentType;summary:string;article_body:string;article_url:string;media_url:string;preferred_date:string;rights_confirmed:boolean;contact_consent:boolean};
export const emptyPublicationForm:PublicationForm={applicant_type:'production_house',organisation_name:'',contact_name:'',email:'',phone:'',official_url:'',article_title:'',article_language:'te',category:'movies',content_type:'article',summary:'',article_body:'',article_url:'',media_url:'',preferred_date:'',rights_confirmed:false,contact_consent:false};
export class PublicationValidationError extends Error{constructor(public field:string,message:string){super(message);this.name='PublicationValidationError'}}
export function publicHttpUrl(value:string){
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null}catch{return null}
}
export function validatePublicationForm(input:unknown,today=new Date(Date.now()+330*60000).toISOString().slice(0,10)):PublicationForm{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new PublicationValidationError('form','Check the form and try again.');
  const raw=input as Record<string,unknown>;
  const value=(field:keyof PublicationForm,max:number,min=0)=>{const source=raw[field];if(typeof source!=='string')throw new PublicationValidationError(field,'Please check this field.');const text=source.trim();if(text.length<min)throw new PublicationValidationError(field,'Please add '+(field==='article_title'?'an article title':field.replaceAll('_',' '))+'.');if(text.length>max)throw new PublicationValidationError(field,'Please keep this field under '+max.toLocaleString('en-IN')+' characters.');if(text.includes('\u0000'))throw new PublicationValidationError(field,'Remove unsupported characters.');return text};
  if(!applicantTypes.some(row=>row[0]===raw.applicant_type))throw new PublicationValidationError('applicant_type','Choose production house, studio or creator.');
  if(!requestContentTypes.some(row=>row[0]===raw.content_type))throw new PublicationValidationError('content_type','Choose a content type.');
  if(!['te','en'].includes(String(raw.article_language)))throw new PublicationValidationError('article_language','Choose Telugu or English.');
  const result:PublicationForm={applicant_type:raw.applicant_type as ApplicantType,organisation_name:value('organisation_name',160,2),contact_name:value('contact_name',100,2),email:value('email',254,5).toLowerCase(),phone:value('phone',40),official_url:value('official_url',2048),article_title:value('article_title',240,6),article_language:raw.article_language as 'te'|'en',category:value('category',64,1),content_type:raw.content_type as RequestContentType,summary:value('summary',1000),article_body:value('article_body',30000),article_url:value('article_url',2048),media_url:value('media_url',2048),preferred_date:value('preferred_date',10),rights_confirmed:raw.rights_confirmed===true,contact_consent:raw.contact_consent===true};
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.email))throw new PublicationValidationError('email','Enter a valid email address.');
  if(result.phone&&(!/^[+0-9().\-\s]+$/.test(result.phone)||result.phone.replace(/\D/g,'').length<7||result.phone.replace(/\D/g,'').length>18))throw new PublicationValidationError('phone','Enter a valid phone number, including the country code.');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.category))throw new PublicationValidationError('category','Choose a category.');
  for(const field of ['official_url','article_url','media_url'] as const)if(result[field]){const url=publicHttpUrl(result[field]);if(!url)throw new PublicationValidationError(field,'Use a link starting with https:// or http://.');result[field]=url}
  if(result.article_body.length<80&&!result.article_url)throw new PublicationValidationError('article_body','Paste at least 80 characters of article text, or add a link to your draft.');
  if(result.preferred_date&&(!/^\d{4}-\d{2}-\d{2}$/.test(result.preferred_date)||!Number.isFinite(Date.parse(result.preferred_date+'T12:00:00Z'))||new Date(result.preferred_date+'T12:00:00Z').toISOString().slice(0,10)!==result.preferred_date||result.preferred_date<today))throw new PublicationValidationError('preferred_date','Choose today or a future date.');
  if(!result.rights_confirmed)throw new PublicationValidationError('rights_confirmed','Confirm that you are authorised to submit this content.');
  if(!result.contact_consent)throw new PublicationValidationError('contact_consent','Allow the editorial team to contact you about this request.');
  return result;
}
