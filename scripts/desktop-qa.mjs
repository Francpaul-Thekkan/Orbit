import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
const packaged=process.env.ORBIT_PACKAGED_QA==='1';
const app=await electron.launch({...(packaged?{executablePath:path.resolve('releases/win-unpacked/Orbit.exe')}:{}),args:[...(packaged?[]:['.']),'--user-data-dir='+path.resolve('artifacts/desktop-test-'+Date.now())],env:{...process.env,ELECTRON_ENABLE_LOGGING:'1'}});
try{
 const window=await app.firstWindow();await window.locator('#setup-dialog[open]').waitFor();
 assert.equal(await window.locator('.account').count(),0);
 await window.getByRole('button',{name:'Get started',exact:false}).click();
 await window.getByRole('button',{name:'Continue',exact:false}).click();
 await window.getByRole('button',{name:'Continue',exact:false}).click();
 await window.getByRole('button',{name:'Add my first account',exact:false}).click();
 await window.locator('[name=name]').fill('Offline desktop QA');
 await window.getByRole('button',{name:'Save account',exact:true}).click();
 await window.reload();assert.match(await window.locator('.account').innerText(),/Offline desktop QA/);
 assert.equal(await window.locator('#setup-dialog[open]').count(),0);
 await window.locator('.nav [data-view=settings]').click();
 assert.match(await window.locator('#google-sync').innerText(),/Native desktop and mobile sign-in/);
 assert.equal(await window.getByRole('button',{name:'Connect Google Drive',exact:true}).isDisabled(),true);
 await window.screenshot({path:'artifacts/windows-app.png'});
 console.log('PASS: Electron app loads bundled UI and preserves edits across reload with no server.');
}finally{await app.close();}
