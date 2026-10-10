import {demoData} from './fixtures.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {SyncEngine,decideSync,findHeads,fingerprint,parseSnapshot} from '../dist/sync-core.js';
import {DriveRemote} from '../dist/google-drive.js';
const data=()=>({...demoData(),demo:false});
const empty=()=>({version:1,accounts:[],history:[],demo:false});
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
class Remote{
 constructor(){this.versions=[];}
 async heads(){const parents=new Set(this.versions.flatMap(v=>v.parents));return structuredClone(this.versions.filter(v=>!parents.has(v.revision)));}
 async append(workspace,parents){const h={schema:1,revision:crypto.randomUUID(),createdAt:new Date().toISOString(),workspace:structuredClone(workspace),parents};this.versions.push(h);return structuredClone(h);}
}
function device(remote,initial=data(),opts={}){let local=initial;const events=[];const e=new SyncEngine({remote,getLocal:()=>local,saveLocal:d=>local=structuredClone(d),storage:storage(),namespace:'test',onStatus:(s,m)=>events.push([s,m]),...opts});return {e,events,get local(){return local;},set local(d){local=d;}};}
test('new device uploads; second empty device downloads, and identical state is a no-op',async()=>{
 const remote=new Remote(),a=device(remote),b=device(remote,empty());
 assert.equal((await a.e.sync()).action,'upload');assert.equal((await b.e.sync()).action,'download');
 assert.equal(fingerprint(a.local),fingerprint(b.local));await a.e.sync();assert.equal(remote.versions.length,1);
});
test('offline edits on two devices create conflict without discarding either copy',async()=>{
 const remote=new Remote(),a=device(remote),b=device(remote,empty());await a.e.sync();await b.e.sync();
 a.local.accounts[0].name='Device A';b.local.accounts[0].name='Device B';await a.e.sync();
 assert.equal((await b.e.sync()).action,'conflict');assert.equal(b.local.accounts[0].name,'Device B');assert.equal(remote.versions.length,2);
 await b.e.sync('local');await a.e.sync();assert.equal(a.local.accounts[0].name,'Device B');assert.equal(remote.versions.length,3);
});
test('delete propagates as part of workspace and is not resurrected',async()=>{
 const remote=new Remote(),a=device(remote),b=device(remote,empty());await a.e.sync();await b.e.sync();a.local.accounts.shift();await a.e.sync();await b.e.sync();assert.equal(b.local.accounts.length,3);
});
test('first sign-in with nonempty local and different cloud data asks for resolution',async()=>{
 const remote=new Remote(),a=device(remote),b=device(remote);await a.e.sync();assert.equal((await b.e.sync()).action,'conflict');
 const cloud=b.e.conflict.heads[0].revision;await b.e.sync(cloud);assert.equal(fingerprint(a.local),fingerprint(b.local));
});
test('simultaneous branches are preserved and reported',async()=>{
 const remote=new Remote(),a=device(remote);await a.e.sync();const parent=remote.versions[0].revision;
 await remote.append(data(),[parent]);await remote.append(data(),[parent]);
 assert.equal((await a.e.sync()).action,'conflict');assert.equal(a.e.conflict.heads.length,2);assert.equal(remote.versions.length,3);
});
test('stale conflict choices do not overwrite newer local or cloud edits',async()=>{
 const remote=new Remote(),a=device(remote),b=device(remote);await a.e.sync();await b.e.sync();b.local.accounts[0].name='Changed after review';
 await assert.rejects(b.e.sync('local'),/version changed/);assert.equal(remote.versions.length,1);
});
test('cloud history deletion stops rather than automatically reuploading',async()=>{
 const remote=new Remote(),a=device(remote);await a.e.sync();remote.versions=[];await assert.rejects(a.e.sync(),/history is missing/);
});
test('edits during remote read are retained',async()=>{
 const remote=new Remote(),a=device(remote);const original=remote.heads.bind(remote);remote.heads=async()=>{a.local.accounts[0].name='In flight edit';return original();};
 await assert.rejects(a.e.sync(),/changed during sync/);assert.equal(a.local.accounts[0].name,'In flight edit');assert.equal(remote.versions.length,0);
});
test('late disconnect prevents local apply and baseline writes',async()=>{
 const remote=new Remote(),a=device(remote),b=device(remote,empty());await a.e.sync();const original=remote.heads.bind(remote);remote.heads=async()=>{b.e.stop();return original();};
 await assert.rejects(b.e.sync(),/disconnected/);assert.equal(b.local.accounts.length,0);assert.equal(b.e.base(),null);
});
test('failed local save does not advance sync baseline',async()=>{
 const remote=new Remote(),a=device(remote);await a.e.sync();const b=device(remote,empty(),{saveLocal:()=>{throw Error('Storage full');}});
 await assert.rejects(b.e.sync(),/Storage full/);assert.equal(b.e.base(),null);
});
test('failed network request leaves workspace and baseline untouched',async()=>{
 const a=device({heads:async()=>{throw Error('Offline');}});const before=fingerprint(a.local);await assert.rejects(a.e.sync(),/Offline/);assert.equal(a.e.base(),null);assert.equal(before,fingerprint(a.local));
});
test('demo data and malformed cloud backups are rejected',()=>{
 assert.throws(()=>fingerprint(demoData()),/Demo/);assert.throws(()=>parseSnapshot({schema:1,revision:'x',createdAt:new Date().toISOString(),workspace:{}},'x'));
});
test('head detection is based on lineage rather than unreliable device clock',()=>{
 const files=[{appProperties:{orbitSchema:'1',revision:'a'}},{appProperties:{orbitSchema:'1',revision:'b',parent0:'a'}},{appProperties:{orbitSchema:'1',revision:'c',parent0:'a'}}];
 assert.deepEqual(findHeads(files).map(x=>x.appProperties.revision),['b','c']);
});
test('Drive adapter restricts app-data listing, handles pagination, and uses append-only multipart upload',async()=>{
 const calls=[],d=data(),snapshot={schema:1,revision:'abc',createdAt:new Date().toISOString(),workspace:d};
 const fake=async(url,init)=>{calls.push([url,init]);if(url.includes('upload'))return new Response('{"id":"new"}');if(url.includes('alt=media'))return new Response(JSON.stringify(snapshot));if(url.includes('pageToken'))return Response.json({files:[{id:'file',appProperties:{orbitSchema:'1',revision:'abc'},size:'123'}]});return Response.json({files:[],nextPageToken:'next'});};
 const drive=new DriveRemote({accessToken:'test-token',expiresAt:Date.now()+3600000},fake);
 assert.equal((await drive.heads())[0].revision,'abc');await drive.append(d,['abc']);
 assert.match(calls[0][0],/spaces=appDataFolder/);assert.match(calls[1][0],/pageToken=next/);assert.equal(calls[3][1].method,'POST');assert.match(calls[3][1].body,/"parents":\["appDataFolder"\]/);assert.match(calls[3][1].body,/"parent0":"abc"/);
});
test('expired tokens never reach network and error statuses are actionable',async()=>{
 let calls=0;const drive=new DriveRemote({accessToken:'expired',expiresAt:0},async()=>{calls++;});await assert.rejects(drive.heads(),/expired/);assert.equal(calls,0);
 const denied=new DriveRemote({accessToken:'test',expiresAt:Date.now()+3600000},async()=>new Response('',{status:403}));await assert.rejects(denied.heads(),/denied access/);
});
