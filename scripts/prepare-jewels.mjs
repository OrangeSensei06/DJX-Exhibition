import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../public/jewels/',import.meta.url);
const source=readFileSync(new URL('original.html',root),'utf8');
let code=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
code=code.replace('Lotus Crown of Emerald','Lotus-Inspired Head Ornament');
code=code.replace('More than precious stones, these jewels told stories of identity, status and the artistry of an empire.', 'Digital artistic interpretations inspired by Mughal and historical Indian jewellery traditions.');
code=code.replace('The haathphool, or “hand flower”, links a wristband to finger rings with delicate chains. Mughal-era workshops excelled at the gold, enamel and gem-setting such pieces demand; this Mughal-inspired design reimagines a form far older than the empire.', 'Haathphool, meaning “hand flower,” is a traditional ornament connecting a wristpiece to finger rings through delicate chains. Its origins predate the Mughal Empire, but elaborate examples continued to flourish in later Indian jewellery traditions. Gold, rubies, emeralds and floral designs reflect the craftsmanship admired in Mughal-era jewellery. Today, Haathphool remains a cherished accessory in bridal and festive fashion.');
code=code.replace('Strands of pearls and ruby beads cascade from jewelled shoulder plates in this Mughal-inspired piece. At the Mughal court, pearls, rubies and emeralds were worn as visible marks of rank, wealth and royal favour.', 'Pearls, gemstones and elaborate jewellery symbolised wealth and status in the Mughal court. Royal adornments often featured luxurious strands of pearls and precious stones. Inspired by this tradition, these jewelled shoulder drapes reinterpret courtly ornamentation through intricate designs and cascading beadwork. The design celebrates the artistry and grandeur of historical Indian jewellery.');
code=code.replace('Gold, pearls and kundan-set stones gather into a lotus-crowned head ornament. Kundan and enamel work flourished under Mughal patronage, blending Persian, Central Asian and older Indian traditions in jewels like this inspired reimagining.', 'Ornate head jewellery was an important part of royal adornment across Indian courts, including the Mughal period. Gold, pearls and precious gemstones were crafted into intricate floral designs. This lotus-inspired ornament reimagines the elegance of traditional Indian head jewellery through Mughal-influenced craftsmanship. Today, similar floral ornaments continue to adorn ceremonial and bridal fashion.');
let styles=source.match(/<style>([\s\S]*?)<\/style>/)[1];
const replace=(from,to)=>{if(!code.includes(from))throw Error('Chapter 5 source changed: '+from.slice(0,70));code=code.replace(from,to)};
replace('const {useState',"Object.assign(IMG,{bg:'./background.png',corner:'./corner.png',haath:'./ghost-set.png',head:'./ghost-set.png',shoulder:'./shoulder-silhouette.png'});\nconst {useState");
code=code.replace("INTERACTION DISPLAY · SCREEN 05",'');
// Crop the hand and head thirds through texture UVs, preserving original alpha.
replace('texs.forEach(t=>{t.anisotropy=R.capabilities.getMaxAnisotropy()});',"texs.forEach((t,i)=>{t.anisotropy=R.capabilities.getMaxAnisotropy();if(i===0||i===2){const x=i===0?0:.5,w=.5;t.repeat.set(w,1);t.offset.set(x,0);t.userData={cropAspect:t.image.width*w/t.image.height}}});");
replace('const asp=t=>t.image.width/t.image.height;', 'const asp=t=>t.userData?.cropAspect||t.image.width/t.image.height;');
replace('const load=u=>new Promise(r=>new THREE.TextureLoader().load(u,r));','const load=u=>new Promise((resolve,reject)=>new THREE.TextureLoader().load(u,resolve,undefined,reject));');
replace('async startChapter5(){',`async reverseChapter5(){if(ph!=='READY')return;const g=++gen;queued=0;ph='LOWER';cb.onPhase(ph);cb.onText(cur,false);document.getElementById('stage').classList.add('departing');await tw(.35,()=>{});if(g!==gen)return;await tw(1.5,v=>{if(g===gen)S.drop=v},E.io);if(g!==gen)return;ph='COMPLETE';cb.onPhase(ph)},async startChapter5(){`);
replace('const S={intro:0,orb:0,rot:0,phi:0,dir:1,v:0}', 'const S={intro:0,orb:0,rot:0,phi:0,dir:1,v:0,drop:0}');

