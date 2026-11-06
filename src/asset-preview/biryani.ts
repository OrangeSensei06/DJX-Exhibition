import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './biryani.css';
import modelURL from '../../Models/Biryani_Refined.glb?url';

// This inspector is deliberately isolated from the two-display application.
type Part = { name: string; label: string; explodeOffset: [number, number, number] };
type Manifest = { groups: Part[]; triangles: number; steam: { wispFiles: string[] } };
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#141a18');
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
scene.environmentIntensity = 0.55;
room.dispose(); pmrem.dispose();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 0.35; controls.maxDistance = 2.8;
controls.maxPolarAngle = Math.PI * 0.88;
controls.autoRotateSpeed = 0.6;
const ambient = new THREE.HemisphereLight('#fff2dc', '#27352a', 1.3);
scene.add(ambient);
const key = new THREE.DirectionalLight('#fff0d6', 3.0);
key.position.set(-0.4, 0.8, 0.5); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -0.7, right: 0.7, top: 1.2, bottom: -0.7, near: 0.01, far: 3 });
key.shadow.bias = -0.00015; key.shadow.normalBias = 0.001;
scene.add(key);
const rim = new THREE.DirectionalLight('#e3edff', 1.7);
rim.position.set(0.5, 0.5, -0.6); scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#141a18', roughness: 0.8 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = 0.017; floor.receiveShadow = true; scene.add(floor);
let model: THREE.Group | undefined;
let parts: { object: THREE.Object3D; offset: THREE.Vector3 }[] = [];
let separation = 0, targetSeparation = 0;
const steamRoot = new THREE.Group(); scene.add(steamRoot);
const wisps: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
let errorText: string | undefined;

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
function frameView() {
  const s = separation;
  const focus = new THREE.Vector3(innerWidth > 750 ? 0.065 : -0.02, 0.12 + s * 0.26, 0);
  controls.target.copy(focus);
  camera.position.set(0.46, 0.53 + s * 0.20, 0.76 + s * 0.65);
  controls.update();
}
function setAmount(value: number) {
  targetSeparation = value;
  get<HTMLInputElement>('separation').value = String(value);
  get<HTMLOutputElement>('amount').value = `${Math.round(value * 100)}%`;
}
get<HTMLInputElement>('separation').addEventListener('input', e => setAmount(Number((e.target as HTMLInputElement).value)));
get('assemble').onclick = () => setAmount(0);
get('explode').onclick = () => setAmount(1);
get('reset').onclick = () => { setAmount(0); separation = 0; frameView(); };
get<HTMLInputElement>('rotate').onchange = e => { controls.autoRotate = (e.target as HTMLInputElement).checked; };
addEventListener('resize', resize);
resize(); frameView();

async function load() {
  const manifest: Manifest = {
    groups: ['bowl', 'rice', 'saffron', 'protein', 'onions', 'herbs', 'spices'].map((name, i) => ({
      name, label: name[0].toUpperCase() + name.slice(1), explodeOffset: [0, [0, 0.9, 1.5, 2.1, 2.7, 3.3, 3.9][i], 0],
    })),
    triangles: 0,
    steam: { wispFiles: ['/textures/steam/steam_wisp_1.png', '/textures/steam/steam_wisp_2.png', '/textures/steam/steam_wisp_3.png'] },
  };
  const gltf = await new GLTFLoader().loadAsync(modelURL);
  model = gltf.scene;
  model.scale.setScalar(1 / 7.25);
  scene.add(model);
  model.traverse(o => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true; o.receiveShadow = true;
      manifest.triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    }
  });
  parts = manifest.groups.map(p => {
    const object = model!.getObjectByName(p.name);
    if (!object) throw new Error(`Missing ingredient group: ${p.name}`);
    const row = document.createElement('label'); row.className = 'ingredient';
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = true;
    check.onchange = () => { object.visible = check.checked; };
    const label = document.createElement('span'); label.textContent = p.label;
    row.append(check, label); get('ingredients').append(row);
    return { object, offset: new THREE.Vector3(...p.explodeOffset) };
  });
  const loader = new THREE.TextureLoader();
  for (let i = 0; i < 3; i++) {
    const texture = await loader.loadAsync(`.${manifest.steam.wispFiles[i]}`);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.35, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.23), material);
    plane.position.set((i - 1) * 0.06, 0.29, (i % 2) * 0.02);
    wisps.push(plane); steamRoot.add(plane);
  }
  get('status').textContent = `${manifest.groups.length} separate groups · ${Math.round(manifest.triangles / 1000)}k triangles · ${gltf.animations.length} authored clip · loaded locally`;
  // Expose a read-only diagnostic for runtime verification without changing app state.
  Object.assign(window, { biryaniDiagnostics: { groups: parts.map(p => p.object.name), animations: gltf.animations.map(a => ({ name: a.name, duration: a.duration })), triangles: manifest.triangles } });
}
load().catch(error => {
  errorText = error instanceof Error ? error.message : String(error);
  get('status').textContent = `Asset could not load: ${errorText}`;
  console.error(error);
});

const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05), time = timer.getElapsed();
  separation += (targetSeparation - separation) * (1 - Math.exp(-dt * 5));
  const smooth = separation * separation * (3 - 2 * separation);
  for (const p of parts) p.object.position.copy(p.offset).multiplyScalar(smooth);
  // Camera framing follows separation without changing the visitor's orbit direction.
  const desiredY = 0.12 + smooth * 0.26;
  const changeY = (desiredY - controls.target.y) * (1 - Math.exp(-dt * 4));
  controls.target.y += changeY; camera.position.y += changeY;
  const desiredDistance = 0.90 + smooth * 0.70;
  if (Math.abs(separation - targetSeparation) > 0.001) {
    const delta = camera.position.clone().sub(controls.target);
    delta.setLength(THREE.MathUtils.lerp(delta.length(), desiredDistance, 1 - Math.exp(-dt * 3)));
    camera.position.copy(controls.target).add(delta);
  }
  steamRoot.visible = get<HTMLInputElement>('steam').checked && separation < 0.4 && (model?.getObjectByName('rice')?.visible ?? false);
  wisps.forEach((p, i) => {
    p.quaternion.copy(camera.quaternion);
    p.position.y = 0.28 + Math.sin(time * 0.7 + i * 2) * 0.012;
    p.material.opacity = (0.20 + 0.10 * Math.sin(time * 0.9 + i * 2)) * (1 - separation / 0.4);
    p.scale.x = 1 + 0.1 * Math.sin(time + i);
  });
  controls.update(); renderer.render(scene, camera);
});
