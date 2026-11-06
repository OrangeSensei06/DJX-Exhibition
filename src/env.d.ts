import type { ExhibitionAPI } from '../shared/protocol';
declare global {
  interface Window { exhibition?: ExhibitionAPI; }
}
export {};
