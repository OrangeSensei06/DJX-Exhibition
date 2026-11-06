const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const errors = [];
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (event) => { if (event.level === 'error') errors.push(event.message); });
  contents.on('render-process-gone', (_event, details) => errors.push(`Renderer stopped: ${details.reason}`));
});
require('../dist-electron/electron/main.js');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const read = (window, expression) => window.webContents.executeJavaScript(expression);
const state = (window) => read(window, 'window.exhibition.getSnapshot()');
async function until(label, inspect, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await inspect()) return;
    await wait(80);
  }
  throw new Error(`Timed out: ${label}. Renderer errors: ${errors.join('\n')}`);
}
const output = join(__dirname, '../output/chapter-one');
async function capture(window, name) {
  await read(window, 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
  writeFileSync(join(output, name + '.png'), (await window.webContents.capturePage()).toPNG());
}

void (async () => {
  await app.whenReady();
  mkdirSync(output, { recursive: true });
  await until('two fully mounted chapter scenes', async () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length !== 2 || windows.some((window) => window.webContents.isLoading())) return false;
    const ready = await Promise.all(windows.map((window) => read(window, '!!window.exhibition && document.querySelector("[data-model-status]")?.dataset.modelStatus === "ready"')));
    return ready.every(Boolean);
  });
  const book = BrowserWindow.getAllWindows().find((window) => window.getTitle().endsWith('Book'));
  const gallery = BrowserWindow.getAllWindows().find((window) => window.getTitle().endsWith('Vertical'));
  await until('real canvas measurements reach both renderers', async () => {
    const snapshot = await state(book);
    return snapshot.connected.length === 2 && snapshot.surfaces.book.width > 100 && snapshot.surfaces.vertical.width > 100;
  });
  await read(book, 'window.exhibition.navigate("next", "operator")');
  await until('folded right page is present', () => read(book, '!!document.querySelector(".page-turn")'));
  await wait(500);
  await capture(book, '01-page-fold');
  await until('page settles', () => read(book, '!document.querySelector(".page-turn")'));
  await capture(book, '02-open-book');
  await capture(gallery, '03-gallery-invitation');
  console.log('PASS: supplied GLB loads in both windows, animated right page opens onto the book spread');

  const before = (await state(book)).experience.chapter.position;
  const point = await read(book, '(() => {const r=document.querySelector(".biryani-touch-zone").getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()');
  book.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, x: point.x, y: point.y });
  book.webContents.sendInputEvent({ type: 'mouseMove', x: point.x + 30, y: point.y - 20, movementX: 30, movementY: -20 });
  book.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: point.x + 30, y: point.y - 20 });
  await until('drag updates the shared bowl position', async () => (await state(book)).experience.chapter.position.x > before.x);
  console.log('PASS: pointer dragging moves the actual shared bowl position');

  await read(book, 'window.exhibition.chapterAction({type:"lift"}, "operator")');
  await until('both windows enter the same handoff', async () => (await state(book)).experience.chapter.phase === 'transferring' && (await state(gallery)).experience.chapter.phase === 'transferring');
  await wait(1000);
  await capture(book, '04-transfer-book');
  await capture(gallery, '05-transfer-gallery');
  await until('bowl arrives in the gallery', async () => (await state(gallery)).experience.chapter.phase === 'presented');
  await capture(gallery, '06-arrived');
  await read(book, 'window.exhibition.chapterAction({type:"clear"}, "operator")');
  assert.equal((await state(book)).experience.chapter.phase, 'presented');
  console.log('PASS: synchronized handoff completes, out-of-order clearing is rejected');

  gallery.webContents.reload();
  await until('gallery reload resumes the existing chapter', async () => {
    if (gallery.webContents.isLoading()) return false;
    return read(gallery, '!!window.exhibition && document.querySelector(".chapter-one")?.dataset.phase === "presented" && document.querySelector("[data-model-status]")?.dataset.modelStatus === "ready"');
  });
  console.log('PASS: gallery reload restores the object and current interaction stage');

  await read(book, 'window.exhibition.chapterAction({type:"explode"}, "operator")');
  await until('ingredient explosion settles', async () => (await state(gallery)).experience.chapter.phase === 'exploded');
  await until('actual ingredient transforms are separated', async () => read(gallery, '(() => { const raw=document.querySelector("[data-layer-offsets]")?.dataset.layerOffsets; if(!raw)return false;const p=JSON.parse(raw);return p.spices.y>3.8 && p.rice.y>0.85 && p.bowl.y===0;})()'));
  await capture(gallery, '07-exploded-layers');
  const tierBounds = await read(gallery, 'JSON.parse(document.querySelector("[data-layer-bounds]").dataset.layerBounds)');
  for (let index = 1; index < tierBounds.length; index++) {
    assert.ok(tierBounds[index].bottom > tierBounds[index - 1].top, `${tierBounds[index].name} overlaps the tier below it`);
  }
  console.log('PASS: seven model groups separate into screen-facing tiers with measured gaps; bowl stays intact');

  await read(book, 'window.exhibition.chapterAction({type:"clear"}, "operator")');
  await until('story stage', async () => (await state(gallery)).experience.chapter.phase === 'story');
  await until('ingredient models settle beside their descriptions', async () => read(gallery, '(() => {const raw=document.querySelector("[data-reconstruction]")?.dataset.reconstruction;if(!raw)return false;return JSON.parse(raw).length===8 && document.querySelectorAll(".ingredient-note").length===8;})()'));
  await wait(1500);
  await capture(gallery, '08-story-bowl');
  assert.equal(await read(gallery, 'document.querySelector(".reconstruction-heading h2").textContent'), 'What made this bowl rich');
  const alternating = await read(gallery, '[...document.querySelectorAll(".ingredient-note")].map(row=>row.classList.contains("note-right"))');
  assert.deepEqual(alternating, [false, true, false, true, false, true, false, true]);
  await until('top swipe prompt follows the complete ingredient reveal', () => read(gallery, '!!document.querySelector(".next-chapter-prompt")'));
  assert.equal(await read(gallery, 'document.querySelectorAll(".ingredient-pickup, .rebuild-drop-zone").length'), 0);
  console.log('PASS: ingredient display is read-only and shows the top page-swipe prompt');
  await capture(gallery, '09-swipe-prompt');
  await read(book, 'window.exhibition.navigate("next", "gesture")');
  assert.equal((await state(book)).experience.chapter.phase, 'reassembling');
  const placements = (await state(book)).experience.chapter.reconstruction.placements;
  assert.equal(new Set(Object.values(placements).map(p => p.at)).size, 1);
  await wait(700);
  await capture(gallery, '10-ingredients-falling');
  await read(book, 'window.exhibition.navigate("next", "operator")');
  await until('assembled bowl begins its return to the book', async () => (await state(gallery)).experience.chapter.phase === 'returning');
  await capture(gallery, '11-reconstructed-return');
  await wait(1200);
  await capture(book, '12-return-book');
  await capture(gallery, '13-return-gallery');
  await until('page turns only after the return finishes', async () => (await state(book)).experience.chapter.phase === 'paging');
  await until('book renders the next leaf', () => read(book, '!!document.querySelector(".page-turn")'));
  await capture(book, '14-next-page');
  await until('chapter one loops back with a fresh bowl', async () => (await state(book)).experience.chapter.phase === 'book');
  await until('page animation has finished', () => read(book, '!document.querySelector(".page-turn")'));
  const repeated = (await state(book)).experience;
  assert.equal(repeated.page, 1);
  assert.deepEqual(repeated.chapter.position, { x: .75, y: .56 });
  assert.equal(repeated.chapter.reconstruction.collected.length, 0);
  await capture(book, '15-looped-chapter');
  await read(book, 'window.exhibition.chapterAction({type:"lift"}, "operator")');
  assert.equal((await state(book)).experience.chapter.phase, 'transferring');
  console.log('PASS: one swipe gathers all ingredients together, returns the bowl, turns the leaf and loops to a playable chapter one');

  await read(book, 'window.exhibition.navigate("reset", "operator")');
  assert.equal((await state(gallery)).experience.page, 0);
  assert.equal((await state(gallery)).experience.chapter.actions, 0);
  assert.equal((await state(gallery)).experience.gestureCount, 0);
  assert.deepEqual(errors, []);
  writeFileSync(join(output, 'check.json'), JSON.stringify({ passed: true, errors, input: 'Native pointer + operator commands; hand-motion thresholds covered by synthetic tests, real hands not validated' }, null, 2));
  console.log('PASS: reset clears chapter progress without counting operator actions as camera gestures');
  app.exit(0);
})().catch((error) => { console.error(error); app.exit(1); });
