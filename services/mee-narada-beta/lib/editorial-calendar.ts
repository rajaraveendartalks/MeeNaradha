import type {SupabaseClient} from '@supabase/supabase-js';
import {safeHttpUrl} from './rich-content';

export type CalendarKind='birthday'|'important_day'|'milestone';
export const calendarKinds:Record<CalendarKind,string>={birthday:'Birthdays',important_day:'Important days',milestone:'Milestones'};
export type CalendarEntry={id:string;title:string;event_date:string;kind:CalendarKind;annual:boolean;notes:string;source_url:string;archived:boolean;revision:number};
export type CalendarOccurrence=CalendarEntry&{date:string;years:number;directory:boolean};
export type CalendarDraft=Omit<CalendarEntry,'id'|'revision'|'archived'>;
export const istDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const shiftDate=(date:string,days:number)=>{const value=new Date(date+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)};
export const monthName=(month:string)=>new Date(month+'-01T12:00:00Z').toLocaleDateString('en-IN',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'});
export function validDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date}
export function calendarPayload(value:CalendarDraft){
  if(!value.title.trim()||value.title.trim().length>180)throw Error('Add an event title of 180 characters or less.');
  if(!validDate(value.event_date))throw Error('Choose a valid event date.');
  if(!Object.hasOwn(calendarKinds,value.kind))throw Error('Choose a valid event type.');
  if(value.notes.length>2000)throw Error('Keep notes under 2,000 characters.');
  if(value.source_url&&!safeHttpUrl(value.source_url))throw Error('Enter a source URL starting with https:// or http://.');
  return {...value,title:value.title.trim(),notes:value.notes.trim(),source_url:value.source_url.trim()};
}
export function calendarOccurrences(rows:CalendarEntry[],start:string,end:string,directoryIds=new Set<string>()):CalendarOccurrence[]{
  const result:CalendarOccurrence[]=[];
  for(const row of rows){
    if(row.archived||!validDate(row.event_date))continue;
    for(let year=Number(start.slice(0,4));year<=Number(end.slice(0,4));year++){
      const date=row.annual?String(year)+row.event_date.slice(4):row.event_date;
      // A February 29 birthday appears on February 29, without inventing another date.
      if(date>=start&&date<=end&&validDate(date)&&Number(date.slice(0,4))>=Number(row.event_date.slice(0,4)))result.push({...row,date,years:row.annual?year-Number(row.event_date.slice(0,4)):0,directory:directoryIds.has(row.id)});
      if(!row.annual)break;
    }
  }
  return result.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
}
export async function loadCalendar(client:SupabaseClient){
  const [events,people]=await Promise.all([client.from('editorial_calendar').select('*').order('event_date'),client.from('people').select('id,slug,name_te,name_en,date_of_birth').not('date_of_birth','is',null).order('name_en')]);
  if(events.error)throw events.error;if(people.error)throw people.error;
  const birthdays:CalendarEntry[]=(people.data||[]).map(person=>({id:'person-'+person.id,title:person.name_te||person.name_en,event_date:person.date_of_birth,kind:'birthday',annual:true,notes:'From your celebrity directory',source_url:'/celebrity/'+encodeURIComponent(person.slug),archived:false,revision:0}));
  return {entries:[...(events.data||[]) as CalendarEntry[],...birthdays],directoryIds:new Set(birthdays.map(row=>row.id))};
}
export async function saveCalendarEntry(client:SupabaseClient,draft:CalendarDraft,original?:CalendarEntry|null){
  const payload=calendarPayload(draft),result=original?await client.from('editorial_calendar').update(payload).eq('id',original.id).eq('revision',original.revision).select().maybeSingle():await client.from('editorial_calendar').insert(payload).select().single();
  if(result.error)throw result.error;if(!result.data)throw Error('This event changed in another session. Reload before saving.');return result.data as CalendarEntry;
}
