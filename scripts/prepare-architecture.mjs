import { readFileSync, writeFileSync } from 'node:fs';
// Preserve the supplied animation, including its optimized embedded textures.
const source = readFileSync(new URL('../public/architecture/gate-v2.html', import.meta.url), 'utf8');
const dir = new URL('../public/architecture/', import.meta.url);
const styles = source.match(/<style>([\s\S]*?)<\/style>/)[1];
const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let animation = scripts.join('\n');
animation=animation.replace('boost:0}', 'boost:0,fold:0}');
animation=animation.replace('async enter(){', `async nextChapter(){if(busy||!['idle','inside'].includes(ph))return;busy=true;P('folding');document.getElementById('app').classList.add('departing');await tw(1.35,t=>S.fold=t);if(!dead)P('complete')},async enter(){`);
animation=animation.replace('sc.add(jal);', `sc.add(jal);const destination=new THREE.Group();destination.position.set(0,jc-Hj/2,-dJ);sc.add(destination);[jal,sun,back,shim].forEach(m=>{m.position.y-=destination.position.y;m.position.z+=dJ;destination.add(m)});`);
animation=animation.replace('sun.position.y=jc-.05*Hj+M.y*.03*w;', 'sun.position.y=Hj*.45+M.y*.03*w;');
animation=animation.replace('g.rotation.x=-(1-a)*1.5;', 'g.rotation.x=-(1-a)*1.5-S.fold*1.5;destination.rotation.x=-S.fold*1.5;destination.scale.setScalar(1-S.fold*.12);');
animation=animation.replace('const fade=clamp((z-.3)/2.5)', 'const fade=clamp((z-.3)/2.5)*(1-S.fold)');
animation=animation.replace('m.material.opacity=jo)', 'm.material.opacity=jo*(1-S.fold))');
animation=animation.replace('shim.material.opacity=jo*', 'shim.material.opacity=(1-S.fold)*jo*');
animation=animation.replace('cor.material.opacity=clamp((a-.5)*2)*cr;', 'cor.material.opacity=clamp((a-.5)*2)*cr*(1-S.fold);');
// Use the supplied matching set. V2 splits the complete double door at its seam
// and aligns both hinges and the passage with this arch's actual opening.
animation = animation.replace('const {useState', "Object.assign(IMG,{arch:'./arch-v2.png',door:'./doors-v2.png',corr:'./passage-v2.png'});\nconst {useState");
// The rectangular colour backing leaked outside the transparent arched sunset.
animation = animation.replace('sc.add(back);', 'back.visible=false;sc.add(back);');
// Clip the sunset plane itself: its embedded texture has opaque square shoulders.
animation = animation.replace('sc.add(sun);', `{
 const w=sun.geometry.parameters.width,h=sun.geometry.parameters.height;
 const arch=new THREE.Shape();arch.moveTo(-w/2,-h/2);arch.lineTo(w/2,-h/2);arch.lineTo(w/2,h*.04);
 arch.bezierCurveTo(w/2,h*.25,w*.18,h*.34,0,h/2);
 arch.bezierCurveTo(-w*.18,h*.34,-w/2,h*.25,-w/2,h*.04);arch.closePath();
 const geometry=new THREE.ShapeGeometry(arch,48),p=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);
 sun.geometry.dispose();sun.geometry=geometry;
 }sc.add(sun);`);
