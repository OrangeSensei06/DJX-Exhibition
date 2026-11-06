// Uses Google's public two-hand test photo, not the user's camera or recordings.
const { app, BrowserWindow } = require('electron');
const { readdirSync, mkdirSync, writeFileSync, statSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');
require('../dist-electron/electron/main.js');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
void (async () => {
  await app.whenReady();
  const deadline = Date.now() + 20000;
  let book;
  while (Date.now() < deadline) {
    book = BrowserWindow.getAllWindows().find((window) => window.getTitle().endsWith('Book'));
    if (book && !book.webContents.isLoading() && await book.webContents.executeJavaScript('!!window.exhibition')) break;
    await wait(100);
  }
  if (!book) throw new Error('No book renderer');
  const workerFile = readdirSync(join(__dirname, '../dist/assets')).find((name) => name.startsWith('vision.worker-'));
  const results = await book.webContents.executeJavaScript(`(async () => {
    const photo = new Image(); photo.src = new URL('./vision/tracking-fixture.jpg', location.href).href;
    await photo.decode();
    const profiles = [{ model:'full', delegate:'CPU' }, { model:'lite', delegate:'CPU' }, { model:'lite', delegate:'GPU' }];
    const summaries = [];
    for (const profile of profiles) {
      const worker = new Worker(new URL('./assets/${workerFile}', location.href), { type:'module' });
      const message = () => new Promise((resolve,reject) => {
        const timer = setTimeout(() => reject(new Error('Tracking benchmark timed out')), 30000);
        worker.onmessage = event => {clearTimeout(timer);event.data.type==='error' ? reject(new Error(event.data.message)) : resolve(event.data);};
        worker.onerror = event => {clearTimeout(timer);reject(new Error(event.message));};
      });
      try {
        const startup = message();
        worker.postMessage({type:'init',delegate:profile.delegate,wasmURL:new URL('./vision/wasm',location.href).href,
          modelURL:new URL('./vision/'+(profile.model==='lite'?'hand_landmarker_lite.task':'hand_landmarker.task'),location.href).href});
        const ready = await startup;
        const samples = [], counts = [];
        for (let i=0;i<16;i++) {
          const bitmap = await createImageBitmap(photo,{resizeWidth:480,resizeHeight:255});
          const next = message();
          worker.postMessage({type:'frame',frame:bitmap,time:performance.now(),capturedAt:Date.now()},[bitmap]);
          const result = await next;
          if (i>=4) {samples.push(result.inferenceMs);counts.push(result.hands);}
        }
        samples.sort((a,b)=>a-b);
        summaries.push({...profile,actualBackend:ready.backend,medianMs:Math.round(samples[Math.floor(samples.length/2)]*10)/10,
          p95Ms:Math.round(samples[Math.floor(samples.length*.95)]*10)/10,hands:Math.max(...counts)});
      } catch(error) { summaries.push({...profile,error:String(error)}); }
      finally {worker.terminate();}
    }
    return summaries;
  })()`);
  for (const result of results) console.log(JSON.stringify(result));
  const cpuLite = results.find((item) => item.model === 'lite' && item.delegate === 'CPU');
  assert.equal(cpuLite.hands, 2, 'Lite must detect both real hands in the public fixture');
  mkdirSync(join(__dirname,'../output'),{recursive:true});
  const report = {fixture:'Google MediaPipe right_hands.jpg (public test image)',
    fullBytes:statSync(join(__dirname,'../public/vision/hand_landmarker.task')).size,
    liteBytes:statSync(join(__dirname,'../public/vision/hand_landmarker_lite.task')).size,results};
  writeFileSync(join(__dirname,'../output/tracking-benchmark.json'),JSON.stringify(report,null,2));
  app.exit(0);
})().catch(error => {console.error(error);app.exit(1);});
