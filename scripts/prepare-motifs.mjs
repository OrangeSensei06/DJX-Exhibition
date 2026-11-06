import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../public/motifs/', import.meta.url);
const source = readFileSync(new URL('original.html',root),'utf8');
const styles=source.match(/<style>([\s\S]*?)<\/style>/)[1];
let code=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
code=code.replace('Mughal artists drew inspiration from nature, especially flowers, leaves and flowing vines. These graceful motifs appeared in architecture, textiles and decorative arts. Over time, floral and vine patterns became a defining feature of Mughal design. Even today, similar motifs continue to inspire fashion, interiors and craft traditions.', 'Inspired by gardens, Mughal artists decorated buildings, textiles and manuscripts with flowers, leaves and flowing vines. Under Jahangir, botanical designs became more naturalistic, while Shah Jahan’s reign popularised elegant flowering-plant motifs. These patterns reflected nature, beauty and the symbolism of paradise gardens. Their artistic legacy continues to inspire contemporary textiles, interiors and decorative arts.');
// Import only the updated botanical textures; all other artwork stays original.
const visualSource=readFileSync(new URL('new-visuals.html',root),'utf8');
const newImages=JSON.parse(visualSource.match(/const IMG\s*=\s*(\{[^\n]+\})/)[1]);
const botanical=Object.fromEntries(['bud','lotus','vA','vB','bL','bR'].map(k=>[k,newImages[k]]));
code=code.replace('const {useState',`Object.assign(IMG,${JSON.stringify(botanical)});\nconst {useState`);
// Dense overlapping rows rise almost together, rather than as isolated stems.
code=code.replace('nP=Math.max(3,Math.round(innerWidth/innerHeight*10/3)+1)', 'nP=4');
code=code.replace('for(let r=0;r<2;r++)', 'for(let r=0;r<3;r++)');
code=code.replace('u:(i+.5)/nP+(Math.random()-.5)*.5/nP,h:8.8+Math.random()*2.4', 'u:(i+.5+(r-2)*.16)/nP+(Math.random()-.5)*.12/nP,h:11.8+Math.random()*1.2');
code=code.replace('d:Math.random()*.4', 'd:(r*2+Math.floor(i/2))*.2/6');
code=code.replace('(S.grow-v.d)/.55', '(S.grow-v.d)/.4');
code=code.replace('await T2(5.4,v=>S.grow=v,E.lin)', 'await T2(6,v=>S.grow=v,E.lin)');
code=code.replace('await sleep(.5)', 'await sleep(.25)');
code=code.replace('const bg=spr(gBg,tbg,0);', 'const bg=spr(gBg,tbg,0);const BA=asp(tbud),LA=asp(tlot);');
code=code.replace('f.bud.scale.set(b*.78,b,1)', 'f.bud.scale.set(b*BA,b,1)');
code=code.replace('f.lot.scale.set(l*1.1,l,1)', 'f.lot.scale.set(l*LA*1.25,l*1.25,1)');
code=code.replace('v.x0=v.side?v.side*(vw/2-w/2):(v.u-.5)*vw', 'const vis=Math.min(w,Math.max(vw*.3,1.8));v.x0=v.side?v.side*(vw/2+w/2-vis):(v.u-.5)*vw');
code=code.replace('u:0,txt:0}', 'u:0,txt:0,rejoin:0,clear:0,scrollFade:1}');
code=code.replace('async startChapter4(){', `async nextChapter(){if(!['SCROLL_READY','CONTENT_VISIBLE','BLOOM_OPTIONAL'].includes(ph))return;const g=++gen;P('EXIT_CENTER');document.getElementById('app').classList.add('departing');const oldU=S.u;await scatterWords(tx);if(g!==gen)return;S.txt=0;await T2(.75,v=>{S.u=oldU*(1-v);S.scrollFade=1-v});if(g!==gen)return;const oldPart=S.part;await T2(1.5,v=>{S.part=oldPart*(1-v);S.rejoin=v});if(g!==gen)return;P('EXIT_PAUSE');await sleep(.65);if(g!==gen)return;P('EXIT_CLEAR');await T2(2.2,v=>S.clear=v);if(g===gen)P('COMPLETE')},async startChapter4(){`);
code=code.replace('const api={',`async function scatterWords(root){root.classList.add('fly-text');const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);const spans=[];for(const node of nodes){const f=document.createDocumentFragment();for(const word of node.textContent.split(/(\\s+)/)){if(!word.trim()){f.appendChild(document.createTextNode(word));continue}const span=document.createElement('span');span.textContent=word;span.style.display='inline-block';f.appendChild(span);spans.push(span)}node.replaceWith(f)}await Promise.all(spans.map((span,i)=>span.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1,filter:'blur(0)'},{transform:'translate('+((i%2?1:-1)*(20+i%5*12))+'px,-50px) rotate('+(i%2?25:-25)+'deg)',opacity:.9,offset:.4},{transform:'translate('+((i%2?1:-1)*(130+i%7*24))+'px,-260px) rotate('+(i%2?100:-100)+'deg) scale(.25)',opacity:0,filter:'blur(5px)'}],{duration:900,delay:(i%16)*14,easing:'cubic-bezier(.3,0,.6,1)',fill:'forwards'}).finished))};const api={`);
code=code.replace('[paper,rT,rB].forEach(m=>m.material.opacity=so)', '[paper,rT,rB].forEach(m=>m.material.opacity=so*S.scrollFade)');
code=code.replace('u.uG.value=gi;' , 'u.uG.value=gi*(1-S.clear);');
code=code.replace('v.m.visible=gi>.002', 'v.m.position.x=v.m.position.x*(1-S.rejoin)+(v.side||0)*.25*S.rejoin;v.m.position.y=-5.4-S.clear*12;v.m.visible=gi>.002&&S.clear<1');
code=code.replace('R.render(sc,cam)', 'gSc.visible=S.rejoin<.8;gFl.visible=S.rejoin<.1;gCo.visible=false;R.render(sc,cam)');
code=code.replace('const {useState', "IMG.corner='./corner-updated.png';\nconst {useState");
code=code.replace('const cs=Math.min(vw*.5,3.4);corners.forEach', 'const cs=Math.min(vw*.5,3.4)*.7;corners.forEach');
// Keep all original artwork, shaders, layout, animation phases, timings and particles.
code=code.replace('const P=p=>{ph=p;setPh(p)}',"const P=p=>{ph=p;setPh(p);parent.postMessage({type:'motifs-status',phase:p,blooms:bl},location.origin)}");
code=code.replace('bl++;setBl(bl);',"bl++;setBl(bl);parent.postMessage({type:'motifs-status',phase:ph,blooms:bl},location.origin);");
// The audience display contains no controls. Setup commands replace the original row.
const row=code.indexOf(",\n    h('div',{className:'row'},");
const end=code.indexOf('\n}\nconst a_',row);
if(row<0||end<0)throw Error('Supplied Chapter 4 button row changed; inspect before adapting.');
code=code.slice(0,row)+');'+code.slice(end);
code=code.replace(/const kd=e=>\{[^\n]+\};/, 'const kd=()=>{};');
code=code.replace('const load=u=>new Promise(r=>new THREE.TextureLoader().load(u,r));', 'const load=u=>new Promise((resolve,reject)=>new THREE.TextureLoader().load(u,resolve,undefined,reject));');
code=code.replace('api.startChapter4();\n  });',"api.startChapter4();\n  }).catch(()=>{if(!dead)P('ERROR')});");
code=code.replace('dead=true;cancelAnimationFrame(raf);', 'dead=true;gen++;cancelAnimationFrame(raf);');
code=code.replace('R.dispose()}', 'sc.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{m.map?.dispose();Object.values(m.uniforms||{}).forEach(u=>{if(u.value?.isTexture)u.value.dispose()});m.dispose()})});R.dispose()}');
code+=`\naddEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='motifs-command')return;if(e.data.action==='open')window.chapter4?.next();if(e.data.action==='bloom')window.chapter4?.bloomFlowers()});
addEventListener('pagehide',()=>window.chapter4?.dispose());
addEventListener('error',()=>parent.postMessage({type:'motifs-status',phase:'ERROR',blooms:0},location.origin));`;
code+="addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='motifs-command'&&e.data.action==='next')window.chapter4?.nextChapter()});";
// Begin the original winding growth immediately, alongside the scene fade-in.
code=code.replace('await T2(2.6,v=>S.intro=v)', 'void T2(2.6,v=>S.intro=v)');
code=code.replace('await sleep(1.8)', 'await sleep(0)');
// Retain the original scroll dimensions and bring only its content nearer the top.
code=code.replace('top:(5-(pT-Hp*.2))*k', 'top:(5-(pT-Hp*.08))*k');
code=code.replace('height:Hp*.58*k', 'height:Hp*.84*k');
writeFileSync(new URL('animation.js',root),code);
writeFileSync(new URL('animation.css',root),styles+`\n.scr{background:rgba(255,245,217,.94);border:1px solid #b88e4f66;border-radius:12px;padding:28px 20px 18px;box-sizing:border-box;box-shadow:0 5px 22px #24160430}.scr.fly-text{overflow:visible}\n@font-face{font-family:'Cormorant Garamond';src:url('../fashion/dress/cormorant.ttf');font-weight:300 500}@font-face{font-family:Jost;src:url('../fashion/dress/jost.ttf');font-weight:300 400}.departing .ui>*{opacity:0!important;transition-delay:0s!important}`);
writeFileSync(new URL('index.html',root),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./animation.css"></head><body><div id="root"></div><script src="../architecture/vendor/react.min.js"></script><script src="../architecture/vendor/react-dom.min.js"></script><script src="../architecture/vendor/three-r128.min.js"></script><script src="./animation.js"></script></body></html>');
writeFileSync(new URL('animation.css',root), readFileSync(new URL('animation.css',root),'utf8')+'canvas{transform:translateY(4vh) scaleY(.94);transform-origin:center}'+"\n/* Keep the text entirely inside the parchment between the two scroll rollers.\n   The scene uses a 1080x1920 portrait canvas; override the old dynamic styles\n   so long historical copy cannot fall below the lower roller. */\n.scr{left:19.5%!important;top:16%!important;width:61%!important;height:64%!important;\n  max-height:64%!important;box-sizing:border-box;padding:22px 27px!important;\n  display:flex;flex-direction:column;justify-content:center;overflow:hidden!important;\n  font:400 27px/1.4 'Jost',sans-serif!important;text-align:center!important}\n.scr h3{font:500 37px/1.13 'Cormorant Garamond',serif!important;\n  margin:0 0 15px!important;flex:none;color:#7a1f2a}\n.scr p{font:400 26px/1.42 'Jost',sans-serif!important;margin:0!important;\n  overflow-wrap:break-word;hyphens:auto}\n.scr.fly-text{overflow:visible!important}\n");
