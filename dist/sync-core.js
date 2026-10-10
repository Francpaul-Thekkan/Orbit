import {validateBackup} from './domain.js';
export function workspace(data){
 if(data?.demo)throw Error('Demo workspaces cannot be synced. Open your personal workspace first.');
 return validateBackup(data);
}
function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
export function fingerprint(data){return JSON.stringify(canonical(workspace(data)));}
export function decideSync(local,base,heads){
 const current=fingerprint(local);
 if(heads.length>1)return 'conflict';
 if(!heads.length)return base?'missing':'upload';
 const remote=fingerprint(heads[0].workspace);
 if(current===remote)return 'equal';
 if(!base)return !local.accounts.length&&!local.history.length?'download':'conflict';
 if(current===base.fingerprint)return 'download';
 if(heads[0].revision===base.revision)return 'upload';
 return 'conflict';
}
export function findHeads(files){
 const records=files.filter(f=>f.appProperties?.orbitSchema==='1');
 const parents=new Set(records.flatMap(f=>Object.entries(f.appProperties).filter(([k])=>/^parent\d+$/.test(k)).map(([,v])=>v)));
 const heads=records.filter(f=>!parents.has(f.appProperties.revision));
 if(records.some(f=>!f.appProperties.revision)||records.length&&!heads.length)throw Error('Cloud version history is invalid. Export your local backup before trying again.');
 return heads;
}
export function parseSnapshot(data,revision){
 if(data?.schema!==1||data.revision!==revision||typeof data.createdAt!=='string'||!Number.isFinite(Date.parse(data.createdAt)))throw Error('Invalid cloud workspace. Your local data has not changed.');
 return {...data,workspace:workspace(data.workspace)};
}
// Append-only versions preserve simultaneous writes, even when two devices read the same head.
// No remote files are overwritten/deleted, and conflicts are surfaced at the next read.
export class SyncEngine{
 constructor({remote,getLocal,saveLocal,storage,namespace,onStatus=()=>{},canApply=()=>true}){Object.assign(this,{remote,getLocal,saveLocal,storage,namespace,onStatus,canApply});this.busy=false;this.active=true;this.conflict=null;}
 key(){return 'orbit.sync.base.'+this.namespace;}
 base(){const value=this.storage.getItem(this.key());if(!value)return null;try{const base=JSON.parse(value);if(typeof base.revision!=='string'||typeof base.fingerprint!=='string')throw Error();return base;}catch{throw Error('Sync history could not be read. Disconnect and export a backup before resetting sync.');}}
 check(){if(!this.active)throw Error('Sync disconnected. Local data is unchanged.');}
 stop(){this.active=false;}
 async sync(choice=null){
  if(this.busy)return;
  this.busy=true;this.onStatus('syncing');
  try{
   this.check();const local=workspace(this.getLocal()),before=fingerprint(local),base=this.base();
   const heads=await this.remote.heads();this.check();
   if(fingerprint(this.getLocal())!==before)throw Error('Local data changed during sync. Sync again to include the latest edits.');
   let action=decideSync(local,base,heads),chosen=local;
   if(choice){
    if(!this.conflict||this.conflict.local!==before||JSON.stringify(heads.map(h=>h.revision).sort())!==JSON.stringify(this.conflict.heads.map(h=>h.revision).sort()))throw Error('A version changed while you were reviewing. Sync again before choosing.');
    if(choice!=='local'){const match=heads.find(h=>h.revision===choice);if(!match)throw Error('This cloud version is no longer current.');chosen=match.workspace;}
    action='upload';
   }
   if(action==='missing')throw Error('Your previous cloud history is missing. Sync stopped to avoid recreating data deleted elsewhere.');
   if(action==='conflict'){this.conflict={local:before,heads};this.onStatus('conflict');return {action,heads};}
   let head=heads[0];
   if(action==='upload'){
    head=await this.remote.append(chosen,heads.map(h=>h.revision));this.check();
    // Confirm visibility and detect concurrent writers before claiming that sync is complete.
    const latest=await this.remote.heads();this.check();
    if(latest.length!==1||latest[0].revision!==head.revision){this.conflict=null;throw Error('Cloud versions changed during upload. Your version is preserved; sync again to review.');}
   }
   if(action==='download'||(choice&&choice!=='local')){
    if(!this.canApply())throw Error('Finish editing before downloading a cloud version.');
    if(fingerprint(this.getLocal())!==before)throw Error('New local edits were kept. Sync again to review cloud changes.');
    this.saveLocal(head.workspace); // Must persist successfully before advancing the baseline.
   }
   this.storage.setItem(this.key(),JSON.stringify({revision:head.revision,fingerprint:fingerprint(head.workspace),at:new Date().toISOString()}));
   this.conflict=null;
   const pending=fingerprint(this.getLocal())!==fingerprint(head.workspace);
   this.onStatus(pending?'pending':'synced');return {action,pending};
  }catch(error){this.onStatus('error',error.message);throw error;}finally{this.busy=false;}
 }
}
