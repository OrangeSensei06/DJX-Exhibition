const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict'),fs=require('node:fs');
require('../dist-electron/electron/main.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(label,fn){for(let i=0;i<400;i++){if(await fn())return;await wait(100)}throw Error('Timed out: '+label)}
(async()=>{
 await app.whenReady();await wait(1800);
 const ws=BrowserWindow.getAllWindows(),b=ws.find(w=>w.getTitle().endsWith('Book')),v=ws.find(w=>w.getTitle().endsWith('Vertical'));
 const read=(w,c)=>w.webContents.executeJavaScript(c),state=()=>read(b,'window.exhibition.getSnapshot()'),action=a=>read(b,`window.exhibition.architectureAction('${a}')`);
 fs.mkdirSync('output/architecture-v2',{recursive:true});
 const shot=async n=>fs.writeFileSync(`output/architecture-v2/${n}.png`,(await v.webContents.capturePage()).toPNG());
 const errors=[];v.webContents.on('console-message',e=>{if(/Uncaught|Error loading/.test(e.message))errors.push(e.message)});
 await read(b,'window.exhibition.bookOpen(3)');await wait(400);assert.equal((await state()).architecture.phase,'WAIT');assert.equal(await read(v,'document.querySelectorAll("iframe").length'),0);
 await action('lift');await until('gate arrival',async()=>(await state()).architecture.phase==='idle');await wait(1100);await shot('gate');
 const animation=fs.readFileSync('public/architecture/animation.js','utf8');
 for(const asset of ['arch-v2.png','doors-v2.png','passage-v2.png'])assert.ok(animation.includes(asset));
 assert.ok(await read(v,"!!document.querySelector('iframe').contentWindow.archApi"));
 for(let i=0;i<2;i++){
  await action('open');await action('open');await wait(1000);if(!i)await shot('doors-opening');
  await until('jali inside',async()=>(await state()).architecture.phase==='inside');await wait(1100);if(!i)await shot('jali');
  if(i){await action('next');break}
  await action('return');await wait(180);
  const outgoing=await read(v,"(()=>{const d=document.querySelector('iframe').contentDocument,p=d.querySelector('.body');return {text:p.textContent,opacity:Number(d.defaultView.getComputedStyle(p).opacity)}})()");
  assert.ok(outgoing.text.startsWith('Jali is'));assert.ok(outgoing.opacity<1);
  await until('returned gate',async()=>(await state()).architecture.phase==='idle');await wait(1000);await shot('returned');
 }
 await until('retrieval',async()=>(await state()).handoff.phase==='returning');
 await until('chapter 4 waiting',async()=>{const s=await state();return s.motifs.active&&s.motifs.phase==='WAIT'});
 // The closed gate must also fold out without opening or skipping Chapter 4.
 await read(b,'window.exhibition.bookOpen(3)');await action('lift');await until('gate again',async()=>(await state()).architecture.phase==='idle');await action('next');
 await until('folding',async()=>(await state()).architecture.phase==='folding');await wait(600);await shot('gate-folding');
 await until('chapter 4 again',async()=>{const s=await state();return s.motifs.active&&s.motifs.phase==='WAIT'});
 assert.deepEqual(errors,[]);
 console.log('PASS: V2 artwork, gate arrival, split-door entry, unchanged jali/text, reverse, both fold-outs and Chapter 4 waiting');app.exit(0);
})().catch(e=>{console.error(e);app.exit(1)});
