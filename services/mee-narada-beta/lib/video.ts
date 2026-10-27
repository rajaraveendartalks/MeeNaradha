export type VideoSummary={id:string;slug:string;title_en:string|null;title_te:string|null;thumbnail_url:string|null;content_type:string|null};
export function videoLabel(type:string|null){return ({trailer:"Trailer · ట్రైలర్",song:"Song · పాట",short_film:"Short Film · షార్ట్ ఫిల్మ్",reel:"Reel · రీల్"} as Record<string,string>)[type||""]||"Video · వీడియో";}
export function videoTitle(video:VideoSummary){return video.title_te||video.title_en||"Mee Narada video";}
