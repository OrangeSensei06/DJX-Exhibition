import type { ChapterState, IngredientId, ReconstructionState } from './protocol';

export const INGREDIENT_IDS: IngredientId[] = ['rice', 'saffron', 'protein', 'onions', 'spices', 'herbs', 'nuts'];
export const COLLECTION_MS = 700;
export const BOWL_HOME = { x: 0.5, y: 0.89 };
export const reconstructionRow = (index: number) => 0.235 + index * 0.071;
export const ingredientHome = (id: IngredientId) => {
  const index = INGREDIENT_IDS.indexOf(id);
  return { x: index % 2 === 0 ? 0.845 : 0.155, y: reconstructionRow(index) };
};
export const emptyReconstruction = (): ReconstructionState => ({ collected: [], held: null, cursor: null, placements: {} });
export const inBowl = (x: number, y: number) => x >= 0.18 && x <= 0.82 && y >= 0.74 && y <= 1;

export function ingredientAt(state: ReconstructionState, x: number, y: number): IngredientId | null {
  let nearest: IngredientId | null = null;
  let best = 1;
  for (const id of INGREDIENT_IDS) {
    if (state.collected.includes(id)) continue;
    const home = ingredientHome(id);
    const score = ((x - home.x) / 0.16) ** 2 + ((y - home.y) / 0.06) ** 2;
    if (score < best) { best = score; nearest = id; }
  }
  return nearest;
}

export function readyToReturn(chapter: ChapterState, now: number) {
  return chapter.phase === 'complete' && chapter.reconstruction.collected.length === INGREDIENT_IDS.length
    && chapter.reconstruction.held === null && now >= chapter.startedAt + COLLECTION_MS;
}
