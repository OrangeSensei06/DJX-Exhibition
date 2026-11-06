const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');const path=require('node:path');
const out=path.resolve(__dirname,'../Previews');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
  const window=new BrowserWindow({width:1200,height:1000,show:false,webPreferences:{contextIsolation:true}});
  const errors=[];window.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
  await window.loadFile(path.resolve(__dirname,'../Source/runtime-qa-dist/runtime_qa.html'));
  let result;
  for(let i=0;i<150;i++){
    result=await window.webContents.executeJavaScript('({report:window.qaReport,error:window.qaError})');
    if(result.report||result.error)break;await delay(200);
  }
  if(!result.report||result.error)throw new Error(JSON.stringify({result,errors}));
  for(const [name,expression] of [['Runtime_Assembled','window.qaRender()'],['Runtime_Exploded','window.qaRender(true)'],['Runtime_Rear','window.qaRender(false,true)']]){
    await window.webContents.executeJavaScript(expression);await delay(200);
    fs.writeFileSync(path.join(out,name+'.png'),(await window.webContents.capturePage()).toPNG());
  }
  fs.writeFileSync(path.resolve(__dirname,'../Source/runtime_validation.json'),JSON.stringify({...result.report,errors},null,2));
  console.log(JSON.stringify(result.report));app.exit(errors.length?1:0);
}).catch(error=>{console.error(error);app.exit(1);});
