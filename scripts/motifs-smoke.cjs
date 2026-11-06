const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict'),fs=require('node:fs');
require('../dist-electron/electron/main.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(label,fn){for(let i=0;i<350;i++){if(await fn())return;await wait(100)}throw Error('Timed out: '+label)}
(async()=>{
 await app.whenReady();await wait(2000);
 const ws=BrowserWindow.getAllWindows(),book=ws.find(w=>w.getTitle().endsWith('Book')),gallery=ws.find(w=>w.getTitle().endsWith('Vertical'));
 const read=(w,c)=>w.webContents.executeJavaScript(c),action=a=>read(book,`window.exhibition.motifsAction('${a}')`),state=()=>read(book,'window.exhibition.getSnapshot().then(s=>s.motifs)');
 fs.mkdirSync('output/motifs',{recursive:true});
 const shot=async n=>fs.writeFileSync(`output/motifs/${n}.png`,(await gallery.webContents.capturePage()).toPNG());
 await action('start');await until('intro begins',async()=>(await state()).phase==='INTRO');
 await action('open');assert.equal((await state()).phase,'INTRO');
 await until('scroll ready',async()=>(await state()).phase==='SCROLL_READY');await shot('scroll-ready');
 assert.equal(await read(gallery,"document.querySelector('iframe').contentDocument.querySelectorAll('button').length"),0,'No audience controls');
 await read(gallery,"document.querySelector('iframe').contentWindow.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter'}))");await wait(100);assert.equal((await state()).phase,'SCROLL_READY','Audience keyboard cannot open scroll');
 await read(gallery,"document.querySelector('iframe').contentWindow.addEventListener('message',e=>{window.motifsMessage={origin:e.origin,data:e.data}})");
 await action('open');await action('open');try{await until('content visible',async()=>(await state()).phase==='CONTENT_VISIBLE')}catch(e){console.error(await state());console.error(await read(gallery,"({parentPhase:document.querySelector('[data-motifs-phase]').dataset.motifsPhase,message:window.motifsMessage,frameOrigin:document.querySelector('iframe').contentWindow.location.origin,origin:location.origin})"));throw e}await wait(1600);await shot('scroll-open');
 for(let n=1;n<=3;n++){await action('bloom');await until('bloom ack',async()=>{const s=await state();return s.blooms===n&&!s.command});}
 await action('bloom');assert.equal((await state()).blooms,3);await wait(2000);await shot('garden-bloom');
 assert.equal(await read(gallery,'window.exhibition.getSnapshot().then(s=>s.motifs.blooms)'),3,'Displays agree');
 await action('reset');await until('replay begins',async()=>(await state()).phase==='INTRO');assert.equal((await state()).blooms,0);
 await action('reset');await until('second replay',async()=>(await state()).phase==='INTRO');await action('exit');assert.equal((await state()).active,false);
 console.log('PASS: original automatic sequence, no vertical buttons/keyboard interaction, synchronized Setup commands, bloom cap, rapid open guard, replay and exit');app.exit(0);
})().catch(e=>{console.error(e);app.exit(1)});
