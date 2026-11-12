const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{transformSync}=require('esbuild');
function native(platform){
 const calls=[],listeners={},values=new Map(),classes=new Set();
 const plugins={
  '@capacitor/core':{Capacitor:{isNativePlatform:()=>true,getPlatform:()=>platform}},
  '@capacitor/app':{App:{addListener:async(name,fn)=>{listeners[name]=fn},exitApp:async()=>calls.push('exit')}},
  '@capacitor/preferences':{Preferences:{keys:async()=>({keys:['mnr-mobile-font','unrelated']}),get:async({key})=>({value:key==='mnr-mobile-font'?'"mandali"':'private'}),set:async v=>calls.push(['set',v]),remove:async v=>calls.push(['remove',v])}},
  '@capacitor/share':{Share:{share:async v=>calls.push(['share',v])}},
  '@capacitor/status-bar':{StatusBar:{setStyle:async v=>calls.push(['style',v]),setBackgroundColor:async v=>calls.push(['background',v])},Style:{Light:'LIGHT',Dark:'DARK'}}
 };
 const module={exports:{}},context={module,exports:module.exports,require:name=>plugins[name],URL,Event:class{constructor(type){this.type=type}},localStorage:{setItem:(k,v)=>values.set(k,v)},document:{body:{classList:{add:(...names)=>names.forEach(n=>classes.add(n))}}},window:{dispatchEvent:e=>calls.push(['event',e.type])}};
 vm.runInNewContext(transformSync(fs.readFileSync(require('node:path').join(__dirname,'../src/native.js'),'utf8'),{loader:'js',format:'cjs'}).code,context);
 return {app:module.exports,calls,listeners,values,classes};
}
test('iOS restores reader preferences and shares natively without invoking Android-only APIs',async()=>{
 const {app,calls,listeners,values,classes}=native('ios');await app.ready;
 assert.ok(classes.has('native-ios'));assert.ok(classes.has('native-app'));assert.equal(values.get('mnr-mobile-font'),'"mandali"');assert.equal(values.has('unrelated'),false);assert.equal(listeners.backButton,undefined);
 listeners.appStateChange({isActive:true});assert.ok(calls.some(c=>c[0]==='event'&&c[1]==='mnr-resume'));
 await app.appearance(true);assert.ok(calls.some(c=>c[0]==='style'&&c[1].style==='LIGHT'));await app.exit();assert.equal(calls.includes('exit'),false);assert.equal(calls.some(c=>c[0]==='background'),false);
 assert.equal(await app.share('తెలుగు కథనం','https://www.meenarada.com/article/kaka'),true);assert.equal(calls.filter(c=>c[0]==='share').length,1);
 assert.equal(await app.share('untrusted','https://www.meenarada.com.evil.test/article'),false);assert.equal(await app.share('untrusted','http://www.meenarada.com/article/kaka'),false);assert.equal(calls.filter(c=>c[0]==='share').length,1);
});
test('Android preserves hardware-back and exit behavior while updating status-bar contrast',async()=>{
 const {app,calls,listeners}=native('android');await app.ready;assert.equal(typeof listeners.backButton,'function');listeners.backButton();assert.ok(calls.some(c=>c[0]==='event'&&c[1]==='mnr-back'));
 await app.appearance(false);assert.ok(calls.some(c=>c[0]==='style'&&c[1].style==='DARK'));await app.exit();assert.ok(calls.includes('exit'));assert.ok(calls.some(c=>c[0]==='background'));
});
