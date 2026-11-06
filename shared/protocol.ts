export type WindowRole = 'book' | 'vertical';
export type InputSource = 'gesture' | 'keyboard' | 'operator';
export type Navigation = 'next' | 'previous' | 'reset';
export type IngredientId = 'rice' | 'saffron' | 'protein' | 'onions' | 'spices' | 'herbs' | 'nuts';
export interface ReconstructionState {
  collected: IngredientId[];
  held: { id: IngredientId; x: number; y: number } | null;
  cursor: { x: number; y: number } | null;
  placements: Partial<Record<IngredientId, { x: number; y: number; at: number }>>;
}
export type ChapterPhase = 'book' | 'transferring' | 'presented' | 'exploding' | 'exploded' | 'clearing' | 'story' | 'complete' | 'reassembling' | 'returning' | 'paging';
export type ChapterAction = { type: 'move'; dx: number; dy: number }
  | { type: 'point' | 'grab' | 'dragIngredient' | 'drop'; x: number; y: number }
  | { type: 'lift' | 'explode' | 'clear' | 'restart' | 'cancelGrab' | 'return' | 'advance' };
export type SurfaceMetrics = Record<WindowRole, { width: number; height: number }>;
export interface ChapterState {
  phase: ChapterPhase;
  startedAt: number;
  openedAt: number;
  position: { x: number; y: number };
  transferOrigin: { x: number; y: number };
  actions: number;
  lastAction: ChapterAction['type'] | null;
  reconstruction: ReconstructionState;
}

export interface ExperienceState {
  page: number;
  gestureCount: number;
  lastGestureAt: number;
  lastInput: InputSource | null;
  lastDirection: Navigation | null;
  chapter: ChapterState;
}

export interface VisionStatus {
  camera: 'off' | 'starting' | 'ready' | 'error';
  hand: 'none' | 'visible' | 'armed';
  message: string;
  fps: number;
  hands?: number;
  backend?: 'GPU' | 'CPU';
  model?: 'lite' | 'full';
  inferenceMs?: number;
  frameAgeMs?: number;
}

export interface HandCursor { id: string; x: number; y: number; pinching: boolean; }
export interface HandFrame { capturedAt: number; hands: HandCursor[]; }

export interface DisplayInfo {
  id: number;
  label: string;
  width: number;
  height: number;
}

export interface FashionState { startedAt: number; look: 'red' | 'white'; switchedAt: number; exitingAt: number; nextChapter: boolean; }
export type FashionAction = 'lift' | 'switch' | 'reset' | 'next';
export interface BiryaniVideoState { phase: 'book' | 'arrival' | 'waiting' | 'separating' | 'ingredients' | 'returning' | 'restoring' | 'ENTER' | 'IDLE' | 'EXPLODING' | 'STACKED' | 'SWEEP' | 'LIST' | 'RETURN' | 'DONE' | 'ERROR'; generation?:number;command?:'explode'|'list'|'next'|null;commandId?:number; startedAt: number; reverseFrom: number; }
export type BiryaniVideoAction = 'lift' | 'separate' | 'list' | 'status' | 'next' | 'reset' | 'arrived' | 'revealed' | 'rewound' | 'returned';
export interface Snapshot {
  interaction: { completed: boolean; pageReadyAt: number };
  welcome?:boolean;
  auto:{active:boolean;runId:number;stage:string};
  handoff:{chapter:number;phase:'idle'|'lifting'|'away'|'returning';startedAt:number};
    jewels: {active:boolean;phase:string;generation:number;command:'left'|'right'|'reverse'|null;commandId:number};
  motifs: {active:boolean;phase:string;blooms:number;generation:number;command:'open'|'bloom'|'next'|null;commandId:number};
  architecture: { active: boolean; phase: string; generation: number; command: 'open' | 'return' | 'next' | null; commandId: number };
  biryaniVideo: BiryaniVideoState;
  fashion: FashionState;
  sequence: number;
  experience: ExperienceState;
  vision: VisionStatus;
  displays: DisplayInfo[];
  assignments: Record<WindowRole, number>;
  connected: WindowRole[];
  fullscreen: Record<WindowRole, boolean>;
  surfaces: SurfaceMetrics;
}

export interface ExhibitionAPI {
  recognizeGesture(event: import('./gestureRouting').LabGesture, contextKey: string, capturedAt: number): Promise<void>;
  autoAction(action:'start'|'stop'|'stage'|'finish',stage?:string):Promise<void>;
  bookOpen(chapter:number):Promise<void>;
    jewelsAction(action:'start'|'lift'|'left'|'right'|'reverse'|'reset'|'exit'|'status',phase?:string):Promise<void>;
  motifsAction(action:'start'|'lift'|'open'|'bloom'|'next'|'reset'|'exit'|'status', phase?:string, blooms?:number):Promise<void>;
  architectureAction(action: 'start' | 'lift' | 'open' | 'return' | 'next' | 'reset' | 'exit' | 'phase', phase?: string): Promise<void>;
  biryaniVideoAction(action: BiryaniVideoAction, time?: number,phase?:string): Promise<void>;
  fashionAction(action: FashionAction): Promise<void>;
  getSnapshot(): Promise<Snapshot>;
  subscribe(listener: (snapshot: Snapshot) => void): () => void;
  navigate(direction: Navigation, source: InputSource): Promise<void>;
  chapterAction(action: ChapterAction, source: InputSource): Promise<void>;
  reportSurface(width: number, height: number): void;
  reportVision(status: VisionStatus): void;
  reportHands(frame: HandFrame): void;
  subscribeHands(listener: (frame: HandFrame) => void): () => void;
  assignDisplay(role: WindowRole, displayId: number): Promise<void>;
  toggleFullscreen(): Promise<void>;
}

export const initialExperience: ExperienceState = {
  page: 0,
  gestureCount: 0,
  lastGestureAt: 0,
  lastInput: null,
  lastDirection: null,
  chapter: {
    phase: 'book', startedAt: 0, openedAt: 0,
    position: { x: 0.75, y: 0.56 }, transferOrigin: { x: 0.75, y: 0.56 },
    actions: 0, lastAction: null,
    reconstruction: { collected: [], held: null, cursor: null, placements: {} },
  },
};

export const initialVision: VisionStatus = {
  camera: 'off', hand: 'none', message: 'Camera off', fps: 0,
};
export const initialSurfaces: SurfaceMetrics = { book: { width: 1100, height: 700 }, vertical: { width: 650, height: 950 } };