replace("await T(1.6,v=>S.orb=v,E.io);", "ph='SPREAD';cb.onPhase(ph);await T(1.6,v=>S.orb=v,E.io);");
replace("if(i===0&&S.intro<1&&S.phi===0){const e=E.out(S.intro);s*=.8+.2*e;o=e;y-=.5*(1-e)}",`const spread=E.io(S.orb),rise=E.io(S.intro);const cx=(i-1)*1.25,cy=(i===1?.45:-.3);x=cx*(1-spread)+q.x*spread;y=cy*(1-spread)+q.y*spread-14*(1-rise);z=q.z*spread;s=.36*(1-spread)+q.s*spread;o=rise*((1-spread)+q.o*spread);`);
replace('p.m.position.set(x,y+bob,z);',"if(S.drop>0){if(i===cur){y-=16*S.drop;o*=1-S.drop*.8}else{o=0}}p.m.position.set(x,y+bob,z);");
replace('SP.aA[i]=(.25+SP.aP[i]*.6)*S.intro','SP.aA[i]=0');
replace('const meta=PIECES[front],settle=', 'const meta=PIECES[front],settle=(1-S.drop)*');
replace('*(1-.3*S.rot);glow.renderOrder', '*(1-.3*S.rot)*(1-S.drop)*.4;glow.renderOrder');
replace('cb.onPhase(ph);cb.onText(cur,true);','cb.onPhase(ph);cb.onText(cur,true);');
replace('p.m.material.color.setScalar(q.c);','p.m.material.color.setScalar(1+(q.c-1)*spread);');
replace('dead=true;cancelAnimationFrame(raf);removeEventListener(\'resize\',lay);R.dispose()',"dead=true;gen++;cancelAnimationFrame(raf);removeEventListener('resize',lay);observer?.disconnect();sc.traverse(o=>{o.geometry?.dispose();const m=o.material;if(m){m.map?.dispose();m.dispose()}});glowTex.dispose();starTex.dispose();R.dispose()");
replace("let dead=false,raf,gen=0", "let observer;let dead=false,raf,gen=0");
replace('if(window.ResizeObserver)new ResizeObserver(lay).observe(wrap);','if(window.ResizeObserver){observer=new ResizeObserver(lay);observer.observe(wrap)}');
replace('api.startChapter5();\n  });',"api.startChapter5();\n  }).catch(()=>{if(!dead)cb.onPhase('ERROR')});");
replace('onPhase:setPh',"onPhase:p=>{setPh(p);parent.postMessage({type:'jewels-status',phase:p},location.origin)}");
const start=code.indexOf('    const kd=e=>'),end=code.indexOf('    const ev=e=>',start);
if(start<0||end<0)throw Error('Chapter 5 keyboard hook missing');
code=code.slice(0,start)+'    const kd=()=>{};\n'+code.slice(end);
code+=`\naddEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='jewels-command')return;const a=window.chapter5;if(e.data.action==='left'||e.data.action==='right')a?.rotateJewellery(e.data.action);if(e.data.action==='reverse')a?.reverseChapter5()});addEventListener('pagehide',()=>window.chapter5?.dispose());`;
styles+=`\n@font-face{font-family:'Cormorant Garamond';src:url('../fashion/dress/cormorant.ttf');font-weight:300 500}@font-face{font-family:Jost;src:url('../fashion/dress/jost.ttf');font-weight:300 400}.departing .hd>*,.departing .pager,.departing .info>*{opacity:0!important;transition-delay:0s!important}`;
code+=`
(()=>{let dead=false,raf=0;const boot=()=>{const stage=document.getElementById('stage');if(!stage){raf=requestAnimationFrame(boot);return}const canvas=document.createElement('canvas');canvas.id='full-glitter';stage.prepend(canvas);const ctx=canvas.getContext('2d'),points=Array.from({length:140},()=>({x:Math.random(),y:1+Math.random()*.3,r:1+Math.random()*3,p:Math.random()*6.28}));const loop=t=>{if(dead)return;raf=requestAnimationFrame(loop);const w=stage.clientWidth,h=stage.clientHeight;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.clearRect(0,0,w,h);for(const p of points){p.y-=.0011;if(p.y<0)p.y=1;const a=.25+.5*(.5+.5*Math.sin(t*.0012+p.p));ctx.fillStyle='rgba(255,216,140,'+a+')';ctx.shadowColor='#ffd389';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x*w,p.y*h,p.r,0,Math.PI*2);ctx.fill()}};raf=requestAnimationFrame(loop)};boot();addEventListener('pagehide',()=>{dead=true;cancelAnimationFrame(raf)})})();`;
writeFileSync(new URL('animation.js',root),code);
writeFileSync(new URL('animation.css',root),styles+'\n.corner{display:none!important}html,body,#root,#stage{background-color:#30080e}#wrap{mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent)}#full-glitter{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}');
writeFileSync(new URL('index.html',root),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./animation.css"></head><body><div id="root"></div><script src="../architecture/vendor/react.min.js"></script><script src="../architecture/vendor/react-dom.min.js"></script><script src="../architecture/vendor/three-r128.min.js"></script><script src="./animation.js"></script></body></html>');

// Figma vertical layout refinements.
writeFileSync(new URL('animation.css',root), readFileSync(new URL('animation.css',root),'utf8')+".chap{top:calc(167*var(--u))}.sub{top:calc(418*var(--u));font-size:calc(26*var(--u))}");
writeFileSync(new URL('animation.css',root), readFileSync(new URL('animation.css',root),'utf8')+'h1{top:calc(229*var(--u));font-size:calc(104*var(--u));line-height:.92}.rule{top:calc(374*var(--u))}');
