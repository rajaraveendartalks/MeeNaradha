import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Share} from '@capacitor/share';
import {Preferences} from '@capacitor/preferences';
import {StatusBar,Style} from '@capacitor/status-bar';
export const isNative=Capacitor.isNativePlatform();
const prefix='mnr-mobile-';
export const ready=(async()=>{if(!isNative)return;try{const {keys}=await Preferences.keys();for(const key of keys.filter(k=>k.startsWith(prefix))){const {value}=await Preferences.get({key});if(value!==null)localStorage.setItem(key,value)}await StatusBar.setStyle({style:Style.Dark});await StatusBar.setBackgroundColor({color:'#bf193b'})}catch{}document.body.classList.add('native-app');App.addListener('backButton',()=>window.dispatchEvent(new Event('mnr-back')));App.addListener('appStateChange',({isActive})=>{if(isActive)window.dispatchEvent(new Event('mnr-resume'))})})();
export async function persist(key,value){if(!isNative||!key.startsWith(prefix))return;try{if(value===null)await Preferences.remove({key});else await Preferences.set({key,value})}catch{}}
export async function share(title,url){if(!isNative)return false;const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.hostname!=='www.meenarada.com')return false;try{await Share.share({title,text:title,url,dialogTitle:'Share Mee Narada story'})}catch{}return true}
export async function exit(){if(isNative)await App.exitApp()}
