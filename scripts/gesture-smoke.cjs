// Replay sensor coordinates through the camera worker's actual pipeline and IPC.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const { GesturePipeline } = require('../dist-electron/src/gesture/gesturePipeline.js');
const pipeline = new GesturePipeline();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const read = (window, code) => window.webContents.executeJavaScript(code);
const state = (window) => read(window, 'window.exhibition.getSnapshot()');
require('../dist-electron/electron/main.js');
async function until(label, check, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await wait(70); }
  throw new Error(`Timed out: ${label}`);
}
const pair = (y1, y2, x1 = 0.35, x2 = 0.65) => [
  { x: x1, y: y1, pinch: 1, id: 'Left' }, { x: x2, y: y2, pinch: 1, id: 'Right' },
];
void (async () => {
  await app.whenReady();
  await until('both renderers', async () => {
    const windows = BrowserWindow.getAllWindows();
    return windows.length === 2 && !windows.some((window) => window.webContents.isLoading())
      && (await Promise.all(windows.map((window) => read(window, '!!window.exhibition && !!document.querySelector(".build-note")')))).every(Boolean);
  });
  const book = BrowserWindow.getAllWindows().find((window) => window.getTitle().endsWith('Book'));
  const gallery = BrowserWindow.getAllWindows().find((window) => window.getTitle().endsWith('Vertical'));
  async function feed(hands) {
    const current = (await state(book)).experience;
    pipeline.setContext({ page: current.page, phase: current.chapter.phase, openedAt: current.chapter.openedAt,
      notBefore: current.chapter.openedAt + 1450 });
    const outcome = pipeline.update(hands, Date.now(), Date.now(), 4 / 3);
    if (outcome.gesture) await read(book, `window.exhibition.navigate(${JSON.stringify(outcome.gesture === 'left' ? 'next' : 'previous')}, "gesture")`);
    if (outcome.action) await read(book, `window.exhibition.chapterAction(${JSON.stringify(outcome.action)}, "gesture")`);
    return outcome;
  }
  await feed([{ x: 0.8, y: 0.5, pinch: 1 }]); await wait(120);
  assert.equal((await feed([{ x: 0.56, y: 0.5, pinch: 1 }])).gesture, 'left');
  await until('book opening', async () => { const s = await state(book); return s.experience.page === 1 && Date.now() >= s.experience.chapter.openedAt + 1450; });
  console.log('PASS: short single-hand sweep opens the actual chapter through gesture IPC');
  await feed(pair(0.6, 0.6)); await wait(150);
  assert.equal((await feed(pair(0.535, 0.54))).action?.type, 'lift');
  await until('up/up lift finishes', async () => (await state(gallery)).experience.chapter.phase === 'presented');
  console.log('PASS: small upward sweeps lift the actual bowl into the gallery');
  await feed(pair(0.5, 0.5, 0.15, 0.85)); await wait(150);
  assert.equal((await feed(pair(0.445, 0.555, 0.15, 0.85))).action?.type, 'explode');
  await until('up/down explosion finishes', async () => (await state(gallery)).experience.chapter.phase === 'exploded');
  console.log('PASS: opposite vertical sweeps reveal layers with negligible change in distance apart');
  await feed(pair(0.5, 0.5)); await wait(150);
  assert.equal((await feed(pair(0.5, 0.5, 0.295, 0.705))).action?.type, 'clear');
  await until('sideways clear finishes', async () => (await state(gallery)).experience.chapter.phase === 'story');
  await until('prepared ingredients page replaces the old story placeholder', () => read(gallery,
    'document.querySelector(".reconstruction-heading h2")?.textContent === "What made this bowl rich" && document.querySelectorAll(".ingredient-note").length === 8 && !document.querySelector(".story-copy-placeholder")'));
  const final = (await state(gallery)).experience;
  assert.equal(final.gestureCount, 4);
  assert.equal(final.lastInput, 'gesture');
  assert.equal(final.chapter.actions, 3);
  console.log('PASS: opposite horizontal sweeps clear layers; all four actions are recorded as gestures');
  console.log('PASS: the prepared ingredients page is the story stage, with eight read-only descriptions');
  assert.ok(await read(book, 'document.querySelector(".build-note").textContent.includes("EASY EXHIBITION")'));
  await until('ending swipe becomes available', () => read(gallery, '!!document.querySelector(".next-chapter-prompt")'));
  await feed([{ x: .8, y: .5, pinch: 1 }]); await wait(150);
  assert.equal((await feed([{ x: .56, y: .5, pinch: 1 }])).gesture, 'left');
  assert.equal((await state(book)).experience.chapter.phase, 'reassembling');
  await until('gesture-driven next page loops to the book', async () => (await state(book)).experience.chapter.phase === 'book');
  assert.equal((await state(book)).experience.page, 1);
  console.log('PASS: ending hand swipe drives the entire return and page-loop sequence');
  console.log('Sensor replay passed. Real camera/body validation remains a separate check.');
  app.exit(0);
})().catch((error) => { console.error(error); app.exit(1); });
