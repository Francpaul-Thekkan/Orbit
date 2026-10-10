export const PROVIDERS = {
  Claude: {color:'#d89676', glyph:'✳', url:'https://claude.ai', tasks:['Writing','Coding','Research']},
  ChatGPT: {color:'#8bd5b3', glyph:'◎', url:'https://chatgpt.com', tasks:['General','Writing','Research']},
  Codex: {color:'#bab3ff', glyph:'⌘', url:'https://chatgpt.com/codex', tasks:['Coding']},
  Gemini: {color:'#8bb5ff', glyph:'✦', url:'https://gemini.google.com', tasks:['Research','General']},
  Other: {color:'#e5c87f', glyph:'◈', url:'', tasks:['General']}
};
export const HOUR=3600000, DAY=24*HOUR;
export const uid=()=>crypto.randomUUID();
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function countdown(date,now=Date.now()) {
  if(!date) return 'Not set';
  const ms=Date.parse(date)-now;
  if(ms<=0) return 'Due now';
  const m=Math.ceil(ms/60000),h=Math.floor(m/60),d=Math.floor(h/24);
  return d?`${d}d ${h%24}h`:h?`${h}h ${m%60}m`:`${m}m`;
}
export function isExpired(a,now=Date.now()){return !!a.expiresAt && Date.parse(a.expiresAt)<=now;}
export function isDue(w,now=Date.now()){return !!w.nextReset && Date.parse(w.nextReset)<=now;}
export function percent(w){return Math.min(100,Math.max(0,w.used/w.limit*100));}
export function remaining(a){return a.windows.length?Math.max(0,Math.min(...a.windows.map(w=>100-percent(w)))):null;}
export function available(a,now=Date.now()){return !a.paused&&!isExpired(a,now)&&a.windows.length>0&&remaining(a)>0&&!a.windows.some(w=>isDue(w,now));}
export function resetCount(a,w,now=Date.now()){
  if(!a.expiresAt||!w.nextReset||w.mode!=='fixed') return null;
  const end=Date.parse(a.expiresAt),step=w.hours*HOUR;
  let start=Date.parse(w.nextReset);
  if(start<now) start+=Math.ceil((now-start)/step)*step;
  return end<=start?0:Math.ceil((end-start)/step);
}
export function rankAccounts(accounts,task='All work',now=Date.now()){
  return accounts.filter(a=>available(a,now)).map(a=>{
    let score=remaining(a)*0.65;
    const reasons=[`${Math.round(remaining(a))}% in your tightest limit`];
    if(task!=='All work'&&a.tasks.includes(task)){score+=25;reasons.push(`suited to ${task.toLowerCase()}`);}
    if(a.favorite){score+=8;reasons.push('a favorite');}
    const next=Math.min(...a.windows.filter(w=>w.nextReset).map(w=>Date.parse(w.nextReset)));
    if(next-now<6*HOUR){score+=12;reasons.push('resets soon');}
    if(a.expiresAt&&Date.parse(a.expiresAt)-now<3*DAY){score+=10;reasons.push('use before expiry');}
    if(now-Date.parse(a.updatedAt)>DAY){score-=20;reasons.push('usage needs a fresh check');}
    return {account:a,score,reasons};
  }).sort((a,b)=>b.score-a.score);
}
export function monthlyCost(a){return a.status==='Paid'&&!a.paused&&!isExpired(a)?a.cost/(a.billing==='yearly'?12:1):0;}
export function advanceReset(w,now=Date.now()){
  const step=w.hours*HOUR;
  const anchor=w.nextReset?Date.parse(w.nextReset):now;
  return new Date(w.mode==='fixed'?anchor+Math.max(1,Math.floor((now-anchor)/step)+1)*step:now+step).toISOString();
}
export function validateAccount(a){
  if(!a||typeof a!=='object') throw Error('Invalid account.');
  const s=(v,n=200)=>typeof v==='string'&&v.length<=n;
  const date=v=>v===null||(s(v,40)&&Number.isFinite(Date.parse(v)));
  if(!s(a.id,100)||!a.id||!s(a.name,80)||!a.name.trim()||!Object.hasOwn(PROVIDERS,a.provider)||!s(a.email)||!s(a.tier,80)||!['Paid','Trial','Free'].includes(a.status)) throw Error('Invalid account details.');
  if(!['monthly','yearly'].includes(a.billing)||!Number.isFinite(a.cost)||a.cost<0||!['USD','INR','EUR','GBP'].includes(a.currency))throw Error('Invalid billing details.');
  if(!date(a.renewAt)||!date(a.expiresAt)||!date(a.updatedAt)||!a.updatedAt)throw Error('Invalid account dates.');
  if(typeof a.favorite!=='boolean'||typeof a.paused!=='boolean'||typeof a.autoRenew!=='boolean'||!s(a.notes,2000)||!Array.isArray(a.tasks)||a.tasks.some(t=>!['General','Coding','Writing','Research'].includes(t)))throw Error('Invalid preferences.');
  if(!Array.isArray(a.windows)||a.windows.length>8)throw Error('Use up to eight limits per account.');
  const ids=new Set();
  for(const w of a.windows){
    if(!s(w.id,100)||!w.id||ids.has(w.id)||!s(w.label,80)||!w.label.trim()||!s(w.unit,30)||!Number.isFinite(w.limit)||w.limit<=0||!Number.isFinite(w.used)||w.used<0||w.used>w.limit||!Number.isFinite(w.hours)||w.hours<0.25||w.hours>8760||!['fixed','rolling'].includes(w.mode)||!date(w.nextReset))throw Error('Invalid usage window. Used must be between zero and its limit.');
    ids.add(w.id);
  }
  return a;
}
export function validateBackup(data){
  if(!data||data.version!==1||!Array.isArray(data.accounts)||data.accounts.length>500||!Array.isArray(data.history)||data.history.length>5000)throw Error('This is not a supported Orbit backup.');
  const ids=new Set();
  for(const a of data.accounts){validateAccount(a);if(ids.has(a.id))throw Error('Duplicate account IDs.');ids.add(a.id);}
  for(const e of data.history)if(!e||typeof e.text!=='string'||e.text.length>500||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at)))throw Error('Invalid activity history.');
  return {version:1,accounts:data.accounts,history:data.history,demo:false};
}
