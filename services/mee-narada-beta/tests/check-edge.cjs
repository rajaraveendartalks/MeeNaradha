const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../../..'),entry=path.join(root,'supabase/functions/studio-users/index.ts'),virtual=path.join(root,'supabase/functions/studio-users/runtime-check.d.ts');
const options={noEmit:true,strict:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,allowImportingTsExtensions:true,esModuleInterop:true};
const host=ts.createCompilerHost(options),getSource=host.getSourceFile.bind(host);
host.getSourceFile=(file,language,...rest)=>file===virtual?ts.createSourceFile(file,'declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Response|Promise<Response>):void};',language):getSource(file,language,...rest);
host.resolveModuleNames=(names,containing)=>names.map(name=>ts.resolveModuleName(name.startsWith('npm:')?name.slice(4).replace(/@\d[^/]*$/,''):name,name.startsWith('npm:')?path.resolve(__dirname,'../package.json'):containing,options,host).resolvedModule);
const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([entry,virtual],options,host));
if(diagnostics.length){process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:file=>file,getNewLine:()=> '\n'}));process.exit(1)}
console.log('Invitation function TypeScript check passed.');
