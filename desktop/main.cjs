const {app,BrowserWindow,session,shell}=require('electron');
const path=require('node:path');
const ALLOWED=new Set(['https://claude.ai','https://chatgpt.com','https://gemini.google.com']);
function createWindow(){
 const win=new BrowserWindow({width:1440,height:960,minWidth:390,minHeight:600,backgroundColor:'#101114',title:'Orbit',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.loadFile(path.join(__dirname,'../dist/index.html'));
 win.webContents.setWindowOpenHandler(({url})=>{try{if(ALLOWED.has(new URL(url).origin))shell.openExternal(url);}catch{}return {action:'deny'};});
 win.webContents.on('will-navigate',(event,url)=>{if(url!==win.webContents.getURL())event.preventDefault();});
}
app.whenReady().then(()=>{session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
