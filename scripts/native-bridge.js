import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {Browser} from '@capacitor/browser';
export const isNative=()=>Capacitor.isNativePlatform();
export async function shareBackup(content,name){
 const result=await Filesystem.writeFile({path:name,data:content,directory:Directory.Cache,encoding:Encoding.UTF8});
 await Share.share({title:'Orbit workspace backup',url:result.uri,dialogTitle:'Save your Orbit backup'});
}
export async function openProvider(url){if(isNative())await Browser.open({url});else window.open(url,'_blank','noopener,noreferrer');}
