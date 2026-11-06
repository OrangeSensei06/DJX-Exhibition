import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import url from '../Biryani_Refined.glb?url';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1200, 1000);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#101f28');
const camera = new THREE.PerspectiveCamera(35, 1.2, .01, 100);
const room = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
const env = pmrem.fromScene(room, .05);scene.environment = env.texture;scene.environmentIntensity = .6;
room.dispose();pmrem.dispose();
const key = new THREE.DirectionalLight('#ffe2b5', 3);key.position.set(-3, 6, 4);scene.add(key);
const fill = new THREE.DirectionalLight('#b7d6ff', 1.5);fill.position.set(4, 2, -3);scene.add(fill);
scene.add(new THREE.HemisphereLight('#fff4e2', '#12262e', .5));

async function main() {
  const gltf = await new GLTFLoader().loadAsync(url);const model = gltf.scene;scene.add(model);
  const names = ['bowl', 'rice', 'saffron', 'protein', 'onions', 'herbs', 'spices'];
  const parts = names.map(name => { const part=model.getObjectByName(name);if(!part)throw new Error(`Missing ${name}`);return part; });
  const materials = new Set<THREE.MeshStandardMaterial>();let triangles=0;const textures = new Set<THREE.Texture>();
  model.traverse(o => {if (o instanceof THREE.Mesh) {
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count)/3;
    for (const mat of (Array.isArray(o.material)?o.material:[o.material])) {
      materials.add(mat);
      for(const key of ['map','normalMap','aoMap','roughnessMap','metalnessMap'] as const) {
        if(!mat[key]?.image)throw new Error(`${mat.name}: missing ${key}`);textures.add(mat[key]);
      }
      if(mat.aoMap.channel!==1)throw new Error('AO must use the independent ContactUV atlas');
      if(mat.transparent)throw new Error('Unexpected alpha blending');
    }
  }});
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
  if(size.x<2.8||size.x>3.3||size.y<1||size.y>2)throw new Error(`Unexpected exhibition scale: ${size.toArray()}`);
  function render(exploded=false,reverse=false) {
    parts.forEach((p,i)=>p.position.y=[0,.9,1.5,2.1,2.7,3.3,3.9][i]*(exploded?1:0));
    camera.position.set(reverse?-5:4,exploded?7:4.5,reverse?-6:6.5);camera.lookAt(0,exploded?2.8:.8,0);
    if(exploded)camera.position.multiplyScalar(1.4);
    renderer.info.reset();renderer.render(scene,camera);
    return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  }
  const assembled=render();const exploded=render(true);const rear=render(false,true);render();
  if(assembled.drawCalls!==8||assembled.triangles!==triangles)throw new Error('Unexpected model rendering overhead');
  const raycaster=new THREE.Raycaster();
  const selectable=parts.map(p=>{
    let hit=false;
    p.traverse(o=>{
      if(hit||!(o instanceof THREE.Mesh))return;
      const geometry=o.geometry,position=geometry.attributes.position,index=geometry.index;
      for(let i=0;i<(index?.count??position.count);i+=3){
        const points=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(position,index?index.getX(i+k):i+k).applyMatrix4(o.matrixWorld));
        const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
        if(normal.lengthSq()<1e-14)continue;normal.normalize();
        const center=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);
        raycaster.set(center.clone().addScaledVector(normal,.1),normal.negate());
        hit=raycaster.intersectObject(p,true).length>0;break;
      }
    });return hit;
  });
  if(selectable.some(v=>!v))throw new Error(`Raycast failed: ${selectable}`);
  const report={passed:true,groups:names,assembled,exploded,rear,triangles,materials:materials.size,
    textureBindings:textures.size,textures:[...textures].map(t=>({name:t.name,width:t.image.width,height:t.image.height,channel:t.channel})),
    size:size.toArray(),selectable,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER)};
  Object.assign(window,{qaReport:report,qaRender:render});
}
main().catch(error=>{console.error(error);Object.assign(window,{qaError:String(error)});});
