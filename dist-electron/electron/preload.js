"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    recognizeGesture: (event, contextKey, capturedAt) => electron_1.ipcRenderer.invoke('exhibition:gesture', event, contextKey, capturedAt),
    autoAction: (action, stage) => electron_1.ipcRenderer.invoke('exhibition:auto', action, stage),
    bookOpen: chapter => electron_1.ipcRenderer.invoke('exhibition:book-open', chapter),
    jewelsAction: (action, phase) => electron_1.ipcRenderer.invoke('exhibition:jewels', action, phase),
    motifsAction: (action, phase, blooms) => electron_1.ipcRenderer.invoke('exhibition:motifs', action, phase, blooms),
    architectureAction: (action, phase) => electron_1.ipcRenderer.invoke('exhibition:architecture', action, phase),
    biryaniVideoAction: (action, time, phase) => electron_1.ipcRenderer.invoke('exhibition:biryani-video', action, time, phase),
    fashionAction: (action) => electron_1.ipcRenderer.invoke('exhibition:fashion', action),
    getSnapshot: () => electron_1.ipcRenderer.invoke('exhibition:snapshot'),
    subscribe: (listener) => {
        const handler = (_event, snapshot) => listener(snapshot);
        electron_1.ipcRenderer.on('exhibition:state', handler);
        return () => electron_1.ipcRenderer.removeListener('exhibition:state', handler);
    },
    navigate: (direction, source) => electron_1.ipcRenderer.invoke('exhibition:navigate', direction, source),
    chapterAction: (action, source) => electron_1.ipcRenderer.invoke('exhibition:chapter', action, source),
    reportSurface: (width, height) => electron_1.ipcRenderer.send('exhibition:surface', width, height),
    reportVision: (status) => electron_1.ipcRenderer.send('exhibition:vision', status),
    reportHands: (frame) => electron_1.ipcRenderer.send('exhibition:hands', frame),
    subscribeHands: (listener) => {
        const handler = (_event, frame) => listener(frame);
        electron_1.ipcRenderer.on('exhibition:hand-frame', handler);
        return () => electron_1.ipcRenderer.removeListener('exhibition:hand-frame', handler);
    },
    assignDisplay: (role, displayId) => electron_1.ipcRenderer.invoke('exhibition:display', role, displayId),
    toggleFullscreen: () => electron_1.ipcRenderer.invoke('exhibition:fullscreen'),
};
electron_1.contextBridge.exposeInMainWorld('exhibition', api);
