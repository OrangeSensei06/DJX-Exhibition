import { useEffect, useState } from 'react';
import { initialExperience, initialSurfaces, initialVision } from '../shared/protocol';
import type { Snapshot, WindowRole } from '../shared/protocol';
import { useGestureCamera } from './gesture/useGestureCamera';
import { useExhibitionAudio } from './audio/useExhibitionAudio';
// Legacy 3D chapter retained in src/chapter/ChapterOne.tsx; disabled for the video edition.
// import { ChapterOne } from './chapter/ChapterOne';
import {BiryaniScene as BiryaniVideoChapter,BiryaniSceneControls as BiryaniVideoControls} from './chapter/BiryaniScene';
import { FashionChapter, FashionControls } from './fashion/FashionChapter';
import { ArchitectureChapter, ArchitectureControls } from './architecture/ArchitectureChapter';
import { MotifsChapter, MotifsControls } from './motifs/MotifsChapter';
import { JewelsChapter, JewelsControls } from './jewels/JewelsChapter';
import {BookDisplay,BookControls} from './book/BookDisplay';
import {useAutoSequence,AutoControls} from './book/useAutoSequence';
import {StartScreen} from './start/StartScreen';
import {VerticalDisplay} from './vertical/VerticalDisplay';

const role: WindowRole = new URLSearchParams(window.location.search).get('view') === 'vertical' ? 'vertical' : 'book';
const previewSnapshot: Snapshot = {
  interaction: {completed:false,pageReadyAt:0},
  welcome:true,
  auto:{active:false,runId:0,stage:'Ready'},
  handoff:{chapter:2,phase:'idle',startedAt:0},
  jewels:{active:false,phase:'LOAD',generation:0,command:null,commandId:0},
  motifs:{active:false,phase:'load',blooms:0,generation:0,command:null,commandId:0},
  architecture: {active:false,phase:'load',generation:0,command:null,commandId:0},
  biryaniVideo: {phase:'book',startedAt:0,reverseFrom:7.5},
  fashion: { startedAt: 0, look: 'red', switchedAt: 0, exitingAt: 0, nextChapter: false },
  sequence: 0, experience: initialExperience, vision: initialVision,
  displays: [], assignments: { book: 0, vertical: 0 }, connected: [],
  fullscreen: { book: false, vertical: false },
  surfaces: initialSurfaces,
};

function ArchMark({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'arch-mark small' : 'arch-mark'} viewBox="0 0 64 72" fill="none" aria-hidden="true">
    <path d="M11 62V34c0-11 8-16 14-21 3-3 5-5 7-9 2 4 4 6 7 9 6 5 14 10 14 21v28H11Z" />
    <path d="M20 62V36c0-8 7-12 12-17 5 5 12 9 12 17v26M4 68h56M27 62V43h10v19" />
  </svg>;
}

function BookMark() {
  return <svg viewBox="0 0 34 26" fill="none" aria-hidden="true"><path d="M17 5C12 1 7 1 2 2v19c6-1 11 0 15 3m0-19c5-4 10-4 15-3v19c-6-1-11 0-15 3V5Z" /></svg>;
}

