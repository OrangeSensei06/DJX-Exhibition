"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const experience_1 = require("../shared/experience");
const inactivity_1 = require("../shared/inactivity");
const gestureRouting_1 = require("../shared/gestureRouting");
const protocol_1 = require("../shared/protocol");
const chapter_1 = require("../shared/chapter");
const projectRoot = (0, node_path_1.resolve)(__dirname, '../..');
const runtimeRoot = (0, node_path_1.join)(projectRoot, '.runtime', ...(process.argv.includes('--smoke-test') ? ['smoke'] : []));
(0, node_fs_1.mkdirSync)(runtimeRoot, { recursive: true });
electron_1.app.setPath('userData', runtimeRoot);
electron_1.app.setPath('sessionData', (0, node_path_1.join)(runtimeRoot, 'session'));
electron_1.app.setName('Mughal Times');
electron_1.protocol.registerSchemesAsPrivileged([{
        scheme: 'mughal',
        privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
    }]);
const windows = new Map();
let architecture = { active: false, phase: 'load', generation: 0, command: null, commandId: 0 };
let auto = { active: false, runId: 0, stage: 'Ready' };
let handoff = { chapter: 2, phase: 'idle', startedAt: 0 };
let jewels = { active: false, phase: 'WAIT', generation: 0, command: null, commandId: 0 };
let motifs = { active: false, phase: 'WAIT', blooms: 0, generation: 0, command: null, commandId: 0 };
const readyRoles = new Set();
let experience = { ...protocol_1.initialExperience };
let vision = { ...protocol_1.initialVision };
const surfaces = { ...protocol_1.initialSurfaces };
let sequence = 0;
let welcome = true;
const inactivity = new inactivity_1.InactivityTimer(Date.now());
let interaction = { completed: false, pageReadyAt: 0 };
let pendingPage = null;
let biryaniVideo = { phase: 'book', startedAt: 0, reverseFrom: 7.5 };
let fashion = { startedAt: 0, look: 'red', switchedAt: 0, exitingAt: 0, nextChapter: true };
let chapterTimer;
let assignments;
const devURL = process.env.VITE_DEV_SERVER_URL;
const isRole = (value) => value === 'book' || value === 'vertical';
function senderRole(contents) {
    for (const [role, window] of windows)
        if (window.webContents.id === contents.id)
            return role;
}
function snapshot() {
    return {
        sequence, welcome, interaction, fashion, biryaniVideo, architecture, motifs, jewels, handoff, auto,
        surfaces,
        experience,
        vision,
        displays: electron_1.screen.getAllDisplays().map((display, index) => ({
            id: display.id,
            label: display.label || `Display ${index + 1}`,
            width: display.size.width,
            height: display.size.height,
        })),
        assignments,
        connected: [...windows.entries()].filter(([role, window]) => readyRoles.has(role) && !window.isDestroyed()).map(([role]) => role),
        fullscreen: {
            book: windows.get('book')?.isFullScreen() ?? false,
            vertical: windows.get('vertical')?.isFullScreen() ?? false,
        },
    };
}
function broadcast() {
    sequence++;
    const state = snapshot();
    for (const [role, window] of windows) {
        if (readyRoles.has(role) && !window.isDestroyed())
            window.webContents.send('exhibition:state', state);
    }
}
function forwardHands(frame) {
    const gallery = windows.get('vertical');
    if (gallery && !gallery.isDestroyed() && readyRoles.has('vertical'))
        gallery.webContents.send('exhibition:hand-frame', frame);
}
function scheduleChapter() {
    clearTimeout(chapterTimer);
    if (experience.page !== 1)
        return;
    const deadline = (0, chapter_1.chapterDeadline)(experience.chapter);
    if (deadline === null)
        return;
    chapterTimer = setTimeout(() => {
        experience = { ...experience, chapter: (0, chapter_1.settleChapter)(experience.chapter, Date.now()) };
        broadcast();
        scheduleChapter();
    }, Math.max(1, deadline - Date.now()));
}
function chooseDisplays() {
    const displays = electron_1.screen.getAllDisplays();
    const external = displays.filter((display) => display.id !== electron_1.screen.getPrimaryDisplay().id);
    const defaults = {
        book: external.length >= 2 ? external[0].id : electron_1.screen.getPrimaryDisplay().id,
        vertical: external.length >= 2 ? external[1].id : external[0]?.id ?? electron_1.screen.getPrimaryDisplay().id,
    };
    try {
        const saved = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(runtimeRoot, 'displays.json'), 'utf8'));
        for (const role of ['book', 'vertical']) {
            if (displays.some((display) => display.id === saved[role]))
                defaults[role] = saved[role];
        }
    }
    catch { /* First launch uses the available displays. */ }
    assignments = defaults;
}
function placeWindows() {
    const displays = electron_1.screen.getAllDisplays();
    for (const role of ['book', 'vertical']) {
        if (!displays.some((display) => display.id === assignments[role]))
            assignments[role] = electron_1.screen.getPrimaryDisplay().id;
    }
    for (const role of ['book', 'vertical']) {
        const window = windows.get(role);
        if (!window || window.isDestroyed())
            continue;
        const display = displays.find((item) => item.id === assignments[role]) ?? electron_1.screen.getPrimaryDisplay();
        assignments[role] = display.id;
        const area = display.workArea;
        const sharedDisplay = assignments.book === assignments.vertical;
        const split = Math.round(area.width * 0.62);
        const bounds = sharedDisplay
            ? { x: area.x + (role === 'vertical' ? split : 0), y: area.y, width: role === 'book' ? split : area.width - split, height: area.height }
            : { ...area };
        const fullscreen = window.isFullScreen();
        if (fullscreen)
            window.setFullScreen(false);
        window.setBounds(bounds);
        if (role === 'vertical' || fullscreen && !sharedDisplay)
            window.setFullScreen(true);
    }
}
function createWindow(role) {
    const window = new electron_1.BrowserWindow({
        title: `Mughal Times — ${role === 'book' ? 'Book' : 'Vertical'}`,
        width: role === 'book' ? 1120 : 600,
        height: 900,
        minWidth: role === 'book' ? 500 : 320,
        minHeight: 520,
        show: false,
        frame: role !== 'vertical',
        fullscreen: role === 'vertical',
        backgroundColor: role === 'book' ? '#f7f7f4' : '#171817',
        autoHideMenuBar: true,
        webPreferences: {
            preload: (0, node_path_1.join)(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            backgroundThrottling: false,
        },
    });
    windows.set(role, window);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.on('page-title-updated', (event) => event.preventDefault());
    window.once('ready-to-show', () => { if (role === 'vertical')
        window.setFullScreen(true); window.show(); });
    window.webContents.on('did-finish-load', broadcast);
    window.webContents.on('did-start-navigation', (details) => {
        // An embedded chapter loading must not disconnect the parent renderer's IPC.
        if (!details.isMainFrame || details.isSameDocument)
            return;
        readyRoles.delete(role);
        if (role === 'book') {
            forwardHands({ capturedAt: Date.now(), hands: [] });
            vision = { ...protocol_1.initialVision };
            experience = { ...experience, chapter: (0, chapter_1.reduceChapter)(experience.chapter, { type: 'cancelGrab' }, Date.now()) };
        }
        broadcast();
    });
    window.webContents.on('render-process-gone', () => {
        if (role === 'book')
            forwardHands({ capturedAt: Date.now(), hands: [] });
        readyRoles.delete(role);
        if (role === 'book')
            experience = { ...experience, chapter: (0, chapter_1.reduceChapter)(experience.chapter, { type: 'cancelGrab' }, Date.now()) };
        if (role === 'book')
            vision = { camera: 'error', hand: 'none', fps: 0, message: 'Book window stopped. Reload it to reconnect the camera.' };
        broadcast();
    });
    window.on('enter-full-screen', broadcast);
    window.on('leave-full-screen', broadcast);
    window.on('closed', () => {
        if (role === 'book')
            forwardHands({ capturedAt: Date.now(), hands: [] });
        readyRoles.delete(role);
        windows.delete(role);
        if (role === 'book') {
            vision = { ...protocol_1.initialVision };
            experience = { ...experience, chapter: (0, chapter_1.reduceChapter)(experience.chapter, { type: 'cancelGrab' }, Date.now()) };
        }
        broadcast();
    });
    if (devURL)
        void window.loadURL(`${devURL}/?view=${role}`);
    else
        void window.loadURL(`mughal://exhibition/index.html?view=${role}`);
}
if (!electron_1.app.requestSingleInstanceLock())
    electron_1.app.quit();
else {
    electron_1.app.on('second-instance', () => windows.get('book')?.focus());
    void electron_1.app.whenReady().then(() => {
        electron_1.Menu.setApplicationMenu(null);
        const distRoot = (0, node_path_1.join)(projectRoot, 'dist');
        electron_1.protocol.handle('mughal', (request) => {
            const url = new URL(request.url);
            if (url.hostname !== 'exhibition')
                return new Response('Not found', { status: 404 });
            const file = (0, node_path_1.resolve)(distRoot, `.${decodeURIComponent(url.pathname)}`);
            if (!file.startsWith(distRoot + node_path_1.sep))
                return new Response('Forbidden', { status: 403 });
            // Media seeking requires real byte-range responses on the custom scheme.
            if (file.endsWith('.mp4')) {
                const bytes = (0, node_fs_1.readFileSync)(file), range = request.headers.get('range');
                const match = range?.match(/^bytes=(\d+)-(\d*)$/);
                if (match) {
                    const start = Number(match[1]), end = Math.min(bytes.length - 1, match[2] ? Number(match[2]) : bytes.length - 1);
                    if (start > end || start >= bytes.length)
                        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } });
                    return new Response(bytes.subarray(start, end + 1), { status: 206, headers: { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': String(end - start + 1) } });
                }
                return new Response(bytes, { headers: { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': String(bytes.length) } });
            }
            return electron_1.net.fetch((0, node_url_1.pathToFileURL)(file).toString());
        });
        electron_1.session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
            const mediaTypes = 'mediaTypes' in details ? details.mediaTypes ?? [] : [];
            callback(senderRole(contents) === 'book' && permission === 'media' && mediaTypes.length > 0 && mediaTypes.every((type) => type === 'video'));
        });
        electron_1.session.defaultSession.setPermissionCheckHandler((contents, permission, _origin, details) => {
            return !!contents && senderRole(contents) === 'book' && permission === 'media' && details.mediaType === 'video';
        });
        electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            const script = devURL ? "'self' 'unsafe-inline' 'wasm-unsafe-eval'" : "'self' 'wasm-unsafe-eval'";
            callback({ responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [`default-src 'self'; script-src ${script}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self' blob: ${devURL ? 'ws://127.0.0.1:5173' : ''}; object-src 'none'; base-uri 'self'`],
                } });
        });
        electron_1.ipcMain.handle('exhibition:snapshot', (event) => {
            const role = senderRole(event.sender);
            if (!role)
                throw new Error('Unknown window');
            if (!readyRoles.has(role)) {
                readyRoles.add(role);
                broadcast();
            }
            return snapshot();
        });
        const inputHandlers = new Map();
        const registerInput = (channel, handler) => { inputHandlers.set(channel, handler); electron_1.ipcMain.handle(channel, handler); };
        registerInput('exhibition:biryani-video', (event, action, time, phase) => {
            const role = senderRole(event.sender);
            if (!role)
                return;
            if (action === 'reset') {
                welcome = false;
                cancelHandoff();
                jewels = { ...jewels, active: false };
                motifs = { ...motifs, active: false };
                architecture = { ...architecture, active: false };
                fashion = { ...fashion, nextChapter: true };
                biryaniVideo = { phase: 'book', startedAt: Date.now(), reverseFrom: 0, generation: (biryaniVideo.generation ?? 0) + 1, command: null };
            }
            else if (!fashion.nextChapter || architecture.active || motifs.active || jewels.active)
                return;
            else if (action === 'lift' && biryaniVideo.phase === 'book') {
                liftWaitingChapter();
                return;
            }
            else if (action === 'separate' && biryaniVideo.phase === 'IDLE')
                biryaniVideo = { ...biryaniVideo, phase: 'EXPLODING', command: 'explode', commandId: (biryaniVideo.commandId ?? 0) + 1 };
            else if (action === 'list' && biryaniVideo.phase === 'STACKED')
                biryaniVideo = { ...biryaniVideo, phase: 'SWEEP', command: 'list', commandId: (biryaniVideo.commandId ?? 0) + 1 };
            else if (action === 'next' && biryaniVideo.phase === 'LIST')
                biryaniVideo = { ...biryaniVideo, phase: 'RETURN', command: 'next', commandId: (biryaniVideo.commandId ?? 0) + 1 };
            else if (action === 'status' && role === 'vertical' && typeof phase === 'string' && ['ENTER', 'IDLE', 'EXPLODING', 'STACKED', 'SWEEP', 'LIST', 'RETURN', 'DONE', 'ERROR'].includes(phase)) {
                biryaniVideo = { ...biryaniVideo, phase: phase, command: null };
                if (phase === 'DONE')
                    returnBookObject(1, () => finishInteraction(1));
            }
            else
                return;
            broadcast();
        });
        let fashionExitTimer;
        let handoffTimer;
        const currentChapter = () => jewels.active ? 5 : motifs.active ? 4 : architecture.active ? 3 : fashion.nextChapter ? 1 : 2;
        function cancelHandoff() { clearTimeout(handoffTimer); pendingPage = null; interaction = { completed: false, pageReadyAt: Date.now() + 1450 }; handoff = { chapter: currentChapter(), phase: 'idle', startedAt: Date.now() }; }
        function finishInteraction(chapter) {
            const destination = pendingPage ?? (chapter === 5 ? 0 : chapter + 1);
            pendingPage = null;
            openBookChapter(destination || 1);
            if (!destination)
                welcome = true;
        }
        function returnBookObject(chapter, done) {
            if (handoff.phase === 'returning')
                return;
            if (handoff.chapter !== chapter || handoff.phase !== 'away') {
                done();
                return;
            }
            handoff = { chapter, phase: 'returning', startedAt: Date.now() };
            broadcast();
            handoffTimer = setTimeout(() => { handoff = { chapter, phase: 'idle', startedAt: Date.now() }; done(); broadcast(); }, chapter === 4 ? 3200 : 1450);
        }
        function liftWaitingChapter() {
            if (welcome)
                return;
            const chapter = currentChapter();
            const waiting = chapter === 1 ? biryaniVideo.phase === 'book' : chapter === 2 ? !fashion.startedAt : chapter === 3 ? architecture.phase === 'WAIT' : chapter === 4 ? motifs.phase === 'WAIT' : jewels.phase === 'WAIT';
            if (!waiting || handoff.phase === 'lifting' || handoff.phase === 'returning')
                return;
            handoff = { chapter, phase: 'lifting', startedAt: Date.now() };
            broadcast();
            handoffTimer = setTimeout(() => { handoff = { chapter, phase: 'away', startedAt: Date.now() }; startGalleryStep(); }, chapter === 4 ? 2800 : chapter === 1 ? 850 : 1450);
        }
        function openBookChapter(chapter) {
            if (welcome)
                inactivity.touch(Date.now());
            welcome = false;
            clearTimeout(fashionExitTimer);
            cancelHandoff();
            architecture = { ...architecture, active: chapter === 3, phase: 'WAIT', generation: architecture.generation + 1, command: null };
            motifs = { ...motifs, active: chapter === 4, phase: 'WAIT', blooms: 0, generation: motifs.generation + 1, command: null };
            jewels = { ...jewels, active: chapter === 5, phase: 'WAIT', generation: jewels.generation + 1, command: null };
            fashion = { startedAt: 0, look: 'red', switchedAt: 0, exitingAt: 0, nextChapter: chapter !== 2 };
            biryaniVideo = { phase: 'book', startedAt: Date.now(), reverseFrom: 7.5 };
        }
        const inactivityCheck = setInterval(() => {
            if (welcome || !inactivity.expired(Date.now()))
                return;
            auto = { active: false, runId: auto.runId + 1, stage: 'Reset after one minute without a hand' };
            clearTimeout(chapterTimer);
            experience = { ...protocol_1.initialExperience, chapter: (0, chapter_1.freshChapter)(Date.now()) };
            openBookChapter(1);
            welcome = true;
            broadcast();
        }, 500);
        electron_1.app.once('before-quit', () => clearInterval(inactivityCheck));
        electron_1.ipcMain.handle('exhibition:auto', (event, action, stage) => {
            const role = senderRole(event.sender);
            if (!role)
                return;
            if (action === 'start') {
                auto = { active: true, runId: auto.runId + 1, stage: 'Chapter 1 · opening the book' };
                openBookChapter(1);
            }
            else if (action === 'stop')
                auto = { active: false, runId: auto.runId + 1, stage: 'Stopped' };
            else if (action === 'finish' && role === 'book' && auto.active)
                auto = { ...auto, active: false, stage: typeof stage === 'string' ? stage.slice(0, 180) : 'Complete' };
            else if (action === 'stage' && role === 'book' && auto.active && typeof stage === 'string')
                auto = { ...auto, stage: stage.slice(0, 180) };
            else
                return;
            broadcast();
        });
        function startGalleryStep() {
            if (architecture.active && architecture.phase === 'WAIT')
                architecture = { ...architecture, phase: 'load' };
            else if (motifs.active && motifs.phase === 'WAIT')
                motifs = { ...motifs, phase: 'load' };
            else if (jewels.active && jewels.phase === 'WAIT')
                jewels = { ...jewels, phase: 'LOAD' };
            else if (!architecture.active && !motifs.active && !jewels.active && fashion.nextChapter && biryaniVideo.phase === 'book')
                biryaniVideo = { ...biryaniVideo, phase: 'arrival', generation: (biryaniVideo.generation ?? 0) + 1 };
            else if (!architecture.active && !motifs.active && !jewels.active && !fashion.nextChapter && !fashion.startedAt)
                fashion = { ...fashion, startedAt: Date.now() };
            broadcast();
        }
        electron_1.ipcMain.handle('exhibition:book-open', (event, chapter) => {
            if (!senderRole(event.sender) || typeof chapter !== 'number' || !Number.isInteger(chapter) || chapter < 1 || chapter > 5)
                return;
            if (handoff.phase !== 'idle')
                return;
            openBookChapter(chapter);
            broadcast();
        });
        registerInput('exhibition:jewels', (event, action, phase) => {
            const role = senderRole(event.sender);
            if (!role)
                return;
            if (action === 'start' || action === 'reset') {
                welcome = false;
                cancelHandoff();
                clearTimeout(fashionExitTimer);
                architecture = { ...architecture, active: false };
                motifs = { ...motifs, active: false };
                jewels = { active: true, phase: 'WAIT', generation: jewels.generation + 1, command: null, commandId: jewels.commandId + 1 };
            }
            else if (action === 'lift' && jewels.active && jewels.phase === 'WAIT') {
                liftWaitingChapter();
                return;
            }
            else if (action === 'exit')
                jewels = { ...jewels, active: false };
            else if (jewels.active && jewels.phase === 'READY' && ['left', 'right', 'reverse'].includes(String(action))) {
                if (action !== 'reverse')
                    interaction.completed = true;
                jewels = { ...jewels, phase: action === 'reverse' ? 'GATHER' : 'ROTATING', command: action, commandId: jewels.commandId + 1 };
            }
            else if (action === 'status' && role === 'vertical' && jewels.active && phase === 'COMPLETE') {
                jewels = { ...jewels, phase: 'COMPLETE', command: null };
                returnBookObject(5, () => finishInteraction(5));
            }
            else if (action === 'status' && role === 'vertical' && jewels.active && typeof phase === 'string' && ['INTRO', 'SPREAD', 'READY', 'ROTATING', 'GATHER', 'LOWER', 'COMPLETE', 'ERROR'].includes(phase))
                jewels = { ...jewels, phase, command: null };
            else
                return;
            broadcast();
        });
        registerInput('exhibition:motifs', (event, action, phase, blooms) => {
            const role = senderRole(event.sender);
            if (!role)
                return;
            // Reject late completion/phase reports from an earlier visit to Chapter 4.
            if (action === 'status' && role === 'vertical' && typeof phase === 'string') {
                const next = { WAIT: [], load: ['INTRO'], INTRO: ['IDLE'], IDLE: ['VINES_GROW'], VINES_GROW: ['VINES_PART'], VINES_PART: ['SCROLL_READY'], SCROLL_READY: ['SCROLL_OPEN', 'BLOOM_OPTIONAL'], SCROLL_OPEN: ['CONTENT_VISIBLE'], CONTENT_VISIBLE: ['BLOOM_OPTIONAL'], BLOOM_OPTIONAL: ['BLOOM_OPTIONAL'], EXIT_CENTER: ['EXIT_PAUSE'], EXIT_PAUSE: ['EXIT_CLEAR'], EXIT_CLEAR: ['COMPLETE'] };
                if (phase !== 'ERROR' && phase !== motifs.phase && !next[motifs.phase]?.includes(phase))
                    return;
            }
            if (action === 'start' || action === 'reset') {
                welcome = false;
                cancelHandoff();
                jewels = { ...jewels, active: false };
                clearTimeout(fashionExitTimer);
                architecture = { ...architecture, active: false };
                motifs = { active: true, phase: 'WAIT', blooms: 0, generation: motifs.generation + 1, command: null, commandId: motifs.commandId + 1 };
            }
            else if (action === 'lift' && motifs.active && motifs.phase === 'WAIT') {
                liftWaitingChapter();
                return;
            }
            else if (action === 'next' && motifs.active && ['SCROLL_READY', 'CONTENT_VISIBLE', 'BLOOM_OPTIONAL'].includes(motifs.phase))
                motifs = { ...motifs, phase: 'EXIT_CENTER', command: 'next', commandId: motifs.commandId + 1 };
            else if (action === 'exit')
                motifs = { ...motifs, active: false };
            else if (action === 'open' && motifs.active && motifs.phase === 'SCROLL_READY')
                motifs = { ...motifs, phase: 'SCROLL_OPEN', command: 'open', commandId: motifs.commandId + 1 };
            else if (action === 'bloom' && motifs.active && !motifs.command && ['SCROLL_READY', 'CONTENT_VISIBLE', 'BLOOM_OPTIONAL'].includes(motifs.phase) && motifs.blooms < 3) {
                motifs = { ...motifs, blooms: motifs.blooms + 1, command: 'bloom', commandId: motifs.commandId + 1 };
            }
            else if (action === 'status' && role === 'vertical' && motifs.active && phase === 'COMPLETE' && motifs.phase === 'EXIT_CLEAR') {
                motifs = { ...motifs, phase: 'COMPLETE', command: null };
                returnBookObject(4, () => finishInteraction(4));
            }
            else if (action === 'status' && role === 'vertical' && motifs.active && typeof phase === 'string' && ['load', 'INTRO', 'IDLE', 'VINES_GROW', 'VINES_PART', 'SCROLL_READY', 'SCROLL_OPEN', 'CONTENT_VISIBLE', 'BLOOM_OPTIONAL', 'EXIT_CENTER', 'EXIT_PAUSE', 'EXIT_CLEAR', 'COMPLETE', 'ERROR'].includes(phase) && typeof blooms === 'number' && Number.isInteger(blooms) && blooms >= 0 && blooms <= 3)
                motifs = { ...motifs, phase, blooms, command: null };
            else
                return;
            broadcast();
        });
        registerInput('exhibition:architecture', (event, action, phase) => {
            const role = senderRole(event.sender);
            if (!role)
                return;
            if (action === 'start' || action === 'reset') {
                welcome = false;
                cancelHandoff();
                jewels = { ...jewels, active: false };
                motifs = { ...motifs, active: false };
                clearTimeout(fashionExitTimer);
                architecture = { active: true, phase: 'WAIT', generation: architecture.generation + 1, command: null, commandId: architecture.commandId + 1 };
            }
            else if (action === 'lift' && architecture.active && architecture.phase === 'WAIT') {
                liftWaitingChapter();
                return;
            }
            else if (action === 'next' && architecture.active && ['idle', 'inside'].includes(architecture.phase))
                architecture = { ...architecture, phase: 'folding', command: 'next', commandId: architecture.commandId + 1 };
            else if (action === 'phase' && role === 'vertical' && phase === 'complete' && architecture.active && architecture.phase === 'folding') {
                architecture = { ...architecture, phase: 'complete', command: null };
                returnBookObject(3, () => finishInteraction(3));
            }
            else if (action === 'exit')
                architecture = { ...architecture, active: false };
            else if (action === 'open' && architecture.active && architecture.phase === 'idle')
                architecture = { ...architecture, phase: 'opening', command: 'open', commandId: architecture.commandId + 1 };
            else if (action === 'return' && architecture.active && architecture.phase === 'inside')
                architecture = { ...architecture, phase: 'leaving', command: 'return', commandId: architecture.commandId + 1 };
            else if (action === 'phase' && role === 'vertical' && architecture.active && typeof phase === 'string' && ['load', 'rise', 'idle', 'opening', 'entering', 'inside', 'leaving', 'folding', 'error'].includes(phase)) {
                if (phase === 'idle' && architecture.phase === 'leaving')
                    interaction.completed = true;
                architecture = { ...architecture, phase, command: null };
            }
            else
                return;
            broadcast();
        });
        registerInput('exhibition:fashion', (event, action) => {
            if (!senderRole(event.sender))
                return;
            const now = Date.now();
            if (action === 'reset')
                cancelHandoff();
            if (action === 'reset') {
                jewels = { ...jewels, active: false };
                motifs = { ...motifs, active: false };
                architecture = { ...architecture, active: false };
                clearTimeout(fashionExitTimer);
                fashion = { startedAt: 0, look: 'red', switchedAt: 0, exitingAt: 0, nextChapter: false };
            }
            else if (action === 'lift' && !fashion.startedAt) {
                liftWaitingChapter();
                return;
            }
            else if (action === 'switch' && !fashion.exitingAt && !fashion.nextChapter && fashion.startedAt && now >= fashion.startedAt + 4700 && now >= fashion.switchedAt + 900) {
                fashion = { ...fashion, look: fashion.look === 'red' ? 'white' : 'red', switchedAt: now };
                interaction.completed = true;
            }
            else if (action === 'next' && !fashion.exitingAt && !fashion.nextChapter && now >= fashion.switchedAt + 900 && (!fashion.startedAt || now >= fashion.startedAt + 4700)) {
                fashion = { ...fashion, exitingAt: now };
                fashionExitTimer = setTimeout(() => returnBookObject(2, () => finishInteraction(2)), 2400);
            }
            else
                return;
            broadcast();
        });
        registerInput('exhibition:navigate', (event, direction, source) => {
            if (auto.active && (source === 'gesture' || source === 'keyboard'))
                return;
            const role = senderRole(event.sender);
            if (!role || !['next', 'previous', 'reset'].includes(String(direction)))
                return;
            if (!['gesture', 'keyboard', 'operator'].includes(String(source)))
                return;
            if (source === 'gesture' && role !== 'book')
                return;
            if (source !== 'operator' && direction !== 'reset' && !(0, gestureRouting_1.canTurnPage)(snapshot(), Date.now()))
                return;
            if (source === 'operator' && handoff.phase !== 'idle' && !(0, gestureRouting_1.reversalReady)(snapshot(), Date.now()) && direction !== 'reset')
                return;
            if (role === 'book' || source === 'operator') {
                if (welcome) {
                    if (direction === 'next') {
                        openBookChapter(1);
                        broadcast();
                    }
                    return;
                }
                if (direction === 'reset') {
                    openBookChapter(1);
                    welcome = true;
                    broadcast();
                    return;
                }
                if (handoff.phase === 'lifting' || handoff.phase === 'returning')
                    return;
                const chapter = jewels.active ? 5 : motifs.active ? 4 : architecture.active ? 3 : fashion.nextChapter ? 1 : 2;
                const now = Date.now();
                const beforeLift = (0, gestureRouting_1.waitingForLift)(snapshot());
                if (beforeLift && direction !== 'reset') {
                    const destination = direction === 'previous' ? chapter - 1 : chapter === 5 ? 0 : chapter + 1;
                    openBookChapter(destination || 1);
                    if (!destination)
                        welcome = true;
                    broadcast();
                    return;
                }
                if (source !== 'operator' && direction !== 'reset')
                    pendingPage = direction === 'previous' ? chapter - 1 : chapter === 5 ? 0 : chapter + 1;
                if (direction === 'previous' && source === 'operator') {
                    if (chapter > 1)
                        openBookChapter(chapter - 1);
                }
                else if (direction === 'reset')
                    openBookChapter(1);
                else if (chapter === 1 && biryaniVideo.phase === 'book')
                    openBookChapter(2);
                else if (chapter === 1 && biryaniVideo.phase === 'LIST')
                    biryaniVideo = { ...biryaniVideo, phase: 'RETURN', command: 'next', commandId: (biryaniVideo.commandId ?? 0) + 1 };
                else if (chapter === 2 && !fashion.exitingAt && (!fashion.startedAt || now - fashion.startedAt >= 4700) && now - fashion.switchedAt >= 900) {
                    fashion = { ...fashion, exitingAt: now };
                    fashionExitTimer = setTimeout(() => returnBookObject(2, () => finishInteraction(2)), 2400);
                }
                else if (chapter === 3 && ['idle', 'inside'].includes(architecture.phase))
                    architecture = { ...architecture, phase: 'folding', command: 'next', commandId: architecture.commandId + 1 };
                else if (chapter === 4 && ['SCROLL_READY', 'CONTENT_VISIBLE', 'BLOOM_OPTIONAL'].includes(motifs.phase))
                    motifs = { ...motifs, phase: 'EXIT_CENTER', command: 'next', commandId: motifs.commandId + 1 };
                else if (chapter === 5 && jewels.phase === 'READY')
                    jewels = { ...jewels, phase: 'GATHER', command: 'reverse', commandId: jewels.commandId + 1 };
                broadcast();
                return;
            }
            experience = (0, experience_1.navigateExperience)(experience, direction, source, Date.now());
            scheduleChapter();
            broadcast();
        });
        let lastAcceptedGesture = 0;
        electron_1.ipcMain.handle('exhibition:gesture', (event, value, key, capturedAt) => {
            if (senderRole(event.sender) !== 'book' || !value || typeof value !== 'object')
                return;
            const gesture = value;
            const now = Date.now();
            if (!gestureRouting_1.GESTURES.includes(gesture.name) || typeof gesture.detail !== 'string' || gesture.detail.length > 200 || typeof capturedAt !== 'number' || !Number.isFinite(capturedAt) || now - capturedAt > 350 || capturedAt - now > 100)
                return;
            if (key !== (0, gestureRouting_1.gestureContextKey)(snapshot()) || now - lastAcceptedGesture < 300)
                return;
            const command = (0, gestureRouting_1.routeGesture)(snapshot(), gesture, now);
            if (!command)
                return;
            lastAcceptedGesture = now;
            experience = { ...experience, gestureCount: experience.gestureCount + 1, lastInput: 'gesture', lastGestureAt: now,
                lastDirection: command.channel === 'navigate' ? command.action : experience.lastDirection };
            if (command.channel === 'lift')
                liftWaitingChapter();
            else if (command.channel === 'navigate')
                inputHandlers.get('exhibition:navigate')(event, command.action, 'gesture');
            else
                inputHandlers.get('exhibition:' + command.channel)(event, command.action);
            broadcast();
        });
        electron_1.ipcMain.handle('exhibition:chapter', (event, action, source) => {
            if (auto.active && source === 'gesture')
                return;
            if (action?.type === 'lift' && senderRole(event.sender) === 'book') {
                liftWaitingChapter();
                return;
            }
            if (architecture.active || motifs.active || jewels.active)
                return;
            const role = senderRole(event.sender);
            if (!role || experience.page !== 1 || !action || typeof action !== 'object')
                return;
            if (!['gesture', 'keyboard', 'operator'].includes(String(source)))
                return;
            if (source === 'gesture' && role !== 'book')
                return;
            if (!['move', 'lift', 'explode', 'clear', 'restart', 'point', 'grab', 'dragIngredient', 'drop', 'cancelGrab', 'return', 'advance'].includes(action.type))
                return;
            if (action.type === 'move' && (!Number.isFinite(action.dx) || !Number.isFinite(action.dy)))
                return;
            if (['point', 'grab', 'dragIngredient', 'drop'].includes(action.type) &&
                (!('x' in action) || !('y' in action) || !Number.isFinite(action.x) || !Number.isFinite(action.y)))
                return;
            const chapter = (0, chapter_1.reduceChapter)(experience.chapter, action, Date.now());
            if (chapter === experience.chapter)
                return;
            experience = { ...experience, chapter, lastInput: source,
                gestureCount: experience.gestureCount + (source === 'gesture' && chapter.actions > experience.chapter.actions ? 1 : 0) };
            scheduleChapter();
            broadcast();
        });
        electron_1.ipcMain.on('exhibition:surface', (event, width, height) => {
            const role = senderRole(event.sender);
            if (!role || typeof width !== 'number' || typeof height !== 'number' || !Number.isFinite(width) || !Number.isFinite(height))
                return;
            if (width < 100 || height < 100 || width > 20000 || height > 20000)
                return;
            const next = { width: Math.round(width), height: Math.round(height) };
            if (surfaces[role].width === next.width && surfaces[role].height === next.height)
                return;
            surfaces[role] = next;
            broadcast();
        });
        electron_1.ipcMain.on('exhibition:vision', (event, status) => {
            if (senderRole(event.sender) !== 'book' || !status || typeof status !== 'object')
                return;
            if (!['off', 'starting', 'ready', 'error'].includes(status.camera) || !['none', 'visible', 'armed'].includes(status.hand))
                return;
            if (typeof status.message !== 'string' || !Number.isFinite(status.fps))
                return;
            if (status.camera === 'off' || status.camera === 'error')
                experience = { ...experience, chapter: (0, chapter_1.reduceChapter)(experience.chapter, { type: 'cancelGrab' }, Date.now()) };
            if (status.camera === 'off' || status.camera === 'error')
                forwardHands({ capturedAt: Date.now(), hands: [] });
            vision = { camera: status.camera, hand: status.hand, message: status.message.slice(0, 200), fps: Math.max(0, Math.min(120, status.fps)), hands: Math.max(0, Math.min(2, Number(status.hands) || 0)),
                backend: status.backend === 'GPU' || status.backend === 'CPU' ? status.backend : undefined,
                model: status.model === 'lite' || status.model === 'full' ? status.model : undefined,
                inferenceMs: Number.isFinite(status.inferenceMs) ? Math.max(0, Math.min(8000, status.inferenceMs)) : undefined,
                frameAgeMs: Number.isFinite(status.frameAgeMs) ? Math.max(0, Math.min(8000, status.frameAgeMs)) : undefined,
            };
            broadcast();
        });
        electron_1.ipcMain.on('exhibition:hands', (event, frame) => {
            if (senderRole(event.sender) !== 'book' || !frame || !Number.isFinite(frame.capturedAt) || !Array.isArray(frame.hands) || frame.hands.length > 2)
                return;
            if (frame.hands.some((hand) => !hand || typeof hand.id !== 'string' || !Number.isFinite(hand.x) || !Number.isFinite(hand.y) || typeof hand.pinching !== 'boolean'))
                return;
            const age = Date.now() - frame.capturedAt;
            if (age < -100 || age > 350) {
                forwardHands({ capturedAt: Date.now(), hands: [] });
                return;
            }
            if (frame.hands.length)
                inactivity.touch(Date.now());
            forwardHands({ capturedAt: frame.capturedAt, hands: frame.hands.map((hand) => ({ id: hand.id.slice(0, 20), x: Math.max(0, Math.min(1, hand.x)), y: Math.max(0, Math.min(1, hand.y)), pinching: hand.pinching })) });
        });
        electron_1.ipcMain.handle('exhibition:display', (event, role, id) => {
            if (!senderRole(event.sender) || !isRole(role) || !electron_1.screen.getAllDisplays().some((display) => display.id === id))
                return;
            assignments[role] = id;
            (0, node_fs_1.writeFileSync)((0, node_path_1.join)(runtimeRoot, 'displays.json'), JSON.stringify(assignments, null, 2));
            placeWindows();
            broadcast();
        });
        electron_1.ipcMain.handle('exhibition:fullscreen', (event) => {
            const role = senderRole(event.sender);
            const window = role && windows.get(role);
            if (window)
                window.setFullScreen(!window.isFullScreen());
        });
        chooseDisplays();
        createWindow('book');
        createWindow('vertical');
        placeWindows();
        const updateDisplays = () => { placeWindows(); broadcast(); };
        electron_1.screen.on('display-added', updateDisplays);
        electron_1.screen.on('display-removed', updateDisplays);
        electron_1.screen.on('display-metrics-changed', updateDisplays);
    });
}
electron_1.app.on('window-all-closed', () => electron_1.app.quit());
