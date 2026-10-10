import {demoData} from './fixtures.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HOUR,DAY,remaining,available,resetCount,rankAccounts,validateBackup,advanceReset,monthlyCost} from '../dist/domain.js';
const now=Date.parse('2026-10-10T12:00:00Z');
test('both session and weekly caps constrain availability',()=>{
 const a=demoData(now).accounts[0];a.windows[1].used=100;
 assert.equal(remaining(a),0);assert.equal(available(a,now),false);
});
test('elapsed resets do not silently create credits',()=>{
 const a=demoData(now).accounts[0];a.windows[0].nextReset=new Date(now-1).toISOString();
 assert.equal(available(a,now),false);assert.equal(rankAccounts([a],'Coding',now).length,0);
});
test('expired and paused accounts are excluded',()=>{
 const data=demoData(now);data.accounts.forEach(a=>a.paused=true);assert.equal(rankAccounts(data.accounts,'All work',now).length,0);
 const a=data.accounts[0];a.paused=false;a.expiresAt=new Date(now).toISOString();assert.equal(available(a,now),false);
});
test('fixed resets count only before expiry, including after missed windows',()=>{
 const a=demoData(now).accounts[0],w=a.windows[0];w.nextReset=new Date(now-2*HOUR).toISOString();a.expiresAt=new Date(now+13*HOUR).toISOString();
 assert.equal(resetCount(a,w,now),2);w.mode='rolling';assert.equal(resetCount(a,w,now),null);
});
test('reset confirmation advances fixed schedule through missed periods',()=>{
 const w=demoData(now).accounts[0].windows[0];w.nextReset=new Date(now-12*HOUR).toISOString();
 assert.equal(advanceReset(w,now),new Date(now+3*HOUR).toISOString());w.mode='rolling';assert.equal(advanceReset(w,now),new Date(now+5*HOUR).toISOString());
});
test('ranking responds to task fit and stale usage',()=>{
 const a=demoData(now).accounts[0],b=structuredClone(a);b.id='b';a.tasks=['Writing'];a.favorite=false;b.tasks=['Coding'];b.favorite=false;
 assert.equal(rankAccounts([a,b],'Coding',now)[0].account.id,'b');b.updatedAt=new Date(now-2*DAY).toISOString();assert.ok(rankAccounts([b],'Coding',now)[0].reasons.includes('usage needs a fresh check'));
});
test('backup validation refuses invalid or malicious shapes and duplicate IDs',()=>{
 const data=demoData(now);assert.equal(validateBackup(data).accounts.length,4);
 data.accounts[0].windows[0].used=-2;assert.throws(()=>validateBackup(data));
 const duplicates=demoData(now);duplicates.accounts.push(duplicates.accounts[0]);assert.throws(()=>validateBackup(duplicates));
 const invalid=demoData(now);invalid.accounts[0].expiresAt='bogus';assert.throws(()=>validateBackup(invalid));
});
test('annual billing is averaged; trials and inactive plans are excluded',()=>{
 const a=demoData().accounts[0];a.billing='yearly';a.cost=120;assert.equal(monthlyCost(a),10);a.status='Trial';assert.equal(monthlyCost(a),0);a.status='Paid';a.paused=true;assert.equal(monthlyCost(a),0);
});
