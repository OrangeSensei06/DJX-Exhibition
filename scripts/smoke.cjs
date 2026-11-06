// Native integration check. Uses Chromium's synthetic camera, never the user's webcam.
const { app, BrowserWindow, screen } = require('electron');
const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

app.commandLine.appendSwitch('use-fake-device-for-media-stream');
const errors = [];
const runtimeNotes = [];
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (event) => {
    if (event.message === 'INFO: Created TensorFlow Lite XNNPACK delegate for CPU.') runtimeNotes.push(event.message);
    else if (event.level === 'error') errors.push(event.message);
  });
  contents.on('render-process-gone', (_event, details) => errors.push(`Renderer stopped: ${details.reason}`));
});

async function until(description, read, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let result;
  while (Date.now() < deadline) {
    result = await read();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${description}. Last result: ${JSON.stringify(result)}. Errors: ${errors.join('\n')}`);
}

const read = (window, expression) => window.webContents.executeJavaScript(expression);
const state = (window) => read(window, 'window.exhibition.getSnapshot()');
require('../dist-electron/electron/main.js');

void (async () => {
  await app.whenReady();
  await until('two loaded windows', async () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length !== 2 || windows.some((window) => window.webContents.isLoading())) return false;
    return (await Promise.all(windows.map((window) => read(window, '!!window.exhibition && !!document.querySelector("h1")')))).every(Boolean);
  });
  const windows = BrowserWindow.getAllWindows();
  const book = windows.find((window) => window.getTitle().endsWith('Book'));
  const vertical = windows.find((window) => window.getTitle().endsWith('Vertical'));
  assert.ok(book && vertical);
  await until('both visible connection indicators are current', async () => {
    const labels = await Promise.all([book, vertical].map((window) => read(window, 'document.querySelector(".diagnostic-grid > div:nth-child(2) strong")?.textContent')));
    return labels.every((label) => label === '2 / 2 windows');
  });
  assert.equal((await state(book)).connected.length, 2);
  assert.equal((await state(vertical)).experience.page, 0);
  assert.equal(await read(book, 'typeof window.require'), 'undefined');
  console.log('PASS: two native windows, isolated renderers, shared initial state');

  await read(book, 'window.exhibition.navigate("next", "operator")');
  await until('both pages advance', async () => {
    return (await state(book)).experience.page === 1 && (await state(vertical)).experience.page === 1
      && await read(vertical, 'document.querySelector("h1").textContent.includes("Biryani")');
  });
  assert.equal((await state(book)).experience.gestureCount, 0);
  console.log('PASS: cross-window navigation without falsely counting a gesture');

  vertical.webContents.reload();
  await until('vertical reload restores current page', async () => {
    if (vertical.webContents.isLoading()) return false;
    return read(vertical, '!!window.exhibition && document.querySelector("h1")?.textContent.includes("Biryani")');
  });
  console.log('PASS: reloaded window restores shared state');

  await read(book, 'window.exhibition.navigate("reset", "operator")');
  book.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Right' });
  book.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Right' });
  await until('keyboard navigation', async () => (await state(vertical)).experience.page === 1);
  console.log('PASS: actual keyboard event advances the shared page');

  // Only the smoke renderer substitutes preview landmarks; actual worker gestures stay untouched.
  await read(book, `window.Worker = class extends window.Worker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.type === 'result' && window.__overlayTestHands !== undefined)
          event.data.previewHands = window.__overlayTestHands;
      });
    }
  }; true`);
  await read(book, '[...document.querySelectorAll("button")].find(button => button.textContent === "Enable camera").click()');
  await until('local MediaPipe worker startup', async () => {
    const vision = (await state(book)).vision;
    if (vision.camera === 'error') throw new Error(`Tracking failed: ${vision.message}. Renderer errors: ${errors.join('\n')}`);
    return vision.camera === 'ready' && vision.fps > 0;
  }, 45000);
  assert.equal((await state(book)).vision.hand, 'none');
  assert.equal((await state(book)).experience.gestureCount, 0);
  console.log(`PASS: local model + WASM worker processes synthetic camera frames (${(await state(book)).vision.fps} fps), no false swipe`);

  await read(book, '[...document.querySelectorAll("button")].find(button => button.getAttribute("aria-controls") === "setup-panel").click()');
  await read(book, 'document.querySelector(".camera-preview").scrollIntoView({block:"center"})');
  const overlayPixels = `(() => { const canvas = document.querySelector('.hand-tracking-overlay');
    return canvas && Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).some((value, index) => index % 4 === 3 && value > 0); })()`;
  await read(book, `window.__overlayTestHands = ['Left', 'Right'].map((label, hand) => ({label,
    landmarks: Array.from({length:21}, (_, joint) => ({x:0.25 + hand*0.5 + (joint%4)*0.015, y:0.25 + Math.floor(joint/4)*0.05}))}));`);
  await until('worker landmarks render over the mirrored preview', () => read(book, overlayPixels));
  await read(book, 'window.__overlayTestHands = []');
  await until('overlay clears when no hands are detected', async () => !(await read(book, overlayPixels)));
  console.log('PASS: both hand skeletons render in the camera preview and disappear on tracking loss (synthetic landmarks)');

  const verticalDenied = await read(vertical, 'navigator.mediaDevices.getUserMedia({video: true}).then(stream => {stream.getTracks().forEach(t => t.stop()); return false;}).catch(() => true)');
  assert.equal(verticalDenied, true);
  const audioDenied = await read(book, 'navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {stream.getTracks().forEach(t => t.stop()); return false;}).catch(() => true)');
  assert.equal(audioDenied, true);
  console.log('PASS: gallery camera access and microphone access are denied');

  await read(book, '[...document.querySelectorAll("button")].find(button => button.textContent === "Stop camera").click()');
  await until('camera release', async () => (await state(book)).vision.camera === 'off');
  assert.equal(await read(book, 'document.querySelector("video").srcObject === null'), true);
  assert.equal(await read(book, overlayPixels), false);
  await read(book, '[...document.querySelectorAll("button")].find(button => button.getAttribute("aria-controls") === "setup-panel").click()');
  await read(book, 'window.exhibition.navigate("reset", "operator")');
  await until('reset renders on both screens', async () => await read(book, 'document.querySelector("h1").textContent.includes("Mughal")') && await read(vertical, 'document.querySelector("h1").textContent.includes("Mughal")'));
  console.log('PASS: camera release and reset');

  const output = join(__dirname, '../output');
  mkdirSync(output, { recursive: true });
  for (const [name, window] of [['book', book], ['vertical', vertical]]) {
    await read(window, 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
    const image = await window.webContents.capturePage();
    writeFileSync(join(output, `${name}.png`), image.toPNG());
  }
  const report = { passed: errors.length === 0, physicalDisplays: screen.getAllDisplays().length, errors, runtimeNotes, cameraSource: 'Chromium synthetic camera; real hand recognition not validated' };
  writeFileSync(join(output, 'desktop-check.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (errors.length) throw new Error(`Renderer errors: ${errors.join('\n')}`);
  app.exit(0);
})().catch((error) => { console.error(error); app.exit(1); });
