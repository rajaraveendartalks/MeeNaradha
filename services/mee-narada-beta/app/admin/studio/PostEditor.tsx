"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect,useMemo,useState} from "react";
import {ArticleContent} from "../../components/ArticleContent";
import {articleText,preferredArticleBody} from "../../../lib/rich-content";
import {blankDraft,draftFromPost,errorMessage,fetchPost,makeSlug,postCategories,savePost,statusNames,type PostDraft,type PostStatus,type StudioPost} from "../../../lib/studio-data";
import {loadCategories,defaultCategories,findCategory} from "../../../lib/site-management";
import {RichEditor} from "./RichEditor";
import {MediaPicker} from "./MediaLibrary";
import {StudioDialog} from "./StudioDialog";
import {loadWriters,type WriterChoice} from '../../../lib/editorial-reports';
import {useStudio,useUnsavedChanges} from "./StudioShell";

export default function PostEditor({id,initialNotice=""}:{id:string;initialNotice?:string}){
  const {client,role,userId}=useStudio(),router=useRouter(),[original,setOriginal]=useState<StudioPost|null>(null),[form,setForm]=useState<PostDraft>({...blankDraft}),[baseline,setBaseline]=useState(JSON.stringify(blankDraft)),[loading,setLoading]=useState(id!=="new"),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[message,setMessage]=useState(initialNotice),[preview,setPreview]=useState(false),[media,setMedia]=useState(false),[advanced,setAdvanced]=useState(false),[reload,setReload]=useState(0);
  const [catalog,setCatalog]=useState(defaultCategories),[writers,setWriters]=useState<WriterChoice[]>([]),[authorId,setAuthorId]=useState<string|null>(userId),[authorBaseline,setAuthorBaseline]=useState<string|null>(userId);
  useEffect(()=>{if(role!=="admin")return;let active=true;void loadWriters(client).then(rows=>{if(active)setWriters(rows)}).catch(error=>{if(active)setError(errorMessage(error))});return()=>{active=false}},[client,role]);
  useEffect(()=>{let active=true;void loadCategories(client).then(rows=>{if(active){setCatalog(rows);if(id==="new")setForm(previous=>rows.some(row=>row.slug===previous.category&&row.is_active)?previous:{...previous,category:rows.find(row=>row.is_active)?.slug||""})}});return()=>{active=false}},[client,id]);
  const dirty=JSON.stringify(form)!==baseline||authorId!==authorBaseline;useUnsavedChanges(dirty);
  useEffect(()=>{
    if(id==="new")return;
    let active=true;setLoading(true);setError("");
    void fetchPost(client,id).then(post=>{if(active){const draft=draftFromPost(post);setOriginal(post);setAuthorId(post.author_id||null);setAuthorBaseline(post.author_id||null);setForm(draft);setBaseline(JSON.stringify(draft))}}).catch(error=>{if(active)setError(errorMessage(error))}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[client,id,reload]);
  function field<K extends keyof PostDraft>(key:K,value:PostDraft[K]){setForm(previous=>({...previous,[key]:value}));setMessage("")}
  async function save(status:PostStatus){
    if(busy)return;
    if(original?.status==="published"&&status!=="published"&&!window.confirm("This post is published. Saving it as "+statusNames[status].toLowerCase()+" will remove it from the public site. Continue?"))return;
    setBusy(true);setError("");setMessage("");
    try{const saved=await savePost(client,form,status,original,role==="admin"?authorId:undefined),draft=draftFromPost(saved);setOriginal(saved);setAuthorId(saved.author_id||null);setAuthorBaseline(saved.author_id||null);setForm(draft);setBaseline(JSON.stringify(draft));setMessage(status==="published"?"Published successfully.":status==="in_review"?"Sent for review.":"Draft saved.");if(id==="new")router.replace("/admin/posts/"+saved.id+"?saved="+status)}
    catch(error){setError(errorMessage(error))}finally{setBusy(false)}
  }
  const primaryBody=useMemo(()=>preferredArticleBody(form.body_te,form.body_en),[form.body_te,form.body_en]);
  const text=useMemo(()=>articleText(primaryBody),[primaryBody]),words=text.split(/\s+/).filter(Boolean).length;
  const title=form.headline_te||form.headline_en||"మీ వార్త శీర్షిక",slug=form.slug||makeSlug(form.headline_en||title);
  if(loading)return <p role="status">Opening post…</p>;
  if(error&&!original&&id!=="new")return <div><Link href="/admin">← All posts</Link><p className="studio-message studio-error" role="alert">{error}</p><button type="button" className="studio-button" onClick={()=>setReload(value=>value+1)}>Try again</button></div>;
  return <div className="studio-post-editor">
    <Link href="/admin" className="studio-back">← All posts</Link>
    <div className="studio-heading"><div><h1>{original?"Edit Post":"Add New Post"}</h1><p aria-live="polite">{dirty?"Unsaved changes":original?"All changes saved":"New draft"}</p></div><div className="studio-actions">{original?.status==="published"&&<Link className="studio-button" href={"/article/"+encodeURIComponent(original.slug)} target="_blank" rel="noopener noreferrer">View post ↗</Link>}<button type="button" className="studio-button" onClick={()=>setPreview(true)}>Preview</button></div></div>
    {error&&<p className="studio-message studio-error" role="alert">{error}</p>}{message&&<p className="studio-message" role="status">{message}</p>}
    <div className="studio-editor-grid"><section>
      <label className="studio-field studio-title-field"><span>Title · తెలుగు శీర్షిక</span><input value={form.headline_te} onChange={event=>field("headline_te",event.target.value)} placeholder="Add a title…" disabled={busy}/></label>
      <RichEditor label="Telugu article" value={form.body_te} onChange={value=>field("body_te",value)} disabled={busy}/>
      <div className="studio-word-count"><span>Telugu first</span><span>{words} words</span></div>
      <label className="studio-field"><span>Short summary <small>(optional)</small></span><textarea rows={3} value={form.dek_te} onChange={event=>field("dek_te",event.target.value)} disabled={busy} placeholder="A short introduction for readers…"/></label>
      <details className="studio-advanced" open={advanced} onToggle={event=>setAdvanced(event.currentTarget.open)}><summary>English version, URL &amp; source</summary><div className="studio-panel-body"><label className="studio-field"><span>English title <small>(optional)</small></span><input value={form.headline_en} onChange={event=>field("headline_en",event.target.value)} disabled={busy}/></label>{advanced&&<><span className="studio-field-label">English article</span><RichEditor label="English article" value={form.body_en} onChange={value=>field("body_en",value)} disabled={busy}/></>}<label className="studio-field"><span>English summary</span><textarea value={form.dek_en} onChange={event=>field("dek_en",event.target.value)} rows={2} disabled={busy}/></label><label className="studio-field"><span>URL slug</span><input value={form.slug} onChange={event=>field("slug",event.target.value)} placeholder={makeSlug(form.headline_en||form.headline_te)} disabled={busy}/><small>{original?"Changing this changes the public article address.":"Created automatically if left empty."}</small></label><label className="studio-field"><span>Source / attribution</span><input value={form.source_name} onChange={event=>field("source_name",event.target.value)} disabled={busy}/></label><label className="studio-field"><span>Source URL</span><input type="url" value={form.source_url} onChange={event=>field("source_url",event.target.value)} disabled={busy} placeholder="https://"/></label></div></details>
      <section className="studio-search-preview"><h2>Search preview</h2><p className="studio-seo-url">meenarada.com/article/{slug}</p><h3>{title}</h3><p>{form.dek_te||form.dek_en||text.slice(0,160)||"Add a short summary to describe this article in search results."}</p></section>
    </section><aside className="studio-editor-settings">
      <section className="studio-panel"><h2 className="studio-panel-heading">Publish</h2><div className="studio-panel-body"><dl><div><dt>Status</dt><dd>{original?statusNames[original.status]:"Draft"}</dd></div><div><dt>Visibility</dt><dd>Public when published</dd></div>{original?.published_at&&<div><dt>Published</dt><dd>{new Date(original.published_at).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata"})}</dd></div>}</dl><div className="studio-publish-buttons"><button type="button" className="studio-button" disabled={busy} onClick={()=>void save("draft")}>Save Draft</button><button type="button" className="studio-button" onClick={()=>setPreview(true)}>Preview</button><button type="button" className="studio-button studio-primary" disabled={busy} onClick={()=>void save("published")}>{busy?"Saving…":original?.status==="published"?"Update":"Publish"}</button></div><button type="button" className="studio-link studio-review-action" disabled={busy} onClick={()=>void save("in_review")}>Send for review</button></div></section>
      {role==="admin"&&<section className="studio-panel"><h2 className="studio-panel-heading">Writer</h2><div className="studio-panel-body"><label className="studio-field"><span>Article author</span><select value={authorId||""} disabled={busy} onChange={event=>{setAuthorId(event.target.value||null);setMessage("")}}><option value="">{original?"Unassigned":"Your account (automatic)"}</option>{authorId&&!writers.some(writer=>writer.id===authorId)&&<option value={authorId}>Previous writer</option>}{writers.map(writer=><option value={writer.id} key={writer.id}>{writer.name}</option>)}</select></label><p className="studio-hint">Performance reports credit the selected writer.</p></div></section>}
      <section className="studio-panel"><h2 className="studio-panel-heading">Category</h2><div className="studio-panel-body"><label className="studio-field"><span>Choose category</span><select value={form.category} onChange={event=>field("category",event.target.value)} disabled={busy}><option value="">Choose a category</option>{form.category&&!catalog.some(row=>row.slug===form.category)&&<option value={form.category}>{findCategory(catalog,form.category)?.name_en||form.category}</option>}{catalog.filter(row=>row.is_active||row.slug===form.category).map(row=><option key={row.slug} value={row.slug}>{row.name_en}{!row.is_active?" (archived)":""}</option>)}</select></label><label className="studio-check"><input type="checkbox" checked={form.is_breaking} onChange={event=>field("is_breaking",event.target.checked)} disabled={busy}/> Breaking news</label></div></section>
      <section className="studio-panel"><h2 className="studio-panel-heading">Featured image</h2><div className="studio-panel-body">{form.hero_image_url&&<img className="studio-featured-image" src={form.hero_image_url} alt="Selected featured image"/>}<button type="button" className="studio-image-picker" onClick={()=>setMedia(true)} disabled={busy}>{form.hero_image_url?"Replace image":"＋ Set featured image"}</button>{form.hero_image_url&&<button type="button" className="studio-link studio-remove-image" onClick={()=>field("hero_image_url","")} disabled={busy}>Remove image</button>}<details className="studio-image-url"><summary>Use an image URL</summary><label className="studio-field"><span>Image URL</span><input type="url" value={form.hero_image_url} onChange={event=>field("hero_image_url",event.target.value)} disabled={busy}/></label></details></div></section>
    </aside></div>
    {media&&<MediaPicker showAlt={false} onClose={()=>setMedia(false)} onSelect={item=>{field("hero_image_url",item.url);setMedia(false)}}/>}
    {preview&&<StudioDialog title="Post preview · unsaved changes included" onClose={()=>setPreview(false)}><article className="studio-article-preview"><p className="studio-preview-category">{findCategory(catalog,form.category)?.name_en||form.category}</p><h1>{title}</h1>{form.dek_te&&<p>{form.dek_te}</p>}{form.hero_image_url&&<img src={form.hero_image_url} alt={title}/>}<ArticleContent value={primaryBody}/></article></StudioDialog>}
  </div>;
}
