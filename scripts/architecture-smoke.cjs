const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('../dist-electron/electron/main.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(label,fn){for(let i=0;i<300;i++){if(await fn())return;await wait(100)}throw Error('Timed out: '+label)}
(async()=>{
 await app.whenReady();await wait(2000);
 const windows=BrowserWindow.getAllWindows(),book=windows.find(w=>w.getTitle().endsWith('Book')),gallery=windows.find(w=>w.getTitle().endsWith('Vertical'));
 const read=(w,code)=>w.webContents.executeJavaScript(code),action=a=>read(book,`window.exhibition.architectureAction('${a}')`),state=()=>read(book,'window.exhibition.getSnapshot().then(s=>s.architecture)');
 fs.mkdirSync('output/architecture',{recursive:true});
 const shot=async(w,n)=>fs.writeFileSync(`output/architecture/${n}.png`,(await w.webContents.capturePage()).toPNG());
 await action('start');await until('arch arrival',async()=>(await state()).phase==='idle');await wait(1700);
 await shot(book,'book');await shot(gallery,'arch-idle');
 const assets=await read(book,"[...document.querySelectorAll('.architecture-book img')].every(i=>i.complete&&i.naturalWidth>0)");assert.ok(assets,'Figma book assets load');
 const geometry=await read(book,"(()=>{const h=document.querySelector('.architecture-chapter').getBoundingClientRect(),r=document.querySelector('.architecture-scaled').getBoundingClientRect();return r.width<=h.width+1&&r.height<=h.height+1&&Math.abs(r.width/r.height-1.6)<.001})()");assert.ok(geometry,'Book is uniformly fitted inside the display');
 if(process.argv.includes('--layout-only')){console.log('PASS: final book layout, Figma assets and arch arrival');app.exit(0);return}
 for(let cycle=0;cycle<2;cycle++){
  await action('open');await action('open');assert.equal((await state()).phase,'opening');
  try{await until('inside',async()=>(await state()).phase==='inside')}catch(e){console.error('State:',await state());console.error('Frame:',await read(gallery,"(()=>{const f=document.querySelector('iframe');return {body:f.contentDocument.querySelector('.body')?.textContent,api:!!f.contentWindow.archApi,buttons:[...f.contentDocument.querySelectorAll('.btn')].map(n=>n.className)}})()"));throw e}await wait(1500);if(!cycle)await shot(gallery,'jali');
  assert.equal(await read(gallery,'window.exhibition.getSnapshot().then(s=>s.architecture.phase)'),'inside');
  await action('return');await action('return');await wait(180);
  const outgoing=await read(gallery,"(()=>{const d=document.querySelector('iframe').contentDocument,p=d.querySelector('.body');return {text:p.textContent,opacity:Number(d.defaultView.getComputedStyle(p).opacity)}})()");
  assert.ok(outgoing.text.startsWith('Jali is'),'Outgoing text stays intact during fade');assert.ok(outgoing.opacity<1,'Outgoing text fades before replacement');
  await until('returned idle',async()=>(await state()).phase==='idle');await wait(1000);
  assert.ok(await read(gallery,"document.querySelector('iframe').contentDocument.querySelector('.body').textContent.startsWith('Arches existed')"),'Arch copy arrives after return');
 }
 await action('open');await wait(700);await action('reset');await until('reset finishes arrival',async()=>(await state()).phase==='idle');
 await action('exit');assert.equal((await state()).active,false);
 console.log('PASS: Figma book assets, gate arrival, full entry and reverse twice, repeated-input guard, mid-animation reset and exit');app.exit(0);
})().catch(e=>{console.error(e);app.exit(1)});
