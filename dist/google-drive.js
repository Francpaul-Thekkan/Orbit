import {findHeads,parseSnapshot,workspace} from './sync-core.js';
export const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.appdata';
const NAME='orbit-workspace-v1.json';
const MAX_BYTES=5*1024*1024;
let loading;
export function loadGoogle(){
 if(globalThis.google?.accounts?.oauth2)return Promise.resolve();
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;
  const timer=setTimeout(()=>{s.remove();loading=null;reject(Error('Google sign-in took too long to load. Check your connection and try again.'));},15000);
  s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);s.remove();loading=null;reject(Error('Google sign-in could not load. Offline tracking still works.'));};document.head.append(s);
 });return loading;
}
// Call authorize from a direct click after loadGoogle completes, preserving popup user activation.
export function authorize(clientId){return new Promise((resolve,reject)=>{
 const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:`openid email ${DRIVE_SCOPE}`,include_granted_scopes:false,
  callback:r=>{if(r.error||!r.access_token){reject(Error('Google authorization was not completed.'));return;}if(!google.accounts.oauth2.hasGrantedAllScopes(r,DRIVE_SCOPE,'openid','email')){reject(Error('Allow Orbit app-data access to enable sync.'));return;}resolve({accessToken:r.access_token,expiresAt:Date.now()+Number(r.expires_in)*1000});},
  error_callback:()=>reject(Error('Google sign-in was closed or blocked. Try again when ready.'))});
 client.requestAccessToken({prompt:'select_account'});
});}
export class DriveRemote{
 constructor(session,fetcher=(...args)=>globalThis.fetch(...args)){this.session=session;this.fetcher=fetcher;}
 async request(url,init={}){
  if(Date.now()>=this.session.expiresAt-30000)throw Error('Google session expired. Reconnect to continue syncing.');
  const response=await this.fetcher(url,{...init,headers:{...init.headers,Authorization:`Bearer ${this.session.accessToken}`},signal:AbortSignal.timeout(20000)});
  if(!response.ok){if(response.status===401)throw Error('Google session expired or was revoked. Reconnect to sync.');if(response.status===403)throw Error('Google denied access. Check app-data permission and that Drive API is enabled.');if(response.status===429)throw Error('Google is limiting requests. Wait a moment, then sync again.');throw Error(`Google Drive request failed (${response.status}). Local data is safe.`);}
  return response;
 }
 async identity(){const data=await(await this.request('https://www.googleapis.com/oauth2/v3/userinfo')).json();if(typeof data.sub!=='string'||typeof data.email!=='string'||data.email_verified!==true)throw Error('Google account identity could not be verified.');return {id:data.sub,email:data.email};}
 async heads(){
  let files=[],pageToken='';
  do{
   const params=new URLSearchParams({spaces:'appDataFolder',q:`name = '${NAME}' and trashed = false`,fields:'nextPageToken,files(id,appProperties,size,modifiedTime)',pageSize:'1000',...(pageToken?{pageToken}:{})});
   const data=await(await this.request('https://www.googleapis.com/drive/v3/files?'+params)).json();
   if(!Array.isArray(data.files))throw Error('Google returned an invalid file listing.');files.push(...data.files);pageToken=data.nextPageToken||'';
   if(files.length>10000)throw Error('Cloud history is too large for this version. Export a backup before maintenance.');
  }while(pageToken);
  const heads=findHeads(files);if(heads.length>25)throw Error('Too many conflicting cloud versions. Export your backup before maintenance.');
  return Promise.all(heads.map(async file=>{
   if(Number(file.size)>MAX_BYTES)throw Error('Cloud backup exceeds the 5 MB safety limit.');
   const response=await this.request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.id)+'?alt=media');
   const text=await response.text();if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Cloud backup is too large.');
   return parseSnapshot(JSON.parse(text),file.appProperties.revision);
  }));
 }
 async append(data,parents){
  if(parents.length>25)throw Error('Too many concurrent versions to resolve in one sync.');
  const snapshot={schema:1,revision:crypto.randomUUID(),createdAt:new Date().toISOString(),workspace:workspace(data)};
  const content=JSON.stringify(snapshot);if(new TextEncoder().encode(content).length>MAX_BYTES)throw Error('Workspace exceeds the 5 MB sync limit. Export a local backup.');
  const metadata={name:NAME,mimeType:'application/json',parents:['appDataFolder'],appProperties:{orbitSchema:'1',revision:snapshot.revision,...Object.fromEntries(parents.map((v,i)=>['parent'+i,v]))}};
  const boundary='orbit_'+crypto.randomUUID();
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
  await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
  return snapshot;
 }
}
