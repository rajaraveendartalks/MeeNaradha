import type {SupabaseClient} from '@supabase/supabase-js';
import {publicHttpUrl} from './publication-requests';
export const adPlacementLabels={article_header:'Article · header banner',article_sidebar:'Article · right sidebar',article_inline:'Article · in the text',home_header:'Homepage · header banner',home_feed:'Homepage · between sections'} as const;
export type AdPlacementId=keyof typeof adPlacementLabels;
export const adPlacementIds=Object.keys(adPlacementLabels) as AdPlacementId[];
export type AdPlacement={id:AdPlacementId;enabled:boolean;desktop:boolean;mobile:boolean;google_slot:string};
export type AdSettings={publisher_id:string;google_enabled:boolean;consent_ready:boolean;placements:AdPlacement[]};
export const defaultAdSettings=():AdSettings=>({publisher_id:'',google_enabled:false,consent_ready:false,placements:adPlacementIds.map(id=>({id,enabled:true,desktop:true,mobile:id!=='article_sidebar',google_slot:''}))});
export type AdSettingsRecord={id:'website';config:AdSettings;revision:number;updated_at:string};
export type AdCampaign={id:string;name:string;advertiser:string;image_url:string;mobile_image_url:string;destination_url:string;alt_text:string;placements:AdPlacementId[];categories:string[];devices:('desktop'|'mobile')[];priority:number;enabled:boolean;starts_at:string;ends_at:string;revision:number;created_at:string;updated_at:string};
export type CampaignDraft=Omit<AdCampaign,'id'|'revision'|'created_at'|'updated_at'>;
export type AdInventory={config:AdSettings;campaigns:AdCampaign[];generated_at:string};
export const emptyAdInventory=():AdInventory=>({config:defaultAdSettings(),campaigns:[],generated_at:new Date().toISOString()});
export function blankCampaign():CampaignDraft{const now=new Date(),end=new Date(now.getTime()+7*86400000);return {name:'',advertiser:'',image_url:'',mobile_image_url:'',destination_url:'',alt_text:'',placements:['article_sidebar'],categories:[],devices:['desktop','mobile'],priority:10,enabled:false,starts_at:now.toISOString(),ends_at:end.toISOString()}}
export function validateAdSettings(config:AdSettings){
 if(config.publisher_id&&!/^ca-pub-\d{16}$/.test(config.publisher_id))throw Error('Enter the AdSense publisher ID in ca-pub- format.');
 if(config.placements.length!==5||new Set(config.placements.map(row=>row.id)).size!==5||config.placements.some(row=>!adPlacementIds.includes(row.id)||typeof row.enabled!=='boolean'||typeof row.desktop!=='boolean'||typeof row.mobile!=='boolean'||row.google_slot!==''&&!/^\d{5,20}$/.test(row.google_slot)))throw Error('Check the ad placements and Google slot IDs.');
 if(config.google_enabled&&(!config.publisher_id||!config.consent_ready||!config.placements.some(row=>row.enabled&&row.google_slot)))throw Error('Add your publisher ID, at least one slot ID, and confirm your Google approval and consent setup.');
 return config;
}
export function campaignPayload(form:CampaignDraft):CampaignDraft{
 const clean={...form,name:form.name.trim(),advertiser:form.advertiser.trim(),alt_text:form.alt_text.trim(),image_url:form.image_url.trim(),mobile_image_url:form.mobile_image_url.trim(),destination_url:form.destination_url.trim()};
 if(!clean.name||clean.name.length>120||!clean.advertiser||clean.advertiser.length>120||!clean.alt_text||clean.alt_text.length>180)throw Error('Add a campaign name, advertiser and descriptive banner text.');
 if(!publicHttpUrl(clean.image_url)||!publicHttpUrl(clean.destination_url)||clean.mobile_image_url&&!publicHttpUrl(clean.mobile_image_url)||[clean.image_url,clean.mobile_image_url,clean.destination_url].some(value=>value.length>2048))throw Error('Use valid http:// or https:// image and destination links.');
 if(!clean.placements.length||clean.placements.some(id=>!adPlacementIds.includes(id))||new Set(clean.placements).size!==clean.placements.length||!clean.devices.length||clean.devices.some(value=>!['desktop','mobile'].includes(value))||!Number.isInteger(clean.priority)||clean.priority<0||clean.priority>1000)throw Error('Choose placements, devices and a priority between 0 and 1000.');
 if(clean.placements.every(id=>id==='article_sidebar')&&!clean.devices.includes('desktop'))throw Error('The article sidebar is a desktop placement. Enable Desktop or choose another placement.');
 if(clean.categories.length>30||new Set(clean.categories).size!==clean.categories.length||clean.categories.some(value=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)))throw Error('Choose valid content categories.');
 if(!Number.isFinite(Date.parse(clean.starts_at))||!Number.isFinite(Date.parse(clean.ends_at))||Date.parse(clean.ends_at)<=Date.parse(clean.starts_at))throw Error('Choose an end time after the start time.');
 for(const field of ['image_url','mobile_image_url','destination_url'] as const)if(clean[field])clean[field]=publicHttpUrl(clean[field])!;
 const {name,advertiser,image_url,mobile_image_url,destination_url,alt_text,placements,categories,devices,priority,enabled,starts_at,ends_at}=clean;return {name,advertiser,image_url,mobile_image_url,destination_url,alt_text,placements,categories,devices,priority,enabled,starts_at,ends_at};
}
export async function loadAdInventory(client:SupabaseClient):Promise<AdInventory>{
 const [settings,campaigns]=await Promise.all([client.from('site_ad_settings').select('config').eq('id','website').maybeSingle(),client.from('site_ad_campaigns').select('*').eq('enabled',true).lte('starts_at',new Date().toISOString()).gt('ends_at',new Date().toISOString()).order('priority',{ascending:false}).limit(200)]);
 if(settings.error||campaigns.error)throw settings.error||campaigns.error;return {config:settings.data?.config||defaultAdSettings(),campaigns:(campaigns.data||[]) as AdCampaign[],generated_at:new Date().toISOString()};
}
export function chooseAd(inventory:AdInventory,placement:AdPlacementId,category:string,device:'desktop'|'mobile',now=Date.now(),seed=''){
 const slot=inventory.config.placements.find(row=>row.id===placement);if(!slot?.enabled||!slot[device])return null;
 const candidates=inventory.campaigns.filter(row=>row.enabled&&row.placements.includes(placement)&&row.devices.includes(device)&&(!row.categories.length||row.categories.includes(category))&&Date.parse(row.starts_at)<=now&&Date.parse(row.ends_at)>now).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
 if(!candidates.length)return null;const best=candidates.filter(row=>row.priority===candidates[0].priority);let hash=0;for(const character of seed)hash=(hash*31+character.charCodeAt(0))>>>0;return best[hash%best.length];
}
export async function loadAdManager(client:SupabaseClient){const [settings,campaigns]=await Promise.all([client.from('site_ad_settings').select('*').eq('id','website').single(),client.from('site_ad_campaigns').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(200)]);if(settings.error||campaigns.error)throw settings.error||campaigns.error;return {settings:settings.data as AdSettingsRecord,campaigns:(campaigns.data||[]) as AdCampaign[]}}
export async function moreAdCampaigns(client:SupabaseClient,offset:number){const result=await client.from('site_ad_campaigns').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+199);if(result.error)throw result.error;return (result.data||[]) as AdCampaign[]}
export async function saveAdSettings(client:SupabaseClient,config:AdSettings,original:AdSettingsRecord){const result=await client.from('site_ad_settings').update({config:validateAdSettings(config)}).eq('id','website').eq('revision',original.revision).select().maybeSingle();if(result.error)throw result.error;if(!result.data)throw Error('Ad settings changed in another session. Reload first.');return result.data as AdSettingsRecord}
export async function saveAdCampaign(client:SupabaseClient,form:CampaignDraft,original:AdCampaign|null){const payload=campaignPayload(form),result=original?await client.from('site_ad_campaigns').update(payload).eq('id',original.id).eq('revision',original.revision).select().maybeSingle():await client.from('site_ad_campaigns').insert(payload).select().single();if(result.error)throw result.error;if(!result.data)throw Error('This campaign changed in another session. Reload first.');return result.data as AdCampaign}
export function campaignState(row:AdCampaign,now=Date.now()){return !row.enabled?'Paused':Date.parse(row.ends_at)<=now?'Ended':Date.parse(row.starts_at)>now?'Scheduled':'Live'}
export type AdReport={totals:{impressions:number;viewable:number;clicks:number};campaigns:{campaign_id:string;name:string;impressions:number;viewable:number;clicks:number}[];placements:{placement:AdPlacementId;impressions:number;viewable:number;clicks:number}[]};
export async function loadAdReport(client:SupabaseClient,start:string,end:string):Promise<AdReport>{const result=await client.rpc('studio_ad_report',{p_start:start,p_end:end});if(result.error)throw result.error;return result.data}
// Campaign times are entered and displayed in India time, independent of staff device location.
export const indiaDateTimeInput=(value:string)=>new Date(Date.parse(value)+330*60000).toISOString().slice(0,16);
export const indiaDateTimeIso=(value:string)=>value?new Date(value+':00+05:30').toISOString():'';
