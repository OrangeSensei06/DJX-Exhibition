import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('the refined GLB preserves the chapter layers and embedded PBR resource budgets', () => {
  const bytes = readFileSync(resolve('Models/Biryani_Refined.glb'));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const names = new Set(gltf.nodes.map((node: { name: string }) => node.name));
  const offsets = JSON.parse(readFileSync(resolve('Models/Mughal_Times_Biryani_Explode_Offsets.json'), 'utf8')).offsets;
  for (const name of ['bowl', 'rice', 'saffron', 'protein', 'onions', 'herbs', 'spices']) {
    assert.ok(names.has(name), `Missing ${name}`);
    assert.ok(Number.isFinite(offsets[name]), `Missing offset for ${name}`);
  }
  assert.equal(offsets.bowl, 0);
  assert.ok(names.has('Biryani_Root'));
  assert.ok(names.has('Cashews_16'), 'Reconstruction must still find the cashews');
  assert.ok(bytes.length < 8_000_000, 'Keep the complete textured model under 8 MB');
  assert.ok(gltf.materials.length <= 5);
  assert.equal(gltf.images.length, 6);
  for (const image of gltf.images) {
    assert.equal(typeof image.bufferView, 'number', 'Every texture must be embedded');
    assert.equal(image.uri, undefined);
  }
  let triangles = 0, primitives = 0;
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    triangles += gltf.accessors[primitive.indices].count / 3;
    primitives++;
  }
  assert.ok(triangles <= 75_000);
  assert.ok(primitives <= 15);
  for (const material of gltf.materials) {
    assert.ok(material.normalTexture);
    assert.ok(material.pbrMetallicRoughness.baseColorTexture);
    assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture);
    assert.equal(material.occlusionTexture.texCoord, 1);
    assert.notEqual(material.alphaMode, 'BLEND');
  }
});
