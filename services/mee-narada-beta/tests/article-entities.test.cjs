const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),entities=require('../lib/article-entities.ts'),rich=require('../lib/rich-content.ts'),management=require('../lib/entity-management.ts'),{ArticleContent}=require('../app/components/ArticleContent.tsx');
const person={kind:'person',id:'person-1',slug:'Bobby-Kolli',name_en:'Bobby Kolli',name_te:'బాబీ',article_aliases:['Bobby']},hero={kind:'person',id:'person-2',slug:'Chiranjeevi',name_en:'Chiranjeevi',name_te:'చిరంజీవి',article_aliases:[]},movie={kind:'movie',id:'movie-1',slug:'kaka',name_en:'Kaka',name_te:'కాకా',article_aliases:[]},company={kind:'company',id:'studio-1',slug:'kvn-productions',name_en:'KVN Productions',name_te:'కేవీఎన్ ప్రొడక్షన్స్',article_aliases:['KVN']};
function plain(node){return (node.text||'')+(node.content||[]).map(plain).join('')}
test('Telugu and English mentions link once per profile, prefer full names, and retain every original character',()=>{
 const value='దర్శకుడు బాబీ తెరకెక్కించిన కాకా. చిరంజీవి కథ. కేవీఎన్ ప్రొడక్షన్స్. Bobby Kolli and Bobby met Chiranjeevi.',doc=rich.articleDocument(value),result=entities.linkArticleDocument(doc,[person,hero,movie,company]);
 assert.equal(plain(result.document),plain(doc));assert.equal(result.links.length,4);assert.deepEqual(result.links.map(row=>row.href),['/celebrity/Bobby-Kolli','/movie/kaka','/celebrity/Chiranjeevi','/studio/kvn-productions']);
 const html=renderToStaticMarkup(React.createElement(ArticleContent,{value,entities:[person,hero,movie,company]}));assert.equal((html.match(/class="article-entity-link"/g)||[]).length,4);assert.ok(!html.includes('target="_blank"'));assert.match(html,/href="\/studio\/kvn-productions"/);
 const full=entities.linkArticleDocument(rich.articleDocument('Bobby Kolli met Bobby.'),[person]);assert.equal(full.document.content[0].content[0].text,'Bobby Kolli');assert.equal(full.links.length,1);
});
test('ambiguous aliases, name fragments, Unicode combining marks and URL/email text are skipped safely',()=>{
 const another={...person,id:'other-bobby',slug:'other-bobby',name_en:'Another Person',name_te:'ఇంకొక వ్యక్తి',article_aliases:['Bobby','బాబీ']};
 assert.equal(entities.articleLinks('Bobby బాబీ',[person,another]).length,0);assert.equal(entities.articleLinks('బాబీకి చిరంజీవిని MyBobby Bobby123',[person,hero]).length,0);
 assert.equal(entities.articleLinks('https://example.test/Bobby Bobby@example.test www.example.test/Bobby',[person]).length,0);
 const normalized={...person,name_te:'కోణం',article_aliases:[]};const nfd='కోణం'.normalize('NFD');assert.equal(entities.articleLinks(nfd,[normalized]).length,1);
 const special={...company,name_en:'A+B (Studio)',name_te:null,article_aliases:[]};assert.equal(entities.articleLinks('A+B (Studio) presents',[special]).length,1);assert.equal(entities.entityHref({...special,slug:'bad/route'}),null);
});
test('writer links, formatting, code, headings and disabled linking retain their intended rendering',()=>{
 const doc={type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'Bobby'}]},{type:'paragraph',content:[{type:'text',text:'Bobby',marks:[{type:'link',attrs:{href:'https://example.test/original'}}]},{type:'text',text:' and '},{type:'text',text:'Chiranjeevi',marks:[{type:'bold'},{type:'underline'}]}]},{type:'codeBlock',content:[{type:'text',text:'Bobby'}]}]},value=rich.encodeDocument(doc),markup=renderToStaticMarkup(React.createElement(ArticleContent,{value,entities:[person,hero]}));
 assert.match(markup,/<h2>Bobby<\/h2>/);assert.match(markup,/href="https:\/\/example.test\/original"/);assert.match(markup,/<strong>Chiranjeevi<\/strong>/);assert.match(markup,/<pre><code>Bobby<\/code><\/pre>/);assert.equal((markup.match(/article-entity-link/g)||[]).length,1);
 const disabled=renderToStaticMarkup(React.createElement(ArticleContent,{value,entities:[person,hero],autoLinkEntities:false}));assert.ok(!disabled.includes('article-entity-link'));
 const forged=rich.encodeDocument({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Injected',marks:[{type:'entityLink',attrs:{href:'javascript:alert(1)'}}]}]}]});assert.ok(!renderToStaticMarkup(React.createElement(ArticleContent,{value:forged})).includes('javascript:'));
});
test('link budgets keep long articles readable and candidate failures leave editorial content available',async()=>{
 const many=Array.from({length:20},(_,i)=>({...person,id:'id-'+i,slug:'name-'+i,name_en:'PersonName'+i,name_te:null,article_aliases:[]})),text=many.map(row=>row.name_en).join(' ');assert.equal(entities.articleLinks(text,many).length,12);
 let rpcArgs;const data=await entities.loadArticleEntities({rpc:async(name,args)=>{rpcArgs={name,args};return {data:[person],error:null}}},'Bobby');assert.deepEqual(data,[person]);assert.equal(rpcArgs.name,'article_entity_candidates');assert.equal(rpcArgs.args.p_text,'Bobby');
 await assert.rejects(entities.loadArticleEntities({rpc:async()=>({data:null,error:Error('Offline')})},'Bobby'),/Offline/);
 assert.deepEqual(await entities.loadArticleEntities({rpc:async()=>({data:Array(300).fill(person),error:null})},'Bobby'),[]);
});
test('profile saves validate aliases and destinations, preserve unrelated fields, and reject stale edits',async()=>{
 const draft={...management.emptyEntityDraft,name_en:'Bobby Kolli',name_te:'బాబీ',aliases:'బాబీ\nBobby\nBobby',profession:'director',status:'published'},payload=management.entityPayload('person',draft);assert.deepEqual(payload.article_aliases,['బాబీ','Bobby']);assert.equal(payload.slug,'bobby-kolli');assert.equal(payload.primary_profession,'director');assert.ok(!('date_of_birth' in payload));
 for(const value of ['bad/path','bad slug','bad#fragment'])assert.throws(()=>management.entityPayload('person',{...draft,slug:value}),/URL slug/);
 assert.throws(()=>management.entityPayload('person',{...draft,aliases:'x'.repeat(121)}),/aliases/);assert.throws(()=>management.entityPayload('person',{...draft,image_url:'javascript:alert(1)'}),/image/);
 const filters=[],original={...person,updated_at:'2026-11-09T10:00:00Z'},query={update(){return this},eq(key,value){filters.push([key,value]);return this},select(){return this},maybeSingle:async()=>({data:null,error:null})};await assert.rejects(management.saveEntity({from:()=>query},'person',draft,original),/changed in another session/);assert.ok(filters.some(([key,value])=>key==='updated_at'&&value===original.updated_at));
});
test('profile pages receive only related published coverage and keep rich article metadata out of matching',async()=>{
 const rows=[{id:'article',slug:'bobby-story',headline_te:'బాబీ వార్త',body_te:rich.encodeDocument({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'దర్శకుడు బాబీ వార్త.'}]}]})},{id:'fragment',slug:'other',headline_te:'Other',body_te:'బాబీకి'}];let params;
 const result=await entities.loadEntityArticles({rpc:async(name,args)=>{params={name,args};return {data:rows,error:null}}},person);assert.equal(result.length,1);assert.equal(result[0].id,'article');assert.equal(params.args.p_kind,'person');assert.equal(params.args.p_entity_id,person.id);
});
