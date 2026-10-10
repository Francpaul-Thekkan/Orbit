import { chromium } from 'playwright';
import { readFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();
const svg=await readFile(new URL('../dist/icon.svg',import.meta.url),'utf8');
for(const size of [192,512,1024]){
 await page.setViewportSize({width:size,height:size});
 await page.setContent(`<style>body{margin:0}svg{width:100vw;height:100vh}</style>${svg}`);
 await page.screenshot({path:fileURLToPath(new URL(`../dist/icon-${size}.png`,import.meta.url))});
}
const androidRes=new URL('../android/app/src/main/res/',import.meta.url);
for(const dir of await readdir(androidRes,{withFileTypes:true})){
 if(!dir.isDirectory()||!dir.name.startsWith('mipmap-'))continue;
 for(const name of await readdir(new URL(dir.name+'/',androidRes))){
  if(!name.endsWith('.png')||!name.startsWith('ic_launcher'))continue;
  const target=new URL(dir.name+'/'+name,androidRes),png=await readFile(target);
  const size=png.readUInt32BE(16);await page.setViewportSize({width:size,height:size});
  await page.setContent(`<style>body{margin:0;display:grid;place-items:center;height:100vh;background:#181b18}svg{width:${name.includes('foreground')?'62':'100'}vw;height:${name.includes('foreground')?'62':'100'}vh}</style>${svg}`);
  await page.screenshot({path:fileURLToPath(target)});
 }
}
await copyFile(new URL('../dist/icon-1024.png',import.meta.url),new URL('../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',import.meta.url));
await browser.close();
