const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{JSDOM}=require('jsdom'),{articleShareData}=require('../lib/article-sharing.ts'),ArticleShare=require('../app/components/ArticleShare.tsx').default;
const title='తెలుగు వార్త & కొత్త + అప్డేట్ "చిరు"',url='https://www.meenarada.com/article/%E0%B0%B5%E0%B0%BE%E0%B0%B0%E0%B1%8D%E0%B0%A4?ref=a%26b',image='https://example.test/news.jpg';
test('share destinations retain Telugu text and the complete article URL without parameter injection',()=>{
 const data=articleShareData(title,url,image),byName=Object.fromEntries(data.links.map(link=>[link.platform,new URL(link.href)]));
 for(const name of ['x','reddit','telegram','linkedin','pinterest'])assert.equal(byName[name].searchParams.get('url'),url);
 assert.equal(byName.facebook.searchParams.get('u'),url);assert.equal(byName.reddit.searchParams.get('title'),title);assert.ok(byName.whatsapp.searchParams.get('text').endsWith('\n'+url));assert.equal(byName.pinterest.searchParams.get('media'),image);
 assert.ok(byName.whatsapp.href.includes('%20'));assert.ok(byName.whatsapp.href.includes('%2B'));assert.doesNotMatch(byName.whatsapp.href,/\+/);
 assert.equal(data.links.some(link=>new URL(link.href).searchParams.has('b')),false);assert.equal(articleShareData(title,url,null).links.some(link=>link.platform==='pinterest'),false);assert.equal(articleShareData(title,url,'javascript:alert(1)').links.some(link=>link.platform==='pinterest'),false);
 assert.throws(()=>articleShareData(title,'javascript:alert(1)'),/valid public URL/);assert.doesNotMatch(decodeURIComponent(articleShareData('Headline\r\nbcc:bad@example.test',url).email.split('&body=')[0]),/[\r\n]/);
});
test('server-rendered sharing is labelled, uses inline icons and isolates external tabs',()=>{
 const dom=new JSDOM(renderToStaticMarkup(React.createElement(ArticleShare,{title,url,image}))),document=dom.window.document;
 for(const platform of ['Facebook','X','WhatsApp','Reddit','Telegram','LinkedIn','Pinterest']){const link=document.querySelector('a[aria-label="Share on '+platform+'"]');assert.ok(link);assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);assert.match(link.rel,/noreferrer/);assert.ok(link.querySelector('svg[aria-hidden="true"]'))}
 assert.ok(document.querySelector('button[aria-label="Copy article link for Instagram"]'));assert.ok(document.querySelector('a[href^="mailto:"]'));assert.equal(document.querySelectorAll('script').length,0);assert.equal(document.querySelectorAll('img').length,0);dom.window.close();
});
test('the real sharing controls handle clipboard success, manual fallback, device sharing and cancellation',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://www.meenarada.com/article/current?private-tracking=ignore',pretendToBeVisual:true}),previous={};
 for(const name of ['window','document','navigator','HTMLElement','Element','Node']){previous[name]=Object.getOwnPropertyDescriptor(global,name);Object.defineProperty(global,name,{configurable:true,writable:true,value:dom.window[name]})}
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const {act}=React,{createRoot}=require('react-dom/client'),root=createRoot(document.getElementById('root'));let copied=[],failCopy=false,shared=[];
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{if(failCopy)throw Error('Clipboard denied');copied.push(value)}}});
 const settle=async()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))}),click=async label=>{const button=document.querySelector('button[aria-label="'+label+'"]');assert.ok(button);await act(async()=>button.click());await settle()};
 try{
  await act(async()=>root.render(React.createElement(ArticleShare,{title,url,image})));await click('Copy article link');assert.equal(copied.at(-1),url);assert.doesNotMatch(copied.at(-1),/private-tracking/);assert.match(document.querySelector('[role="status"]').textContent,/link copied/);
  await click('Copy article link for Instagram');assert.match(document.querySelector('[role="status"]').textContent,/Instagram message/);assert.ok(document.querySelector('a[href="https://www.instagram.com/"]'));
  failCopy=true;await click('Copy article link for Instagram');const manual=document.querySelector('input[aria-label="Article link to copy"]');assert.equal(manual.value,url);assert.equal(document.activeElement,manual);assert.equal(manual.selectionStart,0);assert.equal(manual.selectionEnd,url.length);
  failCopy=false;Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>shared.push(payload)});await click('More sharing options');assert.equal(shared.length,1);assert.deepEqual(shared[0],{title,text:title+' – Mee Narada',url});assert.equal(document.querySelector('[role="status"]').textContent,'');
  Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw Object.assign(Error('Cancelled'),{name:'AbortError'})}});const before=copied.length;await click('More sharing options');assert.equal(copied.length,before);assert.equal(document.querySelector('[role="status"]').textContent,'');
  Object.defineProperty(navigator,'share',{configurable:true,value:undefined});await click('More sharing options');assert.equal(copied.length,before+1);assert.match(document.querySelector('[role="status"]').textContent,/any app/);
 }finally{await act(async()=>root.unmount());dom.window.close();for(const [name,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(global,name,descriptor);else delete global[name]}delete global.IS_REACT_ACT_ENVIRONMENT}
});
