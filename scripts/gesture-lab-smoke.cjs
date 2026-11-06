// Real Electron renderers and chapter animations, with Chromium's fake camera.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const { gestureContextKey } = require('../dist-electron/shared/gestureRouting.js');
app.commandLine.appendSwitch('use-fake-device-for-media-stream');
const errors=[];
app.on('web-contents-created',(_,c)=>{
  c.on('render-process-gone',(_,d)=>errors.push(d.reason));
  c.on('console-message',e=>{if(e.level==='error'&&!/GL_|WebGL|GPU|TensorFlow|XNNPACK/i.test(e.message))errors.push(e.message)});
});
require('../dist-electron/electron/main.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const read=(w,code)=>w.webContents.executeJavaScript(code);
const snap=w=>read(w,'window.exhibition.getSnapshot()');
async function until(label,fn,timeout=60000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await wait(100)}throw Error(`Timeout: ${label}. ${errors.join('\n')}`)}
async function send(book,name,detail=''){
  const s=await snap(book),key=gestureContextKey(s);
  await read(book,`window.exhibition.recognizeGesture(${JSON.stringify({name,detail})},${JSON.stringify(key)},Date.now())`);
  await wait(330);return snap(book);
}
async function settle(book){await until('page settled',async()=>{const s=await snap(book);return Date.now()>=s.interaction.pageReadyAt&&await read(book,'document.querySelector(".book-display")?.dataset.bookTurning === "false"')})}
async function open(book,n){await read(book,`window.exhibition.bookOpen(${n})`);await settle(book)}
async function blocked(book){const before=await snap(book);await send(book,'swipe-left');await send(book,'swipe-right');const after=await snap(book);assert.equal(after.experience.gestureCount,before.experience.gestureCount);assert.equal(after.handoff.chapter,before.handoff.chapter)}
void(async()=>{
  await app.whenReady();
  await until('renderers',async()=>BrowserWindow.getAllWindows().length===2&&(await Promise.all(BrowserWindow.getAllWindows().map(w=>read(w,'!!window.exhibition && !!document.querySelector(".book-display,.vertical-display")')))).every(Boolean));
  const book=BrowserWindow.getAllWindows().find(w=>w.getTitle().endsWith('Book'));
  const gallery=BrowserWindow.getAllWindows().find(w=>w.getTitle().endsWith('Vertical'));
  await read(book,`[...document.querySelectorAll('button')].find(b=>b.textContent==='Enable camera').click()`);
  await until('new full-model camera ready',async()=>{const s=await snap(book);if(s.vision.camera==='error')throw Error(s.vision.message);return s.vision.camera==='ready'&&s.vision.model==='full'&&s.vision.fps>0});
  const camera=(await snap(book)).vision;console.log(`PASS full Gesture Lab model/WASM and fake camera: ${camera.backend}, ${camera.fps} fps`);
  await read(book,`[...document.querySelectorAll('button')].find(b=>b.textContent==='Stop camera').click()`);
  await until('camera stopped',async()=>(await snap(book)).vision.camera==='off');
  // Model startup can be stopped by switching the selected camera in Setup.
  await read(book,`[...document.querySelectorAll('button')].find(b=>b.textContent==='Enable camera').click(); const select=document.querySelector('.camera-preview').parentElement.querySelector('select'); select.dispatchEvent(new Event('change',{bubbles:true}));`);
  await wait(2500);assert.equal((await snap(book)).vision.camera,'off');
  console.log('PASS camera stop and cancelled startup stay off');
  for(let n=1;n<=5;n++){
    await open(book,n);const before=await snap(book);
    await read(book,`window.exhibition.reportHands({capturedAt:Date.now(),hands:[{id:'old',x:.5,y:.8,pinching:false}]})`);await wait(50);
    await read(book,`window.exhibition.reportHands({capturedAt:Date.now(),hands:[{id:'old',x:.5,y:.3,pinching:false}]})`);await wait(50);
    assert.equal((await snap(book)).handoff.phase,'idle');
    const next=await send(book,'swipe-left');assert.equal(next.welcome,n===5);
    if(n<5)assert.equal(next.handoff.phase,'idle');
    assert.ok(next.experience.gestureCount>before.experience.gestureCount);
    await settle(book);
    if(n<5){await send(book,'swipe-right');await settle(book);assert.equal((await snap(book)).welcome,false)}
  }
  console.log('PASS all five chapters browse both ways before lift; old cursor-based lift removed');
  await open(book,1);await send(book,'swipe-up');await blocked(book);
  await until('biryani IDLE',async()=>(await snap(book)).biryaniVideo.phase==='IDLE');
  await blocked(book);await send(book,'vertical-opposite');
  await until('biryani STACKED',async()=>(await snap(book)).biryaniVideo.phase==='STACKED');
  await blocked(book);await send(book,'hands-apart');
  await until('biryani LIST',async()=>(await snap(book)).biryaniVideo.phase==='LIST');
  await send(book,'swipe-right');assert.equal((await snap(book)).biryaniVideo.phase,'RETURN');
  await until('reverse biryani to cover',async()=>(await snap(book)).welcome===true);await settle(book);
  console.log('PASS biryani vertical explosion, horizontal separation, and right-swipe reversal to cover');
  await open(book,2);await send(book,'swipe-up');
  await until('dress reveal',async()=>{const s=await snap(book);return s.handoff.phase==='away'&&Date.now()-s.fashion.startedAt>=4700});
  await blocked(book);await send(book,'snap');assert.equal((await snap(book)).fashion.look,'white');
  await wait(1000);await send(book,'swipe-right');
  assert.ok((await snap(book)).fashion.exitingAt);
  await until('dress reversal to chapter 1',async()=>{const s=await snap(book);return s.fashion.nextChapter&&!s.fashion.startedAt&&s.handoff.phase==='idle'});await settle(book);
  console.log('PASS snap changes dresses; right swipe reverses before returning to previous spread');
  await open(book,3);await send(book,'swipe-up');
  await until('gate idle',async()=>(await snap(book)).architecture.phase==='idle');await blocked(book);
  await send(book,'push');await until('inside door',async()=>(await snap(book)).architecture.phase==='inside');await blocked(book);
  await send(book,'push');await until('returned to gate',async()=>{const s=await snap(book);return s.architecture.phase==='idle'&&s.interaction.completed});
  await send(book,'swipe-left');await until('gate reversed to motifs',async()=>(await snap(book)).motifs.active);await settle(book);
  console.log('PASS push enters and returns; pages unlock only after the doorway round trip');
  await send(book,'swipe-up');await until('scroll ready',async()=>(await snap(book)).motifs.phase==='SCROLL_READY');await blocked(book);
  await send(book,'vertical-opposite');await until('scroll content',async()=>['CONTENT_VISIBLE','BLOOM_OPTIONAL'].includes((await snap(book)).motifs.phase));
  await send(book,'swipe-left');await until('scroll reversed to jewels',async()=>(await snap(book)).jewels.active);await settle(book);
  console.log('PASS opposite vertical opens the scroll; exit waits for revealed content');
  await send(book,'swipe-up');await until('jewels ready',async()=>(await snap(book)).jewels.phase==='READY');await blocked(book);
  const before=(await snap(book)).jewels.commandId;await send(book,'finger-right','sweep 0.12 m');assert.equal((await snap(book)).jewels.commandId,before);
  await send(book,'finger-left','swirl counter-clockwise');await until('left rotation finished',async()=>(await snap(book)).jewels.phase==='READY');
  await send(book,'finger-right','swirl clockwise');await until('right rotation finished',async()=>(await snap(book)).jewels.phase==='READY');
  await send(book,'swipe-left');await until('jewels reversed to cover',async()=>(await snap(book)).welcome===true);
  console.log('PASS jewellery accepts both swirls, ignores finger sweeps, and reverses to the cover');
  assert.deepEqual(errors,[]);console.log('PASS no renderer errors; native gesture integration complete');app.exit(0);
})().catch(e=>{console.error(e);app.exit(1)});