// Shorten the camera travel and the pause while retaining the original easing.
animation = animation.replace('await tw(4.6,t=>S.enter=t)', 'await tw(2.4,t=>S.enter=t)');
animation = animation.replace('await tw(.9,t=>S.boost=t,E.lin)', 'await tw(.15,t=>S.boost=t,E.lin)');
animation = animation.replace("const P=p=>{ph=p;setPh(p)}", "const P=p=>{ph=p;setPh(p);parent.postMessage({type:'architecture-phase',phase:p},location.origin)}");
animation = animation.replace('api.current=init(cv.current,fl.current,setPh);', 'api.current=init(cv.current,fl.current,setPh);window.archApi=api.current;');
animation = animation.replace('const load=u=>new Promise(r=>', 'const load=u=>new Promise((r,reject)=>');
animation = animation.replace('t.anisotropy=8;r(t)}));', "t.anisotropy=8;r(t)},undefined,reject));");
animation = animation.replace("if(!dead)P('idle')});\n  });", "if(!dead)P('idle')});\n  }).catch(()=>{if(!dead)P('error')});");
animation = animation.replace("const titled=!['load','rise'].includes(ph),inside=ph==='inside';", "const titled=!['load','rise','opening','entering','leaving'].includes(ph),inside=ph==='inside';");
animation = animation.replace("h('canvas',{ref:cv}),", "h('canvas',{ref:cv}),...['tl','tr','bl','br'].map(c=>h('div',{key:c,className:'arch-corner '+c},h('img',{src:'./figma/vertical-imgFirefly1.png',alt:''}))),");
animation = animation.replace("h('div',{className:on('body',inside),style:{transitionDelay:inside?'.6s':'0s'}},'Cut from a single slab of sandstone, the jali turns harsh sun into patterned light. It symbolised grace and privacy in Mughal courts, and today its geometry lives on in festive and modern Indian design.')", "h('div',{className:on('body',titled),style:{transitionDelay:'.6s'}},inside?'Jali is a traditional perforated screen refined by Mughal artisans through intricate stone craftsmanship. Its geometric and floral patterns provided privacy, shade and natural ventilation. Today, jali-inspired designs continue to appear in modern windows, partitions and building façades.':'Arches existed in Indian architecture before the Mughals, but became a defining feature of their grand buildings. Blending Persian, Central Asian and Indian influences, Mughal architects developed elegant pointed and curved archways. These architectural forms continue to influence modern doorways, corridors and building entrances.')");
// Retain the outgoing paragraph until it has fully faded; swap only while hidden.
animation = animation.replace("const on=(c,k)=>c+(k?' show':'');", "const [copyInside,setCopyInside]=useState(false);useEffect(()=>{if(!['idle','inside'].includes(ph))return;const timer=setTimeout(()=>setCopyInside(ph==='inside'),400);return()=>clearTimeout(timer)},[ph]);const on=(c,k)=>c+(k?' show':'');");
animation = animation.replace("className:on('body',titled)", "className:on('body',titled&&copyInside===inside)");
animation = animation.replace("},inside?'Jali is", "},copyInside?'Jali is");
// Keep original timings and camera math; release every WebGL resource on teardown.
animation = animation.replace('R.dispose()}', 'sc.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{m.map?.dispose();m.dispose()})});R.dispose()}');
animation += `\naddEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='architecture-command')return;if(e.data.action==='open')window.archApi?.enter();if(e.data.action==='return')window.archApi?.leave()});\naddEventListener('pagehide',()=>window.archApi?.dispose());\naddEventListener('error',e=>parent.postMessage({type:'architecture-phase',phase:'error',message:e.message},location.origin));\n`;
animation += "addEventListener('keydown',e=>{if(e.repeat)return;const action={o:'open',p:'return',r:'reset'}[e.key.toLowerCase()];if(action)parent.postMessage({type:'architecture-request',action},location.origin)});";
animation += "addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='architecture-command'&&e.data.action==='next')window.archApi?.nextChapter()});";
writeFileSync(new URL('animation.js',dir), animation);
writeFileSync(new URL('animation.css',dir), styles + '\n' + readFileSync(new URL('../src/architecture/animation-layout.css',import.meta.url),'utf8')+'\n.arch-corner,.btn{display:none!important}');
writeFileSync(new URL('index.html',dir), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./animation.css"></head><body><div id="root"></div><script src="./vendor/react.min.js"></script><script src="./vendor/react-dom.min.js"></script><script src="./vendor/three-r128.min.js"></script><script src="./animation.js"></script></body></html>');

// Figma vertical layout refinements.
writeFileSync(new URL('animation.css',dir), readFileSync(new URL('animation.css',dir),'utf8')+".ui h1{top:10.469%}.ui .rule{top:16.927%}.ui .sub{top:18.021%;left:6.667%;width:86.666%}.ui .body{top:29.27%}");
