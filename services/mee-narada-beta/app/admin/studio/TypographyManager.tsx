'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {defaultTypography,fontFamily,loadTypography,saveTypography,teluguFonts,type Typography,type TypographyRecord} from '../../../lib/typography';
import {errorMessage} from '../../../lib/studio-data';
import {useStudio,useUnsavedChanges} from './StudioShell';

export default function TypographyManager(){
  const {client,role}=useStudio(),[record,setRecord]=useState<TypographyRecord|null>(null),[form,setForm]=useState<Typography>({...defaultTypography}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const dirty=Boolean(record&&JSON.stringify(form)!==JSON.stringify(record.config));useUnsavedChanges(dirty);
  useEffect(()=>{let active=true;void loadTypography(client).then(row=>{if(active){setRecord(row);setForm(row.config)}}).catch(error=>{if(active)setError(errorMessage(error))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[client]);
  function field<K extends keyof Typography>(key:K,value:Typography[K]){setForm(previous=>({...previous,[key]:value}));setMessage('')}
  async function save(){if(!record||busy)return;setBusy(true);setError('');try{const row=await saveTypography(client,form,record.revision);setRecord(row);setForm(row.config);setMessage('Website fonts updated. Open or refresh a public page to see them.')}catch(error){setError(errorMessage(error))}finally{setBusy(false)}}
  if(role!=='admin')return <p className="studio-message">Administrator access is required to change website fonts.</p>;
  return <div><div className="studio-heading"><div><h1>Typography</h1><p>Your Telugu voice, on every screen.</p></div><button className="studio-button studio-primary" disabled={!dirty||busy||loading} onClick={()=>void save()}>{busy?'Saving…':'Apply to website'}</button></div>
    {error&&<p className="studio-message studio-error" role="alert">{error}</p>}{message&&<p className="studio-message" role="status">{message}</p>}
    {loading?<p role="status">Loading font settings…</p>:<div className="studio-tools-columns"><section className="studio-panel"><h2 className="studio-panel-heading">Website fonts</h2><div className="studio-panel-body">
      {(['headline','body'] as const).map(key=><label className="studio-field" key={key}><span>{key==='headline'?'Headline font':'Article text font'}</span><select value={form[key]} onChange={event=>field(key,event.target.value as Typography[typeof key])} disabled={busy}>{teluguFonts.map(font=><option value={font.id} key={font.id}>{font.name}</option>)}</select></label>)}
      <label className="studio-field"><span>Article text size · {form.bodySize}px</span><input type="range" min={16} max={24} step={1} value={form.bodySize} onChange={event=>field('bodySize',Number(event.target.value))} disabled={busy}/></label>
      <label className="studio-field"><span>Line spacing · {form.lineHeight.toFixed(2)}</span><input type="range" min={1.6} max={2.4} step={.05} value={form.lineHeight} onChange={event=>field('lineHeight',Number(event.target.value))} disabled={busy}/></label>
      <button type="button" className="studio-button" onClick={()=>{setForm({...defaultTypography});setMessage('')}} disabled={busy}>Use original settings</button><p className="studio-hint">Preview first, then apply. These settings affect the public website; the editor controls keep their familiar layout.</p>
    </div></section><section className="studio-panel"><h2 className="studio-panel-heading">Live Telugu preview</h2><div className="studio-font-preview"><span className="studio-kicker">మీనారద · తాజా వార్తలు</span><h2 style={{fontFamily:fontFamily(form.headline)}}>మన భాషలో ప్రతి వార్తకు కొత్త రూపం</h2><p style={{fontFamily:fontFamily(form.body),fontSize:form.bodySize,lineHeight:form.lineHeight} as CSSProperties}>సినిమా, రాజకీయాలు, క్రీడలు, సంగీతం — మీకు నచ్చిన వార్తలు స్పష్టమైన తెలుగు అక్షరాల్లో. సరైన ఫాంట్, అక్షరాల పరిమాణం, పంక్తుల మధ్య ఖాళీ చదవడాన్ని మరింత సులభం చేస్తాయి.</p></div></section></div>}
    <section className="studio-font-samples" aria-label="Telugu font choices">{teluguFonts.filter(font=>font.id!=='system').map(font=><button key={font.id} type="button" className={'studio-font-sample'+(form.headline===font.id?' selected':'')} onClick={()=>field('headline',font.id)} disabled={busy}><span>{font.name}</span><strong style={{fontFamily:font.family}}>తెలుగు వార్తల ప్రపంచం</strong><small>Use for headlines</small></button>)}</section>
  </div>;
}
