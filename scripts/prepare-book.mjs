import {readFileSync,writeFileSync,statSync} from 'node:fs';
const dir=new URL('../src/book/design/',import.meta.url);
const assets=JSON.parse(readFileSync(new URL('../public/book/asset-manifest.json',import.meta.url),'utf8'));
for(const asset of assets)if(!statSync(new URL('../public/book/'+asset.file,import.meta.url)).size)throw Error('Empty book asset: '+asset.file);
const fixed={absolute:'position:absolute',relative:'position:relative',contents:'display:contents',block:'display:block',flex:'display:flex','flex-none':'flex:none','size-full':'width:100%;height:100%','w-full':'width:100%','max-w-none':'max-width:none','items-center':'align-items:center','justify-center':'justify-content:center','overflow-hidden':'overflow:hidden','overflow-clip':'overflow:clip','pointer-events-none':'pointer-events:none','font-bold':'font-weight:700','font-normal':'font-weight:400','not-italic':'font-style:normal','text-white':'color:white','text-center':'text-align:center','text-right':'text-align:right','whitespace-nowrap':'white-space:nowrap','whitespace-pre':'white-space:pre',uppercase:'text-transform:uppercase','mb-0':'margin-bottom:0','object-cover':'object-fit:cover','[word-break:break-word]':'overflow-wrap:break-word','mask-alpha':'mask-mode:alpha','mask-intersect':'mask-composite:intersect','mask-no-clip':'mask-clip:no-clip','mask-no-repeat':'mask-repeat:no-repeat','-rotate-90':'rotate:-90deg','-translate-x-1/2':'translate:-50% 0','-translate-y-1/2':'translate:0 -50%'};
function css(token){
 if(token==='whitespace-pre-wrap')return 'white-space:pre-wrap';
 if(/^\-rotate-\d+$/.test(token))return 'rotate:-'+token.split('-').pop()+'deg';
 if(fixed[token])return fixed[token];
 const font=token.match(/^font-\['([^:]+):([^']+)'\]$/);if(font)return `font-family:'${font[1].replaceAll('_',' ')}';font-weight:${font[2]==='Bold'?700:400}`;
 const opacity=token.match(/^opacity-(\d+)$/);if(opacity)return `opacity:${Number(opacity[1])/100}`;
 const m=token.match(/^(inset|left|right|top|bottom|w|h|size|aspect|leading|text|bg|rotate|skew-x|mask-position|mask-size)-\[(.*)\]$/);
 if(m){const prop=m[1],v=m[2].replaceAll('_',' ').replace(/calc\(([^)]+)\)/g,(_,x)=>`calc(${x.replaceAll('+',' + ')})`);const map={w:'width',h:'height',aspect:'aspect-ratio',leading:'line-height',bg:'background',rotate:'rotate','skew-x':'transform','mask-position':'mask-position','mask-size':'mask-size'};if(prop==='size')return `width:${v};height:${v}`;if(prop==='text')return `${v.startsWith('#')||v.startsWith('rgba')?'color':'font-size'}:${v}`;return `${map[prop]||prop}:${prop==='aspect'?v.replace('/', ' / '):prop==='skew-x'?`skewX(${v})`:v}`;}
 const short=token.match(/^(left|right|top|bottom|inset)-(0|1\/2|1\/4|3\/4)$/);if(short)return `${short[1]}:${{'0':'0','1/2':'50%','1/4':'25%','3/4':'75%'}[short[2]]}`;
 throw Error('Unhandled Figma style '+token);
}
let styles=`.spread-art{position:relative;width:1920px;height:1200px;overflow:hidden;isolation:isolate;color:#e7d3b0;font-family:Poppins,sans-serif;line-height:normal}.spread-art *{box-sizing:border-box}.spread-art p{margin:0;letter-spacing:normal}.spread-art img{display:block}.spread-art [data-name="Spine"]{display:none}\n`;
const layerRegistry={};
for(let n=1;n<=5;n++){
 let code=readFileSync(new URL(`chapter${n}.source.txt`,dir),'utf8');
 for(const a of assets.filter(a=>a.chapter===n))code=code.replaceAll(a.url,`./book/${a.file}`);
 // The artboards carry copied chapter labels. Display the actual sequence.
 code=code.replace(/CHAPTER 02/g,`CHAPTER ${String(n).padStart(2,'0')}`);
 code=code.replace(/export default function \w+\(\)/,`export default function Spread${n}()`);
 layerRegistry[n]=[];
 code=code.replace(/<\w+\s[^>]*data-node-id="([^"]+)"[^>]*>/g,(tag,id)=>{
  const classes=tag.match(/className="([^"]+)"/)?.[1]??'';
  const inset=classes.match(/inset-\[([^\]]+)\]/)?.[1].split('_');
  const left=classes.match(/left-\[([\d.]+)%\]/)?.[1]??inset?.[3];
  const isRight=Number.parseFloat(left)>=50||/left-\[calc\(50%\+/.test(classes);
  if(!isRight)return tag;
  if(classes.includes('contents'))tag=tag.replace(`className="${classes}"`,`className="${classes.split(' ').filter(c=>c!=='contents'&&!/^(inset|left|right|top|bottom)-/.test(c)).join(' ')} block inset-0"`);
  const p='--layer-'+id.replace(':','-');
  const tx=classes.includes('-translate-x-1/2')?'-50%':'0px',ty=classes.includes('-translate-y-1/2')?'-50%':'0px';
  layerRegistry[n].push({id,name:tag.match(/data-name="([^"]+)"/)?.[1]??id});
  styles+=`.spread-art [data-book-layer="${id}"]{translate:calc(${tx} + var(${p}-x,0px)) calc(${ty} + var(${p}-y,0px))!important;rotate:var(${p}-rotation,0deg)!important;scale:var(${p}-scale,1)!important;opacity:var(${p}-opacity,${classes.match(/opacity-(\d+)/)?Number(classes.match(/opacity-(\d+)/)[1])/100:1})!important}\n`;
  return tag.replace(`data-node-id="${id}"`,`data-node-id="${id}" data-book-layer="${id}"`);
 });
 code="import {rightPageStyle} from '../rightPageLayout';\n"+code;
 if(n===4){
  code="import {MehndiHand} from '../MehndiHand';\n"+code;
  code=code.replace(/<img alt="" className="[^"]+" src=\{imgStunningArabicMehndiDesignElegantBridalHennaRemovebgPreview1\} \/>/,'<MehndiHand src={imgStunningArabicMehndiDesignElegantBridalHennaRemovebgPreview1} />');
 }
 let idx=0;code=code.replace(/className="([^"]+)"/g,(_,classes)=>{const name=`spread-${n}-${idx++}`;styles+=`.spread-art${idx===1?'':' '}.${name}{${classes.split(/\s+/).map(css).join(';')}}\n`;return `className="${name}"`});
 // Native artboard coordinates preserve the exact composition as the book scales.
 code=code.replace(/className="spread-\d-0"/,`className="spread-art spread-${n}-0"`);
 code=code.replace(/(className="spread-art spread-\d-0")/,`$1 style={rightPageStyle(${n})}`);
 writeFileSync(new URL(`Spread${n}.tsx`,dir),code);
}
writeFileSync(new URL('spreads.css',dir),styles);
writeFileSync(new URL('right-page-layers.json',dir),JSON.stringify(layerRegistry,null,2));
writeFileSync(new URL('assets.ts',dir),`export const bookAssets=${JSON.stringify([...assets.map(a=>'./book/'+a.file),'./book/chapter4-bare-hand.png'])};`);
