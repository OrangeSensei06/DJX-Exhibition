const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict'),fs=require('node:fs');
require('../dist-electron/electron/main.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(label,fn){for(let i=0;i<150;i++){if(await fn())return;await wait(100)}throw Error('Timed out: '+label)}
(async()=>{
 await app.whenReady();await wait(2000);
 const book=BrowserWindow.getAllWindows().find(w=>w.getTitle().endsWith('Book'));
 const read=c=>book.webContents.executeJavaScript(c),open=n=>read(`window.exhibition.bookOpen(${n})`);
 fs.mkdirSync('output/book',{recursive:true});
 const shot=async n=>fs.writeFileSync(`output/book/${n}.png`,(await book.webContents.capturePage()).toPNG());
 const settled=n=>until('spread '+n,async()=>await read(`document.querySelector('[data-book-chapter]')?.dataset.bookChapter==='${n}'&&document.querySelector('[data-book-turning]')?.dataset.bookTurning==='false'`));
 for(let n=1;n<=5;n++){
  await open(n);await settled(n);await wait(300);await shot('chapter-'+n);
  const images=await read(`Array.from(document.querySelectorAll('.bound-half img')).filter(i=>!i.closest('[data-name="Spine"]')).map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}))`);
  assert(images.every(i=>i.ok&&i.width>0&&i.height>0),JSON.stringify(images.filter(i=>!i.ok||!i.width||!i.height)));
  const moved=await read(`(()=>{const node=document.querySelector('.bound-right [data-book-layer]'),root=node.closest('.spread-art'),key='--layer-'+node.dataset.bookLayer.replace(':','-')+'-x';const before=node.getBoundingClientRect().x,scale=document.querySelector('.bound-right').getBoundingClientRect().width/960;root.style.setProperty(key,'40px');const delta=node.getBoundingClientRect().x-before;root.style.removeProperty(key);return {delta,expected:40*scale}})()`);
  assert(Math.abs(moved.delta-moved.expected)<1,'Right-page layer moves using native pixel offsets');
 }
 await open(4);await wait(650);await shot('reverse-turn');await settled(4);
 await open(5);await wait(650);await shot('forward-turn');await settled(5);
 await open(2);await wait(200);await open(3);await wait(100);await open(1);await settled(1);
 assert.equal(await read(`document.querySelectorAll('.turning-leaf').length`),0);
 await read("window.exhibition.navigate('next','operator')");await settled(2);
 await read("window.exhibition.navigate('next','operator')");await settled(3);
 await read("window.exhibition.navigate('previous','operator')");await settled(2);
 console.log('PASS: five spreads, local image geometry, forward/reverse turns, rapid changes and synchronized next/previous chapter navigation');app.exit(0);
})().catch(e=>{console.error(e);app.exit(1)});
