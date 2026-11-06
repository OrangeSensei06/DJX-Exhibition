import { contextBridge, ipcRenderer } from 'electron';
import type { ExhibitionAPI, HandFrame, Snapshot } from '../shared/protocol';

const api: ExhibitionAPI = {
  recognizeGesture: (event, contextKey, capturedAt) => ipcRenderer.invoke('exhibition:gesture', event, contextKey, capturedAt),
  autoAction:(action,stage)=>ipcRenderer.invoke('exhibition:auto',action,stage),
  bookOpen: chapter => ipcRenderer.invoke('exhibition:book-open',chapter),
  jewelsAction: (action,phase) => ipcRenderer.invoke('exhibition:jewels',action,phase),
  motifsAction: (action,phase,blooms) => ipcRenderer.invoke('exhibition:motifs',action,phase,blooms),
  architectureAction: (action, phase) => ipcRenderer.invoke('exhibition:architecture', action, phase),
  biryaniVideoAction: (action, time, phase) => ipcRenderer.invoke('exhibition:biryani-video', action, time, phase),
  fashionAction: (action) => ipcRenderer.invoke('exhibition:fashion', action),
  getSnapshot: () => ipcRenderer.invoke('exhibition:snapshot'),
  subscribe: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: Snapshot) => listener(snapshot);
    ipcRenderer.on('exhibition:state', handler);
    return () => ipcRenderer.removeListener('exhibition:state', handler);
  },
  navigate: (direction, source) => ipcRenderer.invoke('exhibition:navigate', direction, source),
  chapterAction: (action, source) => ipcRenderer.invoke('exhibition:chapter', action, source),
  reportSurface: (width, height) => ipcRenderer.send('exhibition:surface', width, height),
  reportVision: (status) => ipcRenderer.send('exhibition:vision', status),
  reportHands: (frame) => ipcRenderer.send('exhibition:hands', frame),
  subscribeHands: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, frame: HandFrame) => listener(frame);
    ipcRenderer.on('exhibition:hand-frame', handler);
    return () => ipcRenderer.removeListener('exhibition:hand-frame', handler);
  },
  assignDisplay: (role, displayId) => ipcRenderer.invoke('exhibition:display', role, displayId),
  toggleFullscreen: () => ipcRenderer.invoke('exhibition:fullscreen'),
};

contextBridge.exposeInMainWorld('exhibition', api);
