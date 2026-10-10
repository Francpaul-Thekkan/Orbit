import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const backup=JSON.parse(await readFile('artifacts/test-backup.json','utf8'));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();
 await page.addInitScript(data=>localStorage.setItem('orbit.workspace.v1',JSON.stringify(data)),backup);
 await page.goto('http://127.0.0.1:4173');await page.locator('.account').waitFor();
 assert.equal(await page.locator('#setup-dialog[open]').count(),0);
 assert.equal(await page.locator('.account').count(),backup.accounts.length);
 assert.match(await page.locator('.account').first().innerText(),new RegExp(backup.accounts[0].name));
 assert.equal(await page.locator('.demo-banner').count(),0);
 const second=await browser.newPage();await second.goto('http://127.0.0.1:4173');
 await second.getByRole('button',{name:'Get started',exact:false}).click();
 await second.getByRole('button',{name:'Continue',exact:false}).click();
 await second.getByRole('button',{name:'Continue',exact:false}).click();
 const chooser=second.waitForEvent('filechooser');await second.getByRole('button',{name:'Restore an Orbit backup',exact:true}).click();
 await (await chooser).setFiles('artifacts/test-backup.json');
 await second.getByRole('button',{name:'Confirm',exact:true}).click();
 assert.equal(await second.locator('.account').count(),backup.accounts.length);
 await second.reload();assert.equal(await second.locator('#setup-dialog[open]').count(),0);
 console.log('PASS: Upgrade preserves saved accounts without forced setup; first-run restore opens picker and survives restart.');
}finally{await browser.close();}
