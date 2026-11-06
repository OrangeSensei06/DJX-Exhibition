export type Landmark = { x: number; y: number; z: number };
export interface LabHand {
  id: number; coasting: boolean; lostMs: number;
  c: { x: number; y: number }; tip: { x: number; y: number };
  ppm: number; hs: number; landmarks: Landmark[]; world: Landmark[];
  pose: { pointing: boolean; tm: number; mp: number };
}
export interface GestureEvent { id: number; name: import('../../../shared/gestureRouting').LabGestureName; label: string; detail: string; t: number; at: number; }
export interface TrackerFrame { hands: LabHand[]; w: number; h: number; t: number; ms: number; fps: number; rescued: boolean; }
export interface LabConfig {
  mirror: boolean;
  camera: { width: number; height: number; fps: number; portrait: boolean; deviceId?: string };
  model: { minDetect: number; minPresence: number; minTrack: number; delegate: 'GPU' | 'CPU' };
  [key: string]: unknown;
}
export const CONFIG: LabConfig;
export class GestureEngine {
  constructor(onGesture: (event: GestureEvent) => void, overrides?: object);
  update(hands: LabHand[], now: number): void;
}
export class HandTracker {
  constructor(video: HTMLVideoElement, config: LabConfig, onFrame: (frame: TrackerFrame) => void, onError?: (error: unknown) => void);
  delegate: 'GPU' | 'CPU';
  stream?: MediaStream;
  start(): Promise<void>;
  stop(): void;
}
