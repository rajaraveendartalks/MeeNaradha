const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{JSDOM}=require('jsdom');
const home=require('../lib/homepage.ts'),data=require('../lib/homepage-data.ts'),db=require('../lib/db.ts');
const clone=value=>JSON.parse(JSON.stringify(value)),uuid=index=>'00000000-0000-4000-8000-'+String(index).padStart(12,'0');
const article=(index,status='published')=>({id:uuid(index),slug:'story-'+index,headline_te:'తెలుగు వార్త '+index,headline_en:'Story '+index,dek_te:'వార్తా వివరాలు',hero_image_url:'https://example.test/'+index+'.jpg',category:'movies',status,published_at:'2026-11-08T07:00:00Z',created_at:'2026-11-08T07:00:00Z'});
const initialState=()=>{const config=home.defaultHomeSettings();return {draft:{id:'draft',config:clone(config),revision:0,updated_at:'2026-11-08T07:00:00Z'},published:{id:'published',config:clone(config),revision:0,updated_at:'2026-11-08T07:00:00Z'}}};

test('homepage defaults match the current layout; invalid or duplicate settings normalize safely',()=>{
  const defaults=home.defaultHomeSettings();assert.deepEqual(defaults.sections.map(row=>row.id),['videos','movies','ott','celebrities','box-office','technology','politics','galleries']);assert.equal(defaults.featured.leadId,null);
  const value=home.normalizeHomeSettings({...defaults,featured:{...defaults.featured,leadId:'https://bad.test',storyIds:[uuid(1),uuid(1),'javascript:alert(1)']},sections:[{id:'movies',title:'Movies',enabled:false,limit:1000,preset:'bad'},{id:'movies'},{id:'unknown'}]});
  assert.equal(value.sections.length,8);assert.equal(value.sections[0].id,'movies');assert.equal(value.sections[0].enabled,false);assert.equal(value.sections[0].limit,24);assert.equal(value.sections[0].preset,'lead-cards');assert.equal(value.featured.leadId,null);assert.deepEqual(value.featured.storyIds,[uuid(1)]);
  const changed=home.defaultHomeSettings();changed.sections[0].limit=13;assert.throws(()=>home.validateHomeSettings(changed),/item count/);
  const selected=home.defaultHomeSettings();selected.featured.leadId=uuid(20);selected.featured.storyIds=[uuid(3),uuid(4)];
  const result=home.featuredStories(selected,[article(1),article(2),article(3),article(4),article(5)],[article(20)]);
  assert.equal(result.lead.id,uuid(20));assert.deepEqual(result.stories.map(row=>row.id),[uuid(3),uuid(4),uuid(1),uuid(2)]);
  const fallback=home.featuredStories(selected,[article(1),article(2),article(3)],[article(20,'draft')]);assert.equal(fallback.lead.id,uuid(1));assert.equal(new Set([fallback.lead.id,...fallback.stories.map(row=>row.id)]).size,4-1);
});

test('the actual public homepage renderer honors featured pins, order, visibility, layouts and counts',()=>{
  const originalLoad=Module._load;
  Module._load=function(request,parent,isMain){if(request==='next/link')return {__esModule:true,default:({href,children,...props})=>React.createElement('a',{href,...props},children)};return originalLoad.call(this,request,parent,isMain)};
  try{
    const {HomePageView}=require('../app/components/HomePageView.tsx'),settings=home.defaultHomeSettings(),content={...data.emptyHomeContent(),news:Array.from({length:12},(_,index)=>article(index+1)),pinned:[article(30)],videos:[{id:uuid(100),slug:'video',title_te:'వీడియో',title_en:'Video',thumbnail_url:'https://example.test/video.jpg',content_type:'trailer'}]};
    settings.featured.leadId=uuid(30);settings.ticker.enabled=false;settings.sections=settings.sections.map(row=>row.id==='ott'?{...row,enabled:false}:row.id==='movies'?{...row,limit:2,preset:'compact'}:row);[settings.sections[0],settings.sections[1]]=[settings.sections[1],settings.sections[0]];
    const dom=new JSDOM(renderToStaticMarkup(React.createElement(HomePageView,{settings,content}))),document=dom.window.document;
    assert.equal(document.querySelector('.ticker'),null);assert.equal(document.querySelector('.lead-column a').getAttribute('href'),'/article/story-30');assert.equal(document.querySelector('#news-ott'),null);assert.equal(document.querySelector('.category-news-sections>section').getAttribute('aria-labelledby'),'news-movies');assert.equal(document.querySelector('.nc-compact .nc-body').children.length,2);assert.ok(document.querySelector('#homepage-videos-title'));
    settings.featured.enabled=false;const noLead=renderToStaticMarkup(React.createElement(HomePageView,{settings,content}));assert.doesNotMatch(noLead,/aria-label="Featured stories"/);dom.window.close();
  }finally{Module._load=originalLoad}
});

test('stale settings saves surface a conflict instead of replacing a newer homepage',async()=>{
  const client={rpc:async()=>({data:null,error:{code:'40001',message:'conflict'}})};
  await assert.rejects(data.saveHomepage(client,home.defaultHomeSettings(),initialState(),true),/changed in another session/);
});

