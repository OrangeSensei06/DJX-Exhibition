# Mughal Times — Biryani 3D model

## Contents

- `Mughal_Times_Biryani.glb`: assembled 3D biryani model for use in a GLB-capable renderer/importer
- `Mughal_Times_Biryani_Explode_Offsets.json`: original height offsets for ingredient-explosion animation
- `extract_biryani.py`: reproducible model generator based on `mughal-times.html`

## Source and reconstruction

Extracted from the procedural Three.js geometry definitions in the supplied `mughal-times.html` (bowl profile, torus rim, instanced meshes for rice, saffron, protein, onions, herbs, and spices, with materials). The page does **not** embed an existing GLB/FBX/OBJ file; its 3D model is created in JavaScript at runtime. This GLB is a rebuild of that source geometry, with a fixed pseudorandom seed to generate the original-style ingredient placement.

The HTML generated grain transforms using `Math.random()` without a seed, so individual pieces will differ from any particular live browser rendering. Counts, shape parameters, approximate distribution, colors, roughness, metalness and material grouping follow the source.

## Scene hierarchy

```
Biryani
├── bowl
│   ├── Copper_Bowl
│   └── Gold_Rim
├── rice
│   └── Basmati_Rice_1500
├── saffron
│   └── Saffron_Rice_520
├── protein
│   ├── Meat_Pieces_11
│   └── Vegetable_Pieces_6
├── onions
│   └── Fried_Onion_Pieces_90
├── herbs
│   └── Mint_Coriander_55
└── spices
    ├── Whole_Spices_16
    └── Cashews_16
```

All ingredient transforms are baked within meshes for wide compatibility, but each logical ingredient *group* is an independent node. For explode animation, translate the seven group nodes on local Y using the JSON offsets (optionally multiplied by a transition progress from 0 to 1).

## Import & use

- **Three.js:** Load using `GLTFLoader`. The imported `gltf.scene` contains child nodes with the hierarchy above. Animate `getObjectByName('rice').position.y`, etc. The source's explode effect uses the offsets in JSON.
- **Blender:** File → Import → glTF 2.0 (`.glb/.gltf`). Groups become node/empty hierarchy; individual materials can be edited.
- **Unity:** Use a glTF importer such as *glTFast* to import GLB. The model is Y-up and group nodes can be animated separately.

## Exclusions

The source's procedural steam is a sprite effect, dust particles are a shader-like point system, and the object dragging, camera/hand tracking, screen synchronization and explosions are application logic. They are **not** animations built into the GLB. Recreate them in the exhibition application. There are no image textures in the source model; the colors are PBR material factors.

## Intended Windows project location

`Z:\Projects\DJX-Exhibition\Models\Mughal_Times_Biryani.glb`

For convenience, the distribution ZIP places the GLB under `Models/`. Extract the archive to `Z:\Projects\DJX-Exhibition\` to position it automatically.
