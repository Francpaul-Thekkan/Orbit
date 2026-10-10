import {HOUR,PROVIDERS,uid} from '../dist/domain.js';
export function demoData(now=Date.now()){
  const date=h=>new Date(now+h*HOUR).toISOString();
  const make=(provider,name,tier,status,cost,used,weekly,hours,days)=>({id:uid(),provider,name,email:`${name.toLowerCase().replaceAll(' ','-')}@example.com`,tier,status,cost,currency:'USD',billing:'monthly',renewAt:date(days*24),expiresAt:status==='Trial'?date(days*24):null,autoRenew:status==='Paid',favorite:provider==='Claude',paused:false,tasks:PROVIDERS[provider].tasks,notes:'Illustrative sample. These are not actual provider quotas or prices.',updatedAt:date(-0.2),windows:[{id:uid(),label:'Session limit',limit:100,used,unit:'%',hours:5,nextReset:date(hours),mode:'fixed'},{id:uid(),label:'Weekly limit',limit:100,used:weekly,unit:'%',hours:168,nextReset:date(60),mode:'fixed'}]});
  return {version:1,demo:true,accounts:[make('Claude','Personal','Pro','Paid',20,28,44,2.7,12),make('Codex','Development','Plus','Paid',20,84,62,1.3,18),make('Gemini','Creative','AI Pro','Trial',0,12,20,4.1,3),make('ChatGPT','Everyday','Plus','Paid',20,56,36,3.6,7)],history:[]};
}
