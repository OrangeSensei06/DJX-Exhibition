const {app,BrowserWindow}=require('electron'),assert=require('node:assert/strict'),fs=require('node:fs');
require('../dist-electron/electron/main.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));async function until(label,fn){for(let i=0;i<450;i++){if(await fn())return;await wait(100)}throw Error('Timed out: '+label)}
(async()=>{
 await app.whenReady();await wait(1800);const ws=BrowserWindow.getAllWindows(),b=ws.find(w=>w.getTitle().endsWith('Book')),v=ws.find(w=>w.getTitle().endsWith('Vertical'));
 const read=(w,c)=>w.webContents.executeJavaScript(c),state=()=>read(b,'window.exhibition.getSnapshot()'),action=a=>read(b,`window.exhibition.motifsAction('${a}')`);
 fs.mkdirSync('output/mehndi',{recursive:true});const shot=async name=>fs.writeFileSync(`output/mehndi/${name}.png`,(await b.webContents.capturePage()).toPNG());
 await read(b,'window.exhibition.bookOpen(4)');await wait(2100);await shot('original');
 const geometry=await read(b,"(()=>{const e=document.querySelector('.bound-right [data-node-id=\"126:2588\"]');return [e.offsetLeft,e.offsetTop,e.offsetWidth,e.offsetHeight]})()");
 await action('lift');await wait(1050);assert.equal((await state()).motifs.phase,'WAIT');assert.equal(await read(v,'document.querySelectorAll("iframe").length'),0);await shot('lifting');
 await until('bare hand and gallery intro',async()=>(await state()).handoff.phase==='away');await wait(200);await shot('bare');
 assert.equal(await read(b,"document.querySelector('.bound-right .mehndi-hand canvas').dataset.progress"),'1.000');
 assert.deepEqual(await read(b,"(()=>{const e=document.querySelector('.bound-right [data-node-id=\"126:2588\"]');return [e.offsetLeft,e.offsetTop,e.offsetWidth,e.offsetHeight]})()"),geometry);
 assert.equal(await read(b,"document.querySelectorAll('.mehndi-hand canvas[data-error]').length"),0);
 await until('scroll ready',async()=>(await state()).motifs.phase==='SCROLL_READY');await action('open');await until('content',async()=>(await state()).motifs.phase==='CONTENT_VISIBLE');await action('next');
 await until('returning ink',async()=>(await state()).handoff.phase==='returning');await wait(1150);assert.equal((await state()).motifs.active,true);assert.equal(await read(b,"document.querySelector('[data-book-turning]').dataset.bookTurning"),'false');await shot('returning');
 await until('ink restored',async()=>await read(b,"document.querySelector('.bound-right .mehndi-hand canvas')?.dataset.progress==='0.000'"));await shot('restored');
 assert.equal(await read(b,"document.querySelector('.bound-right .mehndi-hand canvas').dataset.progress"),'0.000');
 await until('chapter 5',async()=>(await state()).jewels.active);await wait(1800);
 // Reset cancels a partly completed transfer and restores the printed hand.
 await read(b,'window.exhibition.bookOpen(4)');await wait(2100);await action('lift');await wait(600);await action('reset');await wait(300);
 assert.equal((await state()).motifs.phase,'WAIT');assert.equal(await read(b,"document.querySelector('.bound-right .mehndi-hand canvas').dataset.progress"),'0.000');
 console.log('PASS: fixed hand geometry, dot lift before intro, bare hand, reversal before page turn, restored ink and interrupted reset');app.exit(0);
})().catch(e=>{console.error(e);app.exit(1)});
