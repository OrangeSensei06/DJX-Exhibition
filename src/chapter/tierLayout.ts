export type LayerName = 'bowl' | 'rice' | 'saffron' | 'protein' | 'onions' | 'herbs' | 'spices';
export interface LayerBounds { name: LayerName; minY: number; maxY: number; minZ: number; maxZ: number; }
export const EXPLODED_TILT = 0.16;
export const TIER_GAP = 0.22;
const thickness: Record<LayerName, number> = { bowl: 1, rice: 0.58, saffron: 0.54, protein: 0.9, onions: 0.5, herbs: 0.7, spices: 0.9 };

// Lay out screen-facing tiers using their actual projected bounds. Offsets alone
// cannot create visible gaps when the original grain clouds have substantial depth.
export function layoutTiers(bounds: LayerBounds[]) {
  const cosine = Math.cos(EXPLODED_TILT), sine = Math.sin(EXPLODED_TILT);
  const bowl = bounds.find((part) => part.name === 'bowl')!;
  const bottom = bowl.minY * cosine - bowl.maxZ * sine;
  let top = bowl.maxY * cosine - bowl.minZ * sine;
  const tiers = bounds.map((part) => {
    const centerY = (part.minY + part.maxY) / 2;
    const centerZ = (part.minZ + part.maxZ) / 2;
    const flatten = thickness[part.name];
    if (part.name === 'bowl') return { name: part.name, centerY, targetY: centerY, flatten, bottom, top };
    const projectedHeight = (part.maxY - part.minY) * flatten * cosine + (part.maxZ - part.minZ) * sine;
    const tierBottom = top + TIER_GAP;
    top = tierBottom + projectedHeight;
    const targetY = (tierBottom + projectedHeight / 2 + centerZ * sine) / cosine;
    return { name: part.name, centerY, targetY, flatten, bottom: tierBottom, top };
  });
  return { tiers, height: top - bottom, center: (top + bottom) / 2 };
}
