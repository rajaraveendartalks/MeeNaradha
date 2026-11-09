const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const ts=require("typescript");
for(const extension of [".ts",".tsx"]){
  require.extensions[extension]=(module,filename)=>{
    const source=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    module._compile(source,filename);
  };
}
const rich=require("../lib/rich-content.ts");
const data=require("../lib/studio-data.ts");
const React=require("react");
const {renderToStaticMarkup}=require("react-dom/server");
const {ArticleContent}=require("../app/components/ArticleContent.tsx");

test("legacy articles and new editor documents render safely without changing their text",()=>{
  const legacy="## తెలుగు వార్త\n\n**ముఖ్యాంశం** __గీత__ [color:red]ఎరుపు[/color]\n\n- మొదటి విషయం\n- రెండవ విషయం\n\n[youtube]https://youtu.be/IlZDQeTP-Hg[/youtube]";
  const markup=renderToStaticMarkup(React.createElement(ArticleContent,{value:legacy}));
  assert.match(markup,/<h2>తెలుగు వార్త<\/h2>/);assert.match(markup,/<strong>ముఖ్యాంశం<\/strong>/);assert.match(markup,/<u>గీత<\/u>/);assert.match(markup,/<ul>/);assert.match(markup,/youtube-nocookie.com\/embed\/IlZDQeTP-Hg/);
  const encoded=rich.encodeDocument({type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"సురక్షితమైన వార్త",marks:[{type:"bold"},{type:"link",attrs:{href:"javascript:alert(1)"}}]}]},{type:"image",attrs:{src:"https://example.com/photo.png",alt:'" onerror="alert(1)'}},{type:"image",attrs:{src:"data:text/html,<script>bad()</script>"}},{type:"script",content:[{type:"text",text:"bad()"}]}]});
  const rendered=renderToStaticMarkup(React.createElement(ArticleContent,{value:encoded}));
  assert.match(rendered,/సురక్షితమైన వార్త/);assert.match(rendered,/https:\/\/example.com\/photo.png/);assert.doesNotMatch(rendered,/href="javascript:|src="data:|<script/);
  const parsed=new (require("jsdom").JSDOM)(rendered);assert.equal(parsed.window.document.querySelector("img").getAttribute("onerror"),null);parsed.window.close();
  assert.equal(rich.articleText(encoded),"సురక్షితమైన వార్త");assert.equal(rich.articleHasContent(rich.encodeDocument({type:"doc",content:[{type:"paragraph"}]})),false);
  const htmlText=renderToStaticMarkup(React.createElement(ArticleContent,{value:'<script>alert("x")</script>'}));
  assert.doesNotMatch(htmlText,/<script>/);assert.match(htmlText,/&lt;script&gt;/);
});
test("Telugu-only titles, validation, URL stability and first publication dates are preserved",()=>{
  const draft={...data.blankDraft,headline_te:"మన తెలుగు వార్త",body_te:"వార్తా విషయం"};
  const created=data.postPayload(draft,"published",null,"2026-11-08T06:00:00Z");
  assert.equal(created.headline_en,draft.headline_te);assert.equal(created.slug,"మన-తెలుగు-వార్త");assert.equal(created.published_at,"2026-11-08T06:00:00Z");
  const existing={...created,id:"one",slug:"original-url",created_at:"2026-01-01T00:00:00Z",updated_at:"2026-01-02T00:00:00Z",published_at:"2026-01-01T00:00:00Z"};
  const updated=data.postPayload({...draft,headline_te:"Updated title"},"published",existing,"2026-12-01T00:00:00Z");
  assert.equal(updated.slug,"original-url");assert.equal(updated.published_at,existing.published_at);
  const emptyRich=rich.encodeDocument({type:"doc",content:[{type:"paragraph"}]});
  const englishOnly=data.postPayload({...draft,body_te:emptyRich,body_en:"English article"},"published");
  assert.equal(englishOnly.body_te,null);assert.equal(englishOnly.body_en,"English article");
  assert.equal(rich.preferredArticleBody(emptyRich,"English article"),"English article");
  assert.throws(()=>data.postPayload({...draft,headline_te:"",headline_en:""},"draft"),/title/);
  assert.throws(()=>data.postPayload({...draft,body_te:""},"published"),/content/);
  assert.throws(()=>data.postPayload({...draft,hero_image_url:"javascript:alert(1)"},"draft"),/image/);
  assert.throws(()=>data.postPayload({...draft,slug:"bad/path"},"draft"),/slug/);
});
test("stale article updates fail visibly and non-image uploads are rejected",async()=>{
  const query={update(){return this},eq(){return this},select(){return this},async maybeSingle(){return {data:null,error:null}}};
  await assert.rejects(data.savePost({from:()=>query},{...data.blankDraft,headline_te:"వార్త"},"draft",{id:"one",slug:"original",updated_at:"old",published_at:null}),/changed in another session/);
  await assert.rejects(data.uploadMedia({}, {type:"image/svg+xml",size:10,name:"unsafe.svg"}),/JPG/);
  await assert.rejects(data.uploadMedia({}, {type:"image/png",size:41*1024*1024,name:"large.png"}),/40 MB/);
});
test("authorized editors can save, preview, publish, select media, trash and restore through the real screens",async()=>{
  const {JSDOM}=require("jsdom"),dom=new JSDOM("<div id='root'></div>",{url:"https://studio.example/admin",pretendToBeVisual:true});
  const previous={};for(const name of ["window","document","navigator","HTMLElement","Element","Node","MutationObserver","DOMParser","getComputedStyle","requestAnimationFrame","cancelAnimationFrame","innerHeight","innerWidth"]){previous[name]=Object.getOwnPropertyDescriptor(global,name);Object.defineProperty(global,name,{configurable:true,writable:true,value:typeof dom.window[name]==="function"&&["getComputedStyle","requestAnimationFrame","cancelAnimationFrame"].includes(name)?dom.window[name].bind(dom.window):dom.window[name]})}
  global.IS_REACT_ACT_ENVIRONMENT=true;
  window.confirm=()=>true;window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=()=>{};
  const rect=()=>({top:0,left:0,bottom:0,right:0,width:0,height:0,x:0,y:0,toJSON(){return this}});
  window.Range.prototype.getBoundingClientRect=rect;window.Range.prototype.getClientRects=()=>[];
  window.HTMLElement.prototype.getBoundingClientRect=rect;
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true};window.HTMLDialogElement.prototype.close=function(){this.open=false};
  const {act}=React,{createRoot}=require("react-dom/client");
  const now=()=>new Date(Date.now()+Math.floor(Math.random()*1000)).toISOString();
  let user={id:"11111111-1111-4111-8111-111111111111",email:"editor@example.test"},roles=["editor","admin"],authCallback,route="/admin",nextId=1;
  const rows=[],files=[{id:"asset",name:"example.png",metadata:{size:1024}}],replacements=[];
  const base=()=>({id:"post-"+nextId++,slug:"post-"+nextId,headline_te:"పరీక్ష",headline_en:"Test",body_te:"వార్తా విషయం",body_en:null,dek_te:null,dek_en:null,hero_image_url:null,category:"movies",source_name:null,source_url:null,is_breaking:false,status:"draft",published_at:null,created_at:now(),updated_at:now()});
  class Query{
    constructor(table){this.table=table;this.filters=[];this.operation="read";this.start=0;this.end=Infinity;this.singleRow=false}
    select(){return this}order(){return this}eq(k,v){this.filters.push(r=>r[k]===v);return this}neq(k,v){this.filters.push(r=>r[k]!==v);return this}in(k,vs){this.filters.push(r=>vs.includes(r[k]));return this}or(){return this}range(a,b){this.start=a;this.end=b;return this}
    update(value){this.operation="update";this.payload=value;return this}insert(value){this.operation="insert";this.payload=value;return this}
    single(){this.singleRow=true;return this}maybeSingle(){this.singleRow=true;return this}
    then(resolve,reject){return Promise.resolve().then(()=>{
      let result=this.table==="user_roles"?roles.map(role=>({role,user_id:user?.id})):this.table==="content_categories"||this.table==="site_navigation"?[]:rows.filter(r=>this.filters.every(f=>f(r)));
      if(this.operation==="insert"){const row={...base(),...this.payload};rows.push(row);result=[row]}
      if(this.operation==="update"){result.forEach(row=>Object.assign(row,this.payload,{updated_at:now()}))}
      const count=result.length;result=result.slice(this.start,this.end+1).map(r=>({...r}));
      return {data:this.singleRow?(result[0]||null):result,error:null,count};
    }).then(resolve,reject)}
  }
  const client={from:table=>new Query(table),auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange(callback){authCallback=callback;return {data:{subscription:{unsubscribe(){}}}}},signInWithPassword:async()=>({error:null}),signOut:async()=>{user=null;authCallback?.("SIGNED_OUT",null);return {error:null}}},storage:{from:()=>({list:async()=>({data:files,error:null}),getPublicUrl:p=>({data:{publicUrl:"https://example.com/media/"+p}}),upload:async(p,file)=>({data:{id:"new-asset",path:p},error:null})})}};
  const originalLoad=Module._load;
  Module._load=function(request,parent,isMain){
    if(request==="next/link")return {__esModule:true,default:({href,children,...props})=>React.createElement("a",{href,...props},children)};
    if(request==="next/navigation")return {usePathname:()=>route,useRouter:()=>({replace:url=>replacements.push(url)})};
    if(request.endsWith("/lib/db"))return {db:client};
    return originalLoad.call(this,request,parent,isMain);
  };
  const Shell=require("../app/admin/studio/StudioShell.tsx").default,PostEditor=require("../app/admin/studio/PostEditor.tsx").default,PostsScreen=require("../app/admin/studio/PostsScreen.tsx").default;
  const root=createRoot(document.getElementById("root"));
  const settle=async(ms=60)=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,ms))})};
  const render=async child=>{await act(async()=>root.render(React.createElement(Shell,null,child)));await settle()};
  const findButton=text=>{const button=[...document.querySelectorAll("button")].find(el=>el.textContent.trim()===text);assert.ok(button,"Button not found: "+text);return button};
  const click=async button=>{await act(async()=>button.click());await settle()};
  const setInput=async(element,value)=>{await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set.call(element,value);element.dispatchEvent(new window.Event("input",{bubbles:true}))});await settle()};
  try{
    route="/admin/posts/new";await render(React.createElement(PostEditor,{id:"new"}));await settle(100);
    assert.match(document.body.textContent,/Administrator/);
    const title=document.querySelector('input[placeholder="Add a title…"]');assert.ok(title);await setInput(title,"సులభమైన వార్త");
    const editor=document.querySelector('[contenteditable="true"]');assert.ok(editor);await act(async()=>{editor.innerHTML="<p>మన తెలుగు వార్తా విషయం.</p>";editor.dispatchEvent(new window.InputEvent("input",{bubbles:true,inputType:"insertText"}))});await settle(150);
    await click(findButton("Save Draft"));assert.equal(rows.length,1);assert.equal(rows[0].status,"draft");assert.equal(rows[0].headline_te,"సులభమైన వార్త");assert.ok(replacements[0].startsWith("/admin/posts/"));
    await click(findButton("＋ Set featured image"));await click(document.querySelector(".studio-media-card"));await click(findButton("Use this image"));assert.ok(document.querySelector(".studio-featured-image").src.endsWith("/example.png"));
    await click(findButton("Preview"));assert.match(document.querySelector(".studio-article-preview").textContent,/మన తెలుగు వార్తా విషయం/);await click(findButton("Close"));
    await click(findButton("Publish"));assert.equal(rows[0].status,"published");assert.ok(rows[0].body_te.startsWith(rich.RICH_PREFIX));assert.ok(rows[0].hero_image_url.endsWith("/example.png"));
    await render(React.createElement(PostsScreen));await click(document.querySelector(".studio-row-actions .studio-trash-link"));assert.equal(rows[0].status,"archived");await click(findButton("Restore as draft"));assert.equal(rows[0].status,"draft");
    await click(findButton("Sign out"));assert.match(document.body.textContent,/Sign in with your Mee Narada editor account/);assert.doesNotMatch(document.body.textContent,/సులభమైన వార్త/);
    user={id:"22222222-2222-4222-8222-222222222222",email:"reader@example.test"};roles=[];
    await act(async()=>authCallback("SIGNED_IN",{user}));await settle(100);
    assert.match(document.body.textContent,/does not have editor access/);assert.equal(document.querySelector(".studio-post-table"),null);
  }finally{
    await act(async()=>root.unmount());Module._load=originalLoad;dom.window.close();
    for(const [name,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(global,name,descriptor);else delete global[name]}
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
