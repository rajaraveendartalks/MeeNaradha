export type ConsentData={cmpStatus?:string;eventStatus?:string;gdprApplies?:boolean;tcString?:string;purpose?:{consents?:Record<number,boolean>};vendor?:{consents?:Record<number,boolean>};listenerId?:number};
export function googleConsentAllowed(data:ConsentData,success:boolean){
 if(!success||data.cmpStatus!=='loaded'||!['tcloaded','useractioncomplete'].includes(data.eventStatus||''))return false;
 if(data.gdprApplies===false)return true;
 return data.gdprApplies===true&&Boolean(data.tcString&&data.vendor?.consents?.[755]&&data.purpose?.consents?.[1]&&data.purpose?.consents?.[3]&&data.purpose?.consents?.[4]);
}
