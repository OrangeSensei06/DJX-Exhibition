import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ChapterState, IngredientId, WindowRole } from '../../shared/protocol';
import { CHAPTER_TIMING, mix, smooth } from '../../shared/chapter';
import { BOWL_HOME, ingredientHome, INGREDIENT_IDS } from '../../shared/reconstruction';

export function ReconstructionParts({ source, chapter, role, active, diagnostic }: {
  source: THREE.Group; chapter: ChapterState; role: WindowRole; active: boolean;
  diagnostic: RefObject<HTMLDivElement | null>;
}) {
  const root = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const lastDiagnostic = useRef(0);
  const wasVisible = useRef(false);
  const { model, parts } = useMemo(() => {
    const model = source.clone(true);
    // Separate the supplied cashew mesh for collection, preserving the original GLB.
    const cashews = model.getObjectByName('Cashews_16');
    const nuts = new THREE.Group();
    nuts.name = 'nuts';
    (model.getObjectByName('Biryani') ?? model).add(nuts);
    if (cashews) nuts.attach(cashews);
    const parts = (['bowl', ...INGREDIENT_IDS] as const).map((id) => {
      const object = model.getObjectByName(id);
      if (!object) throw new Error(`Missing reconstruction group: ${id}`);
      const box = new THREE.Box3().setFromObject(object);
      return { id, object, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
    });
    return { model, parts };
  }, [source]);

  useFrame((_frame, delta) => {
    if (!root.current) return;
    const showing = role === 'vertical' && active && ['story', 'reassembling'].includes(chapter.phase);
    root.current.visible = showing;
    if (!showing) { wasVisible.current = false; return; }
    const entering = !wasVisible.current;
    wasVisible.current = true;
    const now = Date.now();
    const progress = chapter.phase === 'returning' ? smooth((now - chapter.startedAt) / CHAPTER_TIMING.returning) : 0;
    const center = new THREE.Vector3(0, (0.5 - mix(BOWL_HOME.y, 0.52, progress)) * viewport.height, 0);
    const smallScale = Math.min(viewport.width * 0.52, viewport.height * 0.20) / 3.04;
    const largeScale = Math.min(viewport.width * 0.78, viewport.height * 0.55) / 3.04;
    const bowlScale = mix(smallScale, largeScale, progress);
    const spin = Math.max(0, now - chapter.openedAt) * 0.00016;
    const assembledRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(mix(0.4, 0.48, progress), spin, 0));
    const avatarRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.48, Math.sin(now * 0.00022) * 0.24, 0));
    for (const part of parts) {
      const isBowl = part.id === 'bowl';
      const id = part.id as IngredientId;
      const placement = !isBowl ? chapter.reconstruction.placements[id] : undefined;
      const collected = isBowl || chapter.reconstruction.collected.includes(id);
    const settling = placement ? Math.min(1, Math.max(0, (now - placement.at) / CHAPTER_TIMING.reassembling)) ** 2 : 1;
      const held = chapter.reconstruction.held?.id === part.id;
      const point = held ? chapter.reconstruction.held! : collected && placement ? placement : isBowl ? BOWL_HOME : ingredientHome(id);
      const avatarScale = Math.min(viewport.width * 0.21 / Math.max(0.4, part.size.x), viewport.height * 0.064 / Math.max(0.4, part.size.y + part.size.z * 0.5));
      const avatarPosition = new THREE.Vector3((point.x - 0.5) * viewport.width, (0.5 - point.y) * viewport.height, held ? 4 : 0);
      avatarPosition.sub(part.center.clone().multiplyScalar(avatarScale).applyQuaternion(avatarRotation));
      const assembledPosition = center.clone().add(new THREE.Vector3(0, -0.75 * bowlScale, 0));
      if (collected) {
        part.object.position.copy(isBowl ? assembledPosition : avatarPosition.lerp(assembledPosition, settling));
        part.object.scale.setScalar(isBowl ? bowlScale : mix(avatarScale, bowlScale, settling));
        part.object.quaternion.copy(avatarRotation).slerp(assembledRotation, isBowl ? 1 : settling);
      } else {
        const amount = entering ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * (held ? 28 : 15));
        part.object.position.lerp(avatarPosition, amount);
        part.object.scale.lerp(new THREE.Vector3(avatarScale, avatarScale, avatarScale), amount);
        part.object.quaternion.slerp(avatarRotation, amount);
      }
      part.object.visible = true;
    }
    if (diagnostic.current && now - lastDiagnostic.current > 120) {
      diagnostic.current.dataset.framePhase = chapter.phase;
      diagnostic.current.dataset.reconstruction = JSON.stringify(parts.map((part) => ({
        id: part.id, collected: part.id === 'bowl' || chapter.reconstruction.collected.includes(part.id as IngredientId),
        held: chapter.reconstruction.held?.id === part.id,
        assembled: part.id === 'bowl' || !!chapter.reconstruction.placements[part.id as IngredientId]
          && now - chapter.reconstruction.placements[part.id as IngredientId]!.at >= CHAPTER_TIMING.reassembling,
      })));
      lastDiagnostic.current = now;
    }
  });

  return <group ref={root}><primitive object={model} dispose={null} /></group>;
}
