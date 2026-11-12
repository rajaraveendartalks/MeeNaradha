import {access,readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import plist from 'plist';
import xcode from 'xcode';

try{await access('ios/App/App.xcodeproj/project.pbxproj')}catch{
 const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['cap','add','ios','--packagemanager','SPM'],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
const projectPath='ios/App/App.xcodeproj/project.pbxproj';
const project=xcode.project(projectPath);project.parseSync();
const appGroup=project.findPBXGroupKey({path:'App'});
if(!appGroup)throw Error('The generated Xcode App group is missing.');
project.addResourceFile('PrivacyInfo.xcprivacy',{target:project.getFirstTarget().uuid},appGroup);
project.updateBuildProperty('MARKETING_VERSION','0.1.0');
project.updateBuildProperty('CURRENT_PROJECT_VERSION','1');
await writeFile(projectPath,project.writeSync());
await cp('native/PrivacyInfo.xcprivacy','ios/App/App/PrivacyInfo.xcprivacy');
const infoPath='ios/App/App/Info.plist',info=plist.parse(await readFile(infoPath,'utf8'));
info.CFBundleDisplayName='Mee Narada';
info.CFBundleLocalizations=['te','en'];
// The app uses HTTPS provided by the OS and does not implement its own encryption.
info.ITSAppUsesNonExemptEncryption=false;
// Never add broad App Transport Security exceptions to load HTTP images.
info.NSAppTransportSecurity={NSAllowsArbitraryLoads:false};
await writeFile(infoPath,plist.build(info)+'\n');
const assets='ios/App/App/Assets.xcassets';
const logo=await sharp('../mee-narada-beta/public/meenarada-logo.webp').resize(820,300,{fit:'contain',background:'#000'}).png().toBuffer();
const iconDir=assets+'/AppIcon.appiconset';await mkdir(iconDir,{recursive:true});
await sharp({create:{width:1024,height:1024,channels:3,background:'#000'}}).composite([{input:logo,left:102,top:362}]).removeAlpha().png().toFile(iconDir+'/MeeNarada.png');
await writeFile(iconDir+'/Contents.json',JSON.stringify({images:[{filename:'MeeNarada.png',idiom:'universal',platform:'ios',size:'1024x1024'}],info:{author:'xcode',version:1}},null,2)+'\n');
await rm(assets+'/Splash.imageset',{recursive:true,force:true});
const launchDir=assets+'/LaunchLogo.imageset';await mkdir(launchDir,{recursive:true});
await sharp('../mee-narada-beta/public/meenarada-logo.webp').resize(900,300,{fit:'contain',background:'#000'}).removeAlpha().png().toFile(launchDir+'/logo.png');
await writeFile(launchDir+'/Contents.json',JSON.stringify({images:[{filename:'logo.png',idiom:'universal'}],info:{author:'xcode',version:1}},null,2)+'\n');
await writeFile('ios/App/App/Base.lproj/LaunchScreen.storyboard',`<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="23501" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="MN-launch">
 <device id="retina6_12" orientation="portrait" appearance="light"/>
 <dependencies><deployment identifier="iOS"/><plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="23501"/><capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/></dependencies>
 <scenes><scene sceneID="MN-scene"><objects>
  <viewController id="MN-launch" sceneMemberID="viewController"><view key="view" contentMode="scaleToFill" id="MN-root"><rect key="frame" x="0.0" y="0.0" width="393" height="852"/><autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
   <subviews><imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFit" image="LaunchLogo" translatesAutoresizingMaskIntoConstraints="NO" id="MN-logo"><rect key="frame" x="46.5" y="376" width="300" height="100"/><constraints><constraint firstAttribute="width" constant="300" id="MN-width"/><constraint firstAttribute="height" constant="100" id="MN-height"/></constraints></imageView></subviews>
   <color key="backgroundColor" white="0.0" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
   <constraints><constraint firstItem="MN-logo" firstAttribute="centerX" secondItem="MN-root" secondAttribute="centerX" id="MN-center-x"/><constraint firstItem="MN-logo" firstAttribute="centerY" secondItem="MN-root" secondAttribute="centerY" id="MN-center-y"/></constraints>
  </view></viewController><placeholder placeholderIdentifier="IBFirstResponder" id="MN-first" sceneMemberID="firstResponder"/>
 </objects></scene></scenes><resources><image name="LaunchLogo" width="900" height="300"/></resources>
</document>\n`);
console.log('iPhone/iPad project configured with Mee Narada branding, HTTPS-only traffic and preference privacy manifest.');
