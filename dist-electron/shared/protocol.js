"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialSurfaces = exports.initialVision = exports.initialExperience = void 0;
exports.initialExperience = {
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
exports.initialVision = {
    camera: 'off', hand: 'none', message: 'Camera off', fps: 0,
};
exports.initialSurfaces = { book: { width: 1100, height: 700 }, vertical: { width: 650, height: 950 } };
