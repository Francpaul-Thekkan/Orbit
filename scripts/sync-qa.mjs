import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const deadline=setTimeout(()=>{console.error('Sync QA exceeded its overall deadline.');browser.close();},90000);
const cloud=[];let uploads=0;
async function makePage(){
 const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'text/javascript',body:`window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:options=>({requestAccessToken:()=>options.callback({access_token:'mock-memory-only',expires_in:3600})})}}};`}));
 await page.route('https://www.googleapis.com/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:4173','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(url.pathname.includes('userinfo'))return route.fulfill({headers,json:{sub:'mock-user-1',email:'sync-test@example.com',email_verified:true}});
  if(req.method()==='POST'){
   const parts=req.postData().split('\r\n\r\n');const meta=JSON.parse(parts[1].split('\r\n--')[0]),snapshot=JSON.parse(parts[2].split('\r\n--')[0]);
   cloud.push({id:String(++uploads),appProperties:meta.appProperties,snapshot,size:'10000'});return route.fulfill({headers,json:{id:String(uploads)}});
  }
  if(url.searchParams.get('alt')==='media'){const file=cloud.find(f=>url.pathname.endsWith('/'+f.id));return route.fulfill({headers,json:file.snapshot});}
  return route.fulfill({headers,json:{files:cloud.map(({snapshot,...f})=>f)}});
 });
 await page.goto('http://127.0.0.1:4173');
 await page.getByRole('button',{name:'Get started',exact:false}).click();
 await page.getByRole('button',{name:'Continue',exact:false}).click();
 await page.getByRole('button',{name:'Continue',exact:false}).click();
 await page.getByRole('button',{name:'Open my workspace',exact:true}).click();
 await page.locator('.nav [data-view=settings]').click();
 await page.locator('.sync-config summary').click();await page.locator('[name=clientId]').fill('123456789-test.apps.googleusercontent.com');
 await page.getByRole('button',{name:'Save configuration',exact:true}).click();
 await page.getByRole('button',{name:'Connect Google Drive',exact:true}).click();
 await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
 try{await page.getByRole('button',{name:'Sync now',exact:true}).waitFor();}catch(e){console.log(await page.locator('#google-sync').innerText());throw e;}
 console.log('Mock Google session established.');
 assert.match(await page.locator('#google-sync').innerText(),/sync-test@example.com/);
 return {page,context,errors};
}
try{
 const a=await makePage();await a.page.locator('.nav [data-view=accounts]').click();await a.page.getByRole('button',{name:'Add account',exact:true}).first().click();
 await a.page.locator('[name=name]').fill('Synced personal account');await a.page.getByRole('button',{name:'Save account',exact:true}).click();
 await a.page.locator('.nav [data-view=settings]').click();await a.page.getByRole('button',{name:'Sync now',exact:true}).click();await a.page.getByText('Up to date',{exact:true}).waitFor();assert.equal(uploads,1);
 const b=await makePage();await b.page.getByRole('button',{name:'Sync now',exact:true}).click();await b.page.getByText('Up to date',{exact:true}).waitFor();
 await b.page.locator('.nav [data-view=accounts]').click();assert.match(await b.page.locator('.account').innerText(),/Synced personal account/);
 // Two independent offline edits based on the same cloud revision.
 for(const [device,name] of [[a,'Device A edit'],[b,'Device B edit']]){
  await device.page.locator('.nav [data-view=accounts]').click();await device.page.getByRole('button',{name:'Edit Synced personal account',exact:true}).click();await device.page.locator('[name=name]').fill(name);await device.page.getByRole('button',{name:'Save account',exact:true}).click();await device.page.locator('.nav [data-view=settings]').click();
 }
 await a.page.getByRole('button',{name:'Sync now',exact:true}).click();await a.page.getByText('Up to date',{exact:true}).waitFor();
 await b.page.getByRole('button',{name:'Sync now',exact:true}).click();await b.page.getByText('Choose the workspace to continue with',{exact:true}).waitFor();
 await b.page.screenshot({path:'artifacts/google-sync-conflict.png',fullPage:true});
 await b.page.setViewportSize({width:390,height:844});
 assert.ok(await b.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Sync settings fit a phone viewport');
 await b.page.screenshot({path:'artifacts/google-sync-mobile.png',fullPage:true});
 await b.page.getByRole('button',{name:'Use cloud',exact:true}).click();await b.page.getByRole('button',{name:'Use this version',exact:true}).click();await b.page.getByText('Up to date',{exact:true}).waitFor();
 await b.page.locator('.nav [data-view=accounts]').click();assert.match(await b.page.locator('.account').innerText(),/Device A edit/);
 assert.match(await b.page.evaluate(()=>localStorage.getItem('orbit.sync.recovery')),/Device B edit/);
 assert.equal(await b.page.evaluate(()=>JSON.stringify(localStorage).includes('mock-memory-only')),false);
 await b.page.locator('.nav [data-view=settings]').click();await b.page.getByRole('button',{name:'Disconnect',exact:true}).click();
 assert.match(await b.page.locator('#google-sync').innerText(),/Disconnected on this device/);
 await b.context.setOffline(true);await b.page.reload();await b.page.locator('.nav [data-view=accounts]').click();assert.match(await b.page.locator('.account').innerText(),/Device A edit/);
 assert.deepEqual([...a.errors,...b.errors],[]);
 console.log('PASS: Mock Google authorization, first upload, second-device restore, conflict confirmation, local recovery, token not persisted, disconnect and offline reload.');
}finally{clearTimeout(deadline);await browser.close();}