test('editors can pick published stories, arrange sections, preview, save privately and publish from the real screens',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'https://studio.example/admin/homepage',pretendToBeVisual:true}),previous={};
  for(const name of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','DOMParser','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']){previous[name]=Object.getOwnPropertyDescriptor(global,name);Object.defineProperty(global,name,{configurable:true,writable:true,value:typeof dom.window[name]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(name)?dom.window[name].bind(dom.window):dom.window[name]})}
  global.IS_REACT_ACT_ENVIRONMENT=true;window.confirm=()=>true;window.HTMLDialogElement.prototype.showModal=function(){this.open=true};window.HTMLDialogElement.prototype.close=function(){this.open=false};
  const state=initialState(),articles=[article(1),article(2),article(3),article(4),article(5),article(6),article(99,'draft')];let authCallback;
  class Query{
    constructor(table){this.table=table;this.filters=[];this.start=0;this.end=Infinity;this.one=false}
    select(){return this}eq(key,value){this.filters.push(row=>row[key]===value);return this}in(key,values){this.filters.push(row=>values.includes(row[key]));return this}order(){return this}limit(value){this.end=value-1;return this}range(start,end){this.start=start;this.end=end;return this}maybeSingle(){this.one=true;return this}or(){return this}
    then(resolve,reject){let rows=this.table==='homepage_settings'?Object.values(state):this.table==='news_articles'?articles:this.table==='user_roles'?[{user_id:uuid(500),role:'admin'}]:[];rows=rows.filter(row=>this.filters.every(filter=>filter(row)));const count=rows.length;rows=clone(rows.slice(this.start,this.end+1));return Promise.resolve({data:this.one?(rows[0]||null):rows,error:null,count}).then(resolve,reject)}
  }
  const client={from:table=>new Query(table),auth:{getUser:async()=>({data:{user:{id:uuid(500),email:'editor@example.test'}},error:null}),onAuthStateChange(callback){authCallback=callback;return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>{authCallback('SIGNED_OUT',null);return {error:null}}},rpc:async(name,args)=>{
    assert.equal(name,'save_homepage_settings');if(args.p_draft_revision!==state.draft.revision||args.p_published_revision!==state.published.revision)return {data:null,error:{code:'40001',message:'conflict'}};
    state.draft={...state.draft,config:clone(args.p_config),revision:state.draft.revision+1};if(args.p_publish)state.published={...state.published,config:clone(args.p_config),revision:state.published.revision+1};return {data:clone(state),error:null};
  }};
  const originalLoad=Module._load;
  Module._load=function(request,parent,isMain){if(request==='next/link')return {__esModule:true,default:({href,children,...props})=>React.createElement('a',{href,...props},children)};if(request==='next/navigation')return {usePathname:()=>'/admin/homepage'};if(request.endsWith('/lib/db'))return {...db,db:client};return originalLoad.call(this,request,parent,isMain)};
  const {act}=React,{createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root'));
  const settle=async(ms=50)=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,ms))});
  const button=text=>{const found=[...document.querySelectorAll('button')].find(row=>row.textContent.trim()===text);assert.ok(found,'Button missing: '+text);return found};
  const click=async element=>{await act(async()=>element.click());await settle()};
  const input=label=>{const field=[...document.querySelectorAll('label')].find(row=>row.querySelector('span')?.textContent===label);assert.ok(field,'Field missing: '+label);return field.querySelector('input')};
  const setInput=async(element,value)=>{await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new window.Event('input',{bubbles:true}))});await settle()};
  try{
    const Shell=require('../app/admin/studio/StudioShell.tsx').default,Manager=require('../app/admin/studio/HomepageManager.tsx').default;
    await act(async()=>root.render(React.createElement(Shell,null,React.createElement(Manager))));await settle(100);
    assert.equal(document.querySelector('a[aria-current="page"]').textContent.trim(),'⌂ Homepage');
    await setInput(input('Main heading'),'నేటి ప్రధాన వార్తలు');
    await click(button('Choose lead story'));await settle(250);assert.doesNotMatch(document.querySelector('.studio-home-picker-results').textContent,/తెలుగు వార్త 99/);await click(document.querySelectorAll('.studio-home-picker-story')[5]);
    await click(document.querySelector('[aria-label="Move Movies up"]'));assert.equal(document.querySelector('.studio-home-section').dataset.homeSection,'movies');
    const ticker=[...document.querySelectorAll('section')].find(section=>section.querySelector('h2')?.textContent==='Updates ticker');await click(ticker.querySelector('input[type="checkbox"]'));
    await click(button('Save Draft'));assert.equal(state.draft.config.intro.title,'నేటి ప్రధాన వార్తలు');assert.equal(state.published.config.intro.title,home.defaultHomeSettings().intro.title);assert.equal(state.draft.config.featured.leadId,uuid(6));
    await click(button('Preview homepage'));assert.equal(document.querySelector('.studio-home-preview .ticker'),null);assert.equal(document.querySelector('.studio-home-preview .lead-column a').getAttribute('href'),'/article/story-6');assert.equal(document.querySelector('.studio-home-preview .category-news-sections>section').getAttribute('aria-labelledby'),'news-movies');await click(button('Close'));
    await click(button('Publish homepage'));assert.equal(state.published.config.intro.title,'నేటి ప్రధాన వార్తలు');assert.equal(state.published.config.sections[0].id,'movies');assert.match(document.body.textContent,/Homepage published/);
    state.draft.revision++;await setInput(input('Caption'),'Another edit');await click(button('Save Draft'));assert.match(document.body.textContent,/changed in another session/);assert.notEqual(state.published.config.intro.caption,'Another edit');
  }finally{await act(async()=>root.unmount());Module._load=originalLoad;dom.window.close();for(const [name,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(global,name,descriptor);else delete global[name]}delete global.IS_REACT_ACT_ENVIRONMENT}
});