export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(previewSnapshot);
  useAutoSequence(role,snapshot.auto);
  const [setup, setSetup] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState('');
  const camera = useGestureCamera(role, snapshot);
  const audio = useExhibitionAudio(role, snapshot);
  const previewVisible = role === 'book' && (previewOpen || setup);
  const native = !!window.exhibition;
  const { page, gestureCount, lastInput, lastDirection } = snapshot.experience;
  const cameraOn = snapshot.vision.camera === 'ready' || snapshot.vision.camera === 'starting';

  const run = (operation: Promise<unknown> | undefined) => operation?.catch((cause) => setError(String(cause)));

  useEffect(() => {
    const api = window.exhibition;
    if (!api) return;
    const receive = (next: Snapshot) => setSnapshot((current) => next.sequence >= current.sequence ? next : current);
    const unsubscribe = api.subscribe(receive);
    void api.getSnapshot().then(receive).catch((cause) => setError(String(cause)));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea, button')) return;
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      if (role === 'book' && event.key === 'Tab' && !setup) {
        event.preventDefault();
        setPreviewOpen(open => !open);
        return;
      }
      const api = window.exhibition;
      if (role === 'book' && ['ArrowRight','PageDown','ArrowLeft','PageUp'].includes(event.key)) {
        event.preventDefault();run(api?.navigate(['ArrowLeft','PageUp'].includes(event.key)?'previous':'next','keyboard'));return;
      }
      if (!['d', 'escape', 'f11'].includes(event.key.toLowerCase())) return;
      if (event.key === 'ArrowRight' || event.key === 'Enter') { event.preventDefault(); run(api?.navigate('next', 'keyboard')); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); run(api?.navigate('previous', 'keyboard')); }
      if (event.key.toLowerCase() === 'r') run(api?.navigate('reset', 'keyboard'));
      if (event.key.toLowerCase() === 'u') run(api?.chapterAction({ type: 'lift' }, 'keyboard'));
      if (event.key.toLowerCase() === 'e') run(api?.chapterAction({ type: 'explode' }, 'keyboard'));
      if (event.key.toLowerCase() === 'c') run(api?.chapterAction({ type: 'clear' }, 'keyboard'));
      if (event.key.toLowerCase() === 'd') setSetup((value) => !value);
      if (event.key === 'F11') { event.preventDefault(); run(api?.toggleFullscreen()); }
      if (event.key === 'Escape') {
        setSetup(false);
        if (snapshot.fullscreen[role]) run(api?.toggleFullscreen());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [snapshot.fullscreen, snapshot.architecture.active, snapshot.motifs.active, setup]);

  useEffect(()=>{if(snapshot.fullscreen[role])setSetup(false)},[snapshot.fullscreen[role]]);

  const title = <>Mughal<br /><em>Times</em><span className="title-period">.</span></>;

  return <div className={`experience ${role} ${snapshot.fullscreen[role]?'exhibition-fullscreen':''} ${setup?'operator-open':''}`}>
    <header className="masthead">
      <div className="exhibition-brand"><BookMark /><span>INDIA<br />THROUGH TIME</span></div>
      <div className="edition-label"><span>AN INTERACTIVE EXHIBITION</span><span>MUGHAL INDIA / {role === 'book' ? 'THE BOOK' : 'THE GALLERY'}</span></div>
    </header>

    <main className="main-stage">
      {snapshot.welcome&&role==='vertical'&&<StartScreen vertical/>}
      {false && <article className="invitation" aria-live="polite" aria-atomic="true">
        <div className="invitation-top"><span className="hairline" /><span className="eyebrow">{page === 0 ? 'YOU ARE INVITED' : 'A MOMENT IN THE BOOK'}</span><span className="hairline" /></div>
        <ArchMark />
        <h1>{title}</h1>
        <div className="small-rule" />
        <p className="intro">{page === 0 ? 'The past, still present.' : page === 1 ? 'The book is open.' : 'The next page is here.'}</p>
        <p className="description">{page === 0 ? 'An exploration of Mughal legacies\nin everyday life.' : 'A simple beginning.\nMore stories will follow.'}</p>
        <div className="gesture-prompt">
          <span className="swipe-arrow" aria-hidden="true">⟵</span>
          <span>{role === 'vertical' ? 'Begin with a swipe on the book' : 'Swipe to begin'}</span>
        </div>
        <span className="gesture-detail">{role === 'book' ? 'MOVE YOUR HAND FROM RIGHT TO LEFT' : 'A JOURNEY THROUGH TIME, AT YOUR HAND'}</span>
        <div className="invitation-bottom"><span>{String(page).padStart(2, '0')}</span><span className="tiny-diamond" /><span>{page === 0 ? 'THE BEGINNING' : 'MUGHAL TIMES'}</span></div>
      </article>}
      {role==='book'?<BookDisplay snapshot={snapshot}/>:<VerticalDisplay snapshot={snapshot}>{snapshot.jewels.active ? <JewelsChapter role={role} state={snapshot.jewels}/> : snapshot.motifs.active ? <MotifsChapter role={role} state={snapshot.motifs}/> : snapshot.architecture.active ? <ArchitectureChapter role={role} state={snapshot.architecture}/> : snapshot.fashion.nextChapter ? <BiryaniVideoChapter role={role} state={snapshot.biryaniVideo}/> : <FashionChapter role={role} state={snapshot.fashion} />}</VerticalDisplay>}
      {false && <span className="margin-note">AN INVITATION TO DISCOVER</span>}
    </main>

    <footer className="statusbar">
      <div className="status-copy" role="status"><span className={`status-dot ${snapshot.vision.camera === 'ready' ? 'ready' : ''}`} /><span>{native ? snapshot.vision.message : 'Desktop preview · launch the app for camera input'}</span></div>
      <div className="footer-actions">
        {role === 'book' && <button className="quiet-button" disabled={!native || snapshot.vision.camera === 'starting'} onClick={() => cameraOn ? camera.stop() : void camera.start()}>{cameraOn ? snapshot.vision.camera === 'starting' ? 'Starting…' : 'Stop camera' : 'Enable camera'}</button>}
        {role === 'book' && <button className="quiet-button" aria-pressed={previewOpen} onClick={() => setPreviewOpen(open => !open)}>{previewOpen ? 'Hide preview' : 'Camera preview'} <kbd>Tab</kbd></button>}
        <button className="quiet-button" aria-expanded={setup} aria-controls="setup-panel" onClick={() => setSetup((value) => !value)}>{setup ? 'Close setup' : 'Setup'}<span aria-hidden="true">{setup ? '−' : '+'}</span></button>
      </div>
    </footer>

    {role === 'book' && <div className={`camera-preview ${previewVisible ? 'camera-preview-visible' : 'camera-preview-parked'}`} data-preview-visible={previewVisible}>
      <video ref={camera.videoRef} muted playsInline autoPlay aria-label="Mirrored hand tracking camera" />
      {previewVisible && <canvas ref={camera.overlayRef} className="hand-tracking-overlay" aria-hidden="true" />}
      {previewVisible && <span>{cameraOn ? `MIRRORED PREVIEW · ${snapshot.vision.hands ?? 0} / 2 HANDS` : 'CAMERA OFF · ENABLE IN SETUP'}</span>}
    </div>}

    <aside id="setup-panel" className="setup-panel" hidden={!setup} aria-label="Exhibition setup">
      <div className="setup-heading"><div><span className="eyebrow">OPERATOR CONTROLS</span><h2>Application setup</h2></div><button className="close-button" aria-label="Close setup" onClick={() => setSetup(false)}>×</button></div>
      <div className="diagnostic-grid">
        <div><span>Window</span><strong>{role === 'book' ? 'Book display' : 'Vertical display'}</strong></div>
        <div><span>Connection</span><strong>{snapshot.connected.length} / 2 windows</strong></div>
        <div><span>Current page</span><strong>{snapshot.jewels.active ? 'Chapter 05 · Jewels of the Empire' : snapshot.motifs.active ? 'Chapter 04 · Patterns of Paradise' : snapshot.architecture.active ? 'Chapter 03 · Beyond the Arches' : snapshot.fashion.nextChapter ? 'Chapter 01 · Biryani video' : 'Chapter 02 · Dresses'}</strong></div>
        <div><span>Detected gestures</span><strong>{gestureCount}</strong></div>
        <div><span>Last input</span><strong>{lastInput ? `${lastInput} · ${lastDirection}` : 'None yet'}</strong></div>
        <div><span>Hand tracking</span><strong>{snapshot.vision.fps ? `${snapshot.vision.fps} frames/s` : snapshot.vision.camera}</strong></div>
        <div><span>Chapter stage</span><strong>{snapshot.jewels.active ? snapshot.jewels.phase : snapshot.motifs.active ? snapshot.motifs.phase : snapshot.architecture.active ? snapshot.architecture.phase : snapshot.fashion.startedAt ? 'Fashion reveal' : 'Magazine spread'}</strong></div>
        <div><span>Hands visible</span><strong>{snapshot.vision.hands ?? 0} / 2</strong></div>
      </div>
      <section className="setup-section"><h3>Displays</h3>
        {(['book', 'vertical'] as const).map((view) => <label className="field" key={view}><span>{view === 'book' ? 'Book window' : 'Vertical window'}</span><select disabled={!native} value={snapshot.assignments[view]} onChange={(event) => run(window.exhibition?.assignDisplay(view, Number(event.target.value)))}>{snapshot.displays.map((display) => <option value={display.id} key={display.id}>{display.label} · {display.width} × {display.height}</option>)}</select></label>)}
        <button className="control-button" disabled={!native} onClick={() => run(window.exhibition?.toggleFullscreen())}>{snapshot.fullscreen[role] ? 'Exit fullscreen' : 'Fullscreen this window'}<span>↗</span></button>
        <p className="setup-note">With one monitor, both windows sit side by side. Assign different displays before using fullscreen.</p>
      </section>
      {role === 'book' && <section className="setup-section"><h3>Camera</h3>
        <label className="field"><span>Video input</span><select value={camera.deviceId} onChange={(event) => { camera.stop(); camera.setDeviceId(event.target.value); }}><option value="">Default camera</option>{camera.devices.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>
        <button className="control-button" disabled={!native || snapshot.vision.camera === 'starting'} onClick={() => cameraOn ? camera.stop() : void camera.start()}>{cameraOn ? snapshot.vision.camera === 'starting' ? 'Starting…' : 'Stop camera' : 'Enable camera'}</button>
        <p className="setup-note">Press Tab in the book window to toggle the mirrored hand-tracking preview at the bottom right. The preview rendering is disabled while hidden; tracking continues.</p>
        <p className="setup-note">Live dots and lines show tracked fingers. Cyan and amber distinguish the two hands. No outline means the hand is not currently tracked.</p>
        <p className="setup-note">Swipe left / right to browse. Swipe up once to lift a chapter; page turns then wait for its reversal prompt. Biryani: opposite vertical, then hands apart. Dresses: snap. Doors: push to enter and push to return. Scroll: opposite vertical. Jewels: pointing-finger swirl. Video stays on this laptop.</p>
      </section>}
      <section className="setup-section"><h3>Exhibition audio</h3>
        <label className="field"><span>Ambient music · {audio.ambienceVolume}%</span><input type="range" min={0} max={100} step={1} value={audio.ambienceVolume} onChange={event => audio.setAmbienceVolume(Number(event.target.value))} aria-label="Ambient music volume" /></label>
        <label className="field"><span>Interaction effects · {audio.effectsVolume}%</span><input type="range" min={0} max={100} step={1} value={audio.effectsVolume} onChange={event => audio.setEffectsVolume(Number(event.target.value))} aria-label="Sound effects volume" /></label>
        <p className="setup-note">Volumes persist between launches and sync across both windows. Audio is played only by the Book window.</p>
      </section>
      <AutoControls state={snapshot.auto}/>
      <BiryaniVideoControls state={snapshot.biryaniVideo} active={snapshot.fashion.nextChapter}/>
      <FashionControls state={snapshot.fashion} />
      <ArchitectureControls state={snapshot.architecture}/>
      <MotifsControls state={snapshot.motifs}/>
      <BookControls snapshot={snapshot}/>
      <JewelsControls state={snapshot.jewels}/>
      {error && <p role="alert" className="error-message">{error}</p>}
      <p className="build-note">MUGHAL TIMES / GESTURE LAB<br />Full hand model · metric recognition · dropout recovery.</p>
    </aside>
  </div>;
}
