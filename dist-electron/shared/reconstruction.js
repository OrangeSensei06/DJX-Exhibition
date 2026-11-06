"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inBowl = exports.emptyReconstruction = exports.ingredientHome = exports.reconstructionRow = exports.BOWL_HOME = exports.COLLECTION_MS = exports.INGREDIENT_IDS = void 0;
exports.ingredientAt = ingredientAt;
exports.readyToReturn = readyToReturn;
exports.INGREDIENT_IDS = ['rice', 'saffron', 'protein', 'onions', 'spices', 'herbs', 'nuts'];
exports.COLLECTION_MS = 700;
exports.BOWL_HOME = { x: 0.5, y: 0.89 };
const reconstructionRow = (index) => 0.235 + index * 0.071;
exports.reconstructionRow = reconstructionRow;
const ingredientHome = (id) => {
    const index = exports.INGREDIENT_IDS.indexOf(id);
    return { x: index % 2 === 0 ? 0.845 : 0.155, y: (0, exports.reconstructionRow)(index) };
};
exports.ingredientHome = ingredientHome;
const emptyReconstruction = () => ({ collected: [], held: null, cursor: null, placements: {} });
exports.emptyReconstruction = emptyReconstruction;
const inBowl = (x, y) => x >= 0.18 && x <= 0.82 && y >= 0.74 && y <= 1;
exports.inBowl = inBowl;
function ingredientAt(state, x, y) {
    let nearest = null;
    let best = 1;
    for (const id of exports.INGREDIENT_IDS) {
        if (state.collected.includes(id))
            continue;
        const home = (0, exports.ingredientHome)(id);
        const score = ((x - home.x) / 0.16) ** 2 + ((y - home.y) / 0.06) ** 2;
        if (score < best) {
            best = score;
            nearest = id;
        }
    }
    return nearest;
}
function readyToReturn(chapter, now) {
    return chapter.phase === 'complete' && chapter.reconstruction.collected.length === exports.INGREDIENT_IDS.length
        && chapter.reconstruction.held === null && now >= chapter.startedAt + exports.COLLECTION_MS;
}
