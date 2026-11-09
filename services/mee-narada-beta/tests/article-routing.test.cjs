const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const routing=require('../lib/article-routing.ts'),studio=require('../lib/studio-data.ts');
const telugu='రామాయణం-ప్రమోషన్స్-లో-వివాదం';
const published={id:'c3070c3f-fafe-4916-8260-a5f5837746ce',slug:telugu,headline_te:'‘రామాయణం’ ప్రమోషన్స్‌లో వివాదం..',headline_en:'Ramayana promotion controversy',status:'published',body_te:'తెలుగు వార్తా విషయం',body_en:null,dek_te:null,dek_en:null,hero_image_url:null,category:'movies',published_at:'2026-11-09T08:04:48.447Z',created_at:'2026-11-09T08:04:48.447Z'};
function clientFor(rows,error=null){
 const calls=[];
 return {calls,from(table){
  assert.equal(table,'news_articles');
  return {select(columns){calls.push({columns});return this},eq(key,value){calls.push({key,value});return this},async in(key,values){calls.push({key,values});return {data:rows.filter(row=>values.includes(row.slug)&&row.status==='published'),error}}};
 }};
}
test('Telugu, encoded and double-encoded route parameters resolve the same published record',async()=>{
 for(const raw of [telugu,encodeURIComponent(telugu),encodeURIComponent(encodeURIComponent(telugu))]){
  const client=clientFor([published]);assert.equal((await routing.loadPublishedArticle(client,raw)).id,published.id);assert.ok(client.calls.some(call=>call.key==='status'&&call.value==='published'));assert.equal(client.calls.filter(call=>call.key==='slug').length,1);
 }
 const nfd='తెలుగు-కోణం'.normalize('NFD'),nfc=nfd.normalize('NFC');assert.ok(routing.articleSlugCandidates(encodeURIComponent(nfd)).includes(nfc));assert.ok(routing.articleSlugCandidates(nfc).includes(nfd));
});
test('exact legacy URLs win over decoded variants and malformed escapes never crash lookup',async()=>{
 const encoded=encodeURIComponent(telugu),legacy={...published,id:'legacy',slug:encoded},client=clientFor([published,legacy]);assert.equal((await routing.loadPublishedArticle(client,encoded)).id,'legacy');
 for(const raw of ['kaka','legacy title','100%-cinema','bad%E0%A4','name+news']){assert.equal(routing.articleSlugCandidates(raw)[0],raw);assert.equal((await routing.loadPublishedArticle(clientFor([{...published,slug:raw}]),raw)).slug,raw)}
 assert.deepEqual(routing.articleSlugCandidates(''),[]);assert.deepEqual(routing.articleSlugCandidates('x'.repeat(2049)),[]);assert.deepEqual(routing.articleSlugCandidates('\u0000'),[]);
});
test('missing or unpublished stories remain unavailable and storage failures are not converted into 404s',async()=>{
 assert.equal(await routing.loadPublishedArticle(clientFor([]),telugu),null);assert.equal(await routing.loadPublishedArticle(clientFor([{...published,status:'draft'}]),telugu),null);
 await assert.rejects(routing.loadPublishedArticle(clientFor([],{code:'PGRST000',message:'Connection unavailable'}),telugu),/could not be loaded/);
});
test('the real article page and metadata use the decoded published slug for content and canonical sharing',async()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),client=clientFor([published]),originalLoad=Module._load;
 Module._load=function(request,parent,isMain){
  if(request==='../../../lib/db')return {db:client,titleOf:row=>row.headline_te||row.headline_en};
  if(request==='../../components/PublicSiteNavigation')return {PublicSiteHeader:()=>React.createElement('header',null,'Mee Narada'),PublicSiteFooter:()=>React.createElement('footer',null,'Footer')};
  if(request==='../../../lib/article-layout')return {loadArticleSidebar:async()=>[]};
  if(request==='../../../lib/advertising')return {emptyAdInventory:()=>({}),loadAdInventory:async()=>({})};
  if(request==='../../../lib/site-management')return {categorySlug:value=>value,findCategory:()=>null,loadCategories:async()=>[]};
  if(request==='../../components/ArticleSidebar')return {__esModule:true,default:()=>null};
  if(request==='../../components/AdSlot'||request==='../../components/ArticleAnalytics')return {__esModule:true,default:()=>null};
  if(request==='../../components/ArticleShare')return {__esModule:true,default:props=>React.createElement('a',{'data-testid':'share',href:props.url},'Share')};
  if(request==='next/navigation')return {notFound:()=>{throw Error('UNEXPECTED_404')}};
  return originalLoad.call(this,request,parent,isMain);
 };
 try{
  const page=require('../app/article/[slug]/page.tsx'),params=Promise.resolve({slug:encodeURIComponent(telugu)}),metadata=await page.generateMetadata({params}),element=await page.default({params}),markup=renderToStaticMarkup(element);
  assert.match(markup,/రామాయణం/);assert.match(markup,/తెలుగు వార్తా విషయం/);assert.equal(metadata.alternates.canonical,'https://www.meenarada.com/article/'+encodeURIComponent(telugu));assert.equal(metadata.openGraph.url,metadata.alternates.canonical);assert.ok(markup.includes(metadata.alternates.canonical));assert.ok(!metadata.alternates.canonical.includes('%25E0'));
 }finally{Module._load=originalLoad}
});
test('editor permalink preview and saves agree while existing addresses stay stable',()=>{
 const draft={...studio.blankDraft,headline_te:'తెలుగు శీర్షిక',body_te:'వార్తా విషయం'};
 assert.equal(studio.postSlug({...draft,slug:encodeURIComponent(telugu)}),telugu);assert.equal(studio.postPayload({...draft,slug:encodeURIComponent(telugu)},'published').slug,telugu);
 const legacy={...published,slug:encodeURIComponent(telugu)};assert.equal(studio.postSlug({...draft,slug:legacy.slug},legacy),legacy.slug);assert.equal(studio.postSlug({...draft,slug:''},legacy),legacy.slug);
 assert.equal(studio.postSlug({...draft,slug:''},{slug:'old-address'}),'old-address');assert.equal(studio.postSlug({...draft,slug:'ramayana-promotion-controversy'}),'ramayana-promotion-controversy');
 for(const value of ['bad%2Fpath','bad\\path','bad%23fragment','https://example.test/article/post'])assert.throws(()=>studio.postSlug({...draft,slug:value}),/URL slug/);
});
