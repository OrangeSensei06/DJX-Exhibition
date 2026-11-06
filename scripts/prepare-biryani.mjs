import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../public/biryani-scene/',import.meta.url),html=readFileSync(new URL('original.html',root),'utf8');
let code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
const replace=(a,b)=>{if(!code.includes(a))throw Error('Chapter 1 hook missing: '+a.slice(0,60));code=code.replace(a,b)};
replace('const P=p=>{ph=p;setPh(p)}',"const P=p=>{ph=p;setPh(p);if(!dead)parent.postMessage({type:'biryani-status',phase:p},location.origin)}");
replace('const bH=bowlE.userData.asp*BW', 'hero.userData.asp/=1.15;mound.userData.asp/=1.15;sz(hero,1);sz(mound,1);const bH=bowlE.userData.asp*BW');
// Keep list thumbnails at their displayed sizes as they fill the bowl.
replace('sk=lerp(thumb,.3,q)', 'sk=thumb');
replace('[0,y+.15],q)', '[(k%3-1)*.34,y+.22+Math.floor(k/3)*.16],q)');
replace('o*=lerp(1,.3,cl((S.rt-.82)/.18))*(1-S.mk)', 'o*=1-S.mk');
replace('sk=lerp(.8,.3,q)', 'sk=.8');
replace('[0,y+.2],q)', '[.18,y+.28],q)');
replace('o=lerp(1,.3,cl((S.rt-.82)/.18))*(1-S.mk)', 'o=1-S.mk');
// Leave time to see the full-sized ingredients packed together before the hero crossfade.
replace('await to(S,{mk:1,duration:.9', 'await to(S,{rt:1,duration:.8});await to(S,{mk:1,duration:.9');
replace("cv.onclick=()=>{if(ph==='IDLE'||ph==='STACKED')api.next()};",'cv.onclick=null;');
replace("const kd=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();a.next()}else if(e.code==='KeyR')a.reset()};",'const kd=()=>{};');
replace('gsap.delayedCall(1.8,()=>setRows(true))','gsap.delayedCall(1.8,()=>{if(!dead)setRows(true)})');
replace("dispose(){dead=true;cancelAnimationFrame(raf);removeEventListener('resize',lay);R.dispose()}","dispose(){dead=true;gsap.killTweensOf(S);cancelAnimationFrame(raf);removeEventListener('resize',lay);sc.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.dispose()}});Object.values(T).forEach(t=>t.dispose());R.dispose()}");
replace("Promise.all(Object.keys(A).map(k=>new Promise(r=>new THREE.TextureLoader().load(A[k],t=>{T[k]=t;r()}))))", "Promise.all(Object.keys(A).map(k=>new Promise((r,j)=>new THREE.TextureLoader().load(A[k],t=>{T[k]=t;r()},undefined,j))))");
replace('loop();api.startChapter1();\n  });',"loop();api.startChapter1();\n  }).catch(()=>{if(!dead)P('ERROR')});");
replace('in:1,duration:2.4', 'in:1,duration:.95');
code+=`\naddEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='biryani-command')return;const a=window.chapter1;if(e.data.action==='explode')a?.explode();if(e.data.action==='list')a?.sweepToList();if(e.data.action==='next')a?.nextChapter()});addEventListener('pagehide',()=>window.chapter1?.dispose());`;
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1]+`\n@font-face{font-family:Newsreader;src:url('../fashion/dress/cormorant.ttf');font-weight:300 500}@font-face{font-family:Jost;src:url('../fashion/dress/jost.ttf');font-weight:300 400}html,body,#root,#app{background:#521018!important;--mut:#dbc6ac;--ink:#f4ead6}.row.on{transform:translateY(-50%)!important}.btn,.pg,.pr{display:none!important}canvas{cursor:default}`;
writeFileSync(new URL('animation.js',root),code);writeFileSync(new URL('animation.css',root),css+'\n.hd h1{max-width:80%;margin-left:auto;margin-right:auto;font-size:clamp(30px,4.6vh,88px)}');
writeFileSync(new URL('index.html',root),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="animation.css"></head><body><div id="root"></div><script src="../architecture/vendor/react.min.js"></script><script src="../architecture/vendor/react-dom.min.js"></script><script src="../architecture/vendor/three-r128.min.js"></script><script src="../architecture/vendor/gsap.min.js"></script><script src="animation.js"></script></body></html>');

writeFileSync(new URL('animation.css',root),readFileSync(new URL('animation.css',root),'utf8')+' .final-list-heading{top:1.8vh} .final-list-heading h1{margin-top:.7vh}');
