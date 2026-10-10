import {GOOGLE_CLIENT_ID} from './config.js';
import {loadGoogle,authorize,DriveRemote} from './google-drive.js';
import {SyncEngine} from './sync-core.js';
import {esc} from './domain.js';
const CLIENT_KEY='orbit.google.clientId';
export function setupGoogleSync({getLocal,saveLocal,isNative,canApply,notify}){
 let engine=null,session=null,identity=null,status='disconnected',message='',prepared=false,busy=false,auto=false,confirmed=false,generation=0,job;
 const supported=()=>!isNative()&&['http:','https:'].includes(location.protocol);
 const read=k=>{try{return localStorage.getItem(k)||'';}catch{return '';}};
 const clientId=()=>GOOGLE_CLIENT_ID||read(CLIENT_KEY);
 const lastSync=()=>{try{return engine?.base()?.at;}catch{return null;}};
 function label(){if(!navigator.onLine&&identity)return 'Offline · edits stay on this device';return ({disconnected:'Not connected',loading:'Preparing secure sign-in…',ready:'Ready to sign in',authorizing:'Waiting for Google…',pending:'Ready to sync local changes',syncing:'Syncing with Google Drive…',synced:'Up to date',conflict:'Different versions need your review',error:'Sync needs attention'})[status]||status;}
 function render(){
  const host=document.querySelector('#google-sync');if(!host)return;
  host.innerHTML=`<div class="sync-heading"><div><p class="eyebrow">TAKE YOUR WORKSPACE WITH YOU</p><h3><span class="google-letter" aria-hidden="true">G</span> Google Drive sync</h3></div><span class="badge ${status==='conflict'||status==='error'?'warning':identity?'':'neutral'}">${identity?'Connected':'Optional'}</span></div><p>Keep your accounts, usage, notes, and activity in your own Google Drive app-data space. Your regular Drive files are never requested. Local tracking works without signing in.</p><div class="sync-status" role="status"><span class="dot"></span><div><strong>${esc(label())}</strong><small>${identity?esc(identity.email):'Your workspace stays local until you connect and sync.'}${lastSync()?' · Last sync '+esc(new Date(lastSync()).toLocaleString()):''}</small></div></div>${message?`<p class="sync-message" role="alert">${esc(message)}</p>`:''}${getLocal().demo?'<div class="notice">Open your personal workspace before connecting. Sample data is never uploaded.</div>':''}${!supported()?'<div class="notice">Google sync is currently available in the browser and installed web app. Native desktop and mobile sign-in still need their platform-specific OAuth integration. Use backup export/import for those builds.</div>':!clientId()?'<div class="notice">Google sign-in needs one-time app setup. Add a public OAuth web client ID below; no client secret is needed.</div>':''}<div class="sync-actions">${identity?`<button class="btn primary" data-sync="now" ${busy||getLocal().demo?'disabled':''}>Sync now</button><button class="btn" data-sync="disconnect" ${busy?'disabled':''}>Disconnect</button>`:`<button class="btn google-connect" data-sync="${prepared?'connect':'prepare'}" ${!supported()||!clientId()||getLocal().demo||busy?'disabled':''}><span class="google-letter" aria-hidden="true">G</span> ${prepared?'Continue with Google':'Connect Google Drive'}</button>`}<button class="btn ghost" data-sync="privacy">What gets synced?</button></div>${identity?`<label class="sync-auto"><input type="checkbox" data-sync-auto ${auto?'checked':''}> Sync automatically while Orbit is open</label><p class="help">${confirmed?'Edits sync after a short pause and when this device reconnects.':'Click Sync now to confirm this workspace belongs in '+esc(identity.email)+'.'} Google may ask you to sign in again after this session expires.</p>`:''}${engine?.conflict?conflictHtml():''}${supported()?`<details class="sync-config"><summary>Google app setup</summary><p class="help">Use the same Google Cloud project on all devices. Enable Drive API, configure the consent screen, and add this exact origin: <code>${esc(location.origin)}</code>. See GOOGLE-SYNC-SETUP.md in the source for the full setup.</p><form id="google-config-form"><label class="field">Public OAuth web client ID<input name="clientId" autocomplete="off" spellcheck="false" placeholder="123456789-example.apps.googleusercontent.com" value="${esc(clientId())}" ${GOOGLE_CLIENT_ID||identity?'readonly':''} required></label><button class="btn small" type="submit" ${GOOGLE_CLIENT_ID||identity?'disabled':''}>Save configuration</button></form><p class="help">This is a public identifier. Never paste a client secret, password, or access token.</p></details>`:''}`;
 }
 function conflictHtml(){return `<div class="sync-conflict"><h4>Choose the workspace to continue with</h4><p>Both versions have changes. Choosing a version replaces the whole workspace. Orbit saves a local recovery copy and keeps cloud versions so neither side is silently lost.</p><div class="sync-actions"><button class="btn" data-sync="export-local">Download local copy</button><button class="btn" data-sync="choose" data-choice="local">Keep this device (${getLocal().accounts.length} accounts)</button></div>${engine.conflict.heads.map(h=>`<div class="sync-version"><span><strong>Cloud · ${h.workspace.accounts.length} accounts</strong><small>${esc(new Date(h.createdAt).toLocaleString())}</small></span><button class="btn small" data-sync="export-cloud" data-revision="${esc(h.revision)}">Download</button><button class="btn small" data-sync="choose" data-choice="${esc(h.revision)}">Use cloud</button></div>`).join('')}</div>`;}
 function setStatus(value,error=''){status=value;message=error;render();}
 function schedule(){clearTimeout(job);if(engine&&auto&&confirmed&&!engine.conflict&&navigator.onLine&&!getLocal().demo)job=setTimeout(()=>run(),2500);}
 async function run(choice){
  if(!engine||busy||getLocal().demo)return;
  if(!navigator.onLine){setStatus('pending','You are offline. Your changes are saved on this device.');return;}
  if(!canApply()){setStatus('pending','Finish editing before syncing.');return;}
  busy=true;message='';const current=engine;
  try{const result=await current.sync(choice);if(engine!==current)return;confirmed=true;if(result?.action==='conflict')notify('Sync paused: review the local and cloud versions in Settings.');}
  catch(error){if(engine===current){message=error.message;status='error';}}
  finally{busy=false;render();}
 }
 function disconnect(){generation++;clearTimeout(job);engine?.stop();engine=null;session=null;identity=null;auto=false;confirmed=false;prepared=false;busy=false;setStatus('disconnected','Disconnected on this device. Local data and Drive versions are kept. To revoke permission or delete app data, use your Google Account connections / Drive settings.');}
 document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-sync]');if(!el)return;event.preventDefault();
  switch(el.dataset.sync){
   case 'prepare':{if(getLocal().demo||!supported()||!clientId())return;busy=true;setStatus('loading');try{await loadGoogle();prepared=true;setStatus('ready');}catch(e){setStatus('error',e.message);}finally{busy=false;render();}break;}
   case 'connect':{
    if(!prepared||getLocal().demo)return;
    const epoch=++generation;busy=true;setStatus('authorizing');
    try{session=await authorize(clientId());const remote=new DriveRemote(session);const who=await remote.identity();if(epoch!==generation)return;identity=who;
     const namespace=clientId()+'.'+identity.id;
     engine=new SyncEngine({remote,getLocal,saveLocal,storage:localStorage,namespace,canApply,onStatus:setStatus});
     auto=read('orbit.sync.auto.'+namespace)==='true';confirmed=false;setStatus('pending','Click Sync now to connect this personal workspace to the Google account shown above.');
    }catch(e){session=null;setStatus('error',e.message);}finally{busy=false;render();}break;
   }
   case 'now':await run();break;
   case 'disconnect':disconnect();break;
   case 'privacy':notify('Sync uploads account labels, email identifiers, plan details, limits, notes, and activity to your own Drive. No AI account passwords. Cloud copies are not end-to-end encrypted.');break;
   case 'export-local':exportJson(getLocal(),'orbit-local-before-sync.json');break;
   case 'export-cloud':{const h=engine?.conflict?.heads.find(h=>h.revision===el.dataset.revision);if(h)exportJson(h.workspace,'orbit-cloud-'+h.revision.slice(0,8)+'.json');break;}
   case 'choose':{
    if(!engine?.conflict)return;
    const dialog=document.querySelector('#modal');
    dialog.innerHTML=`<div class="modal-header"><h2>Confirm sync version</h2><button class="icon-btn" data-action="close" aria-label="Close dialog">×</button></div><div class="modal-body"><p class="help">${el.dataset.choice==='local'?'Make this device’s workspace the current cloud version. Other devices will receive it on their next sync.':'Replace this device’s workspace with the selected cloud version, and make that the version other devices receive.'} Download copies first if you want to combine changes manually.</p></div><div class="modal-footer"><button class="btn" data-action="close">Cancel</button><button class="btn primary" data-sync="resolve" data-choice="${esc(el.dataset.choice)}">Use this version</button></div>`;dialog.showModal();break;
   }
   case 'resolve':document.querySelector('#modal').close();await run(el.dataset.choice);break;
  }
 });
 document.addEventListener('submit',event=>{if(event.target.id!=='google-config-form')return;event.preventDefault();const id=new FormData(event.target).get('clientId').trim();if(!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)){notify('Enter a public Google OAuth client ID ending in .apps.googleusercontent.com.');return;}try{localStorage.setItem(CLIENT_KEY,id);prepared=false;setStatus('disconnected');notify('Google configuration saved. You can connect when ready.');}catch{notify('Could not save configuration in this browser.');}});
 document.addEventListener('change',event=>{if(!event.target.matches('[data-sync-auto]')||!engine)return;auto=event.target.checked;try{localStorage.setItem('orbit.sync.auto.'+engine.namespace,String(auto));}catch{auto=false;notify('Unable to save sync preferences.');}render();schedule();});
 window.addEventListener('online',schedule);
 window.addEventListener('offline',()=>{clearTimeout(job);render();});
 // Poll while visible, signed in and explicitly enabled; never in the background or while editing.
 setInterval(()=>{if(document.visibilityState==='visible'&&auto&&confirmed&&!engine?.conflict&&status!=='error')run();},60000);
 function changed(){if(engine){status=engine.conflict?'conflict':'pending';message='';render();schedule();}}
 return {render,changed};
}
function exportJson(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
