import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,cp} from 'node:fs/promises';
import {resolve} from 'node:path';

if(process.platform!=='darwin'){
 console.error('iOS compilation requires macOS with Xcode 26+. The generated ios/App/App.xcodeproj can be opened on a Mac.');
 process.exit(1);
}
const kind=process.argv[2]||'simulator';
if(!['simulator','device'].includes(kind))throw Error('Choose simulator or device.');
const sdk=kind==='simulator'?'iphonesimulator':'iphoneos';
const output=resolve('build/ios-'+kind),derived=output+'/derived';
await mkdir(output,{recursive:true});
const args=['-project','ios/App/App.xcodeproj','-scheme','App','-configuration',kind==='simulator'?'Debug':'Release','-sdk',sdk,'-destination','generic/platform='+(kind==='simulator'?'iOS Simulator':'iOS'),'-derivedDataPath',derived,'CODE_SIGNING_ALLOWED=NO','CODE_SIGNING_REQUIRED=NO','build'];
const build=spawnSync('xcodebuild',args,{stdio:'inherit'});if(build.status!==0)process.exit(build.status||1);
const bundle=derived+'/Build/Products/'+(kind==='simulator'?'Debug-iphonesimulator':'Release-iphoneos')+'/App.app';
await cp(bundle,output+'/Mee Narada.app',{recursive:true});
const destination=output+'/Mee-Narada-iOS-'+kind+'-v0.1.0.zip';
const zip=spawnSync('ditto',['-c','-k','--sequesterRsrc','--keepParent',output+'/Mee Narada.app',destination],{stdio:'inherit'});if(zip.status!==0)process.exit(zip.status||1);
await writeFile(output+'/README.txt',kind==='simulator'?'Unsigned iPhone/iPad Simulator build. Install on a booted Mac simulator with: xcrun simctl install booted "Mee Narada.app"\nThis is not installable on a physical iPhone.\n':'Unsigned device compilation for verification only. This is not an installable IPA. Sign and archive in Xcode using your Apple Developer team to distribute through TestFlight.\n');
console.log(destination);
