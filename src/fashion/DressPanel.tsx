import { useEffect, useRef, useState } from 'react';

const asset = (name: string) => `./fashion/dress/${name}`;
const particles = [[495.41,980.49],[798.76,1554.34],[791.62,1553.18],[581.79,1311.29],[163.67,1444.5],[362.09,1443.82],[790.41,1486.01],[534.07,1381.21]];

function Divider({ className }: { className: string }) {
  return <img className={`dress-divider ${className}`} src={asset('divider.svg')} alt="" />;
}

/** Figma's 1080 × 1920 editorial artwork scales uniformly within the gallery. */
export function DressPanel({ look }: { look: 'red' | 'white' }) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const hasSwitched = useRef(false);
  const [shown, setShown] = useState(look);
  const [transition, setTransition] = useState<{from: 'red' | 'white'; to: 'red' | 'white'} | null>(null);
  useEffect(() => {
    if (look === shown) return;
    hasSwitched.current = true;
    setTransition({from: shown, to: look});
    const timer = setTimeout(() => { setShown(look); setTransition(null); }, 850);
    return () => clearTimeout(timer);
  }, [look, shown]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(entry.contentRect.width / 1080, entry.contentRect.height / 1920)));
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);

  return <div ref={host} className="dress-viewport">
    <article className={`dress-canvas${transition ? " dress-switching" : ""}${hasSwitched.current ? " has-switched" : ""}`} style={{ transform: `translate(-50%, -50%) scale(${scale})` }} aria-label="Chapter 02 · Threads of Tradition" data-node-id={look === 'white' ? '40:10553' : '39:10401'}>
      <img className="dress-jaali entrance" src={asset('jaali.svg')} alt="" />
      <header className="dress-heading entrance">
        <p className="dress-brand">MUGHAL TIMES</p><div className="dress-top-rule" />
        <p className="dress-chapter">CHAPTER 02 · Threads of Tradition</p>
        <h1 className="dress-title-text">Elegance in Every Thread</h1>
        <Divider className="dress-title-divider" />
        <p className="dress-subtitle dress-switch-text">From Mughal courts to modern wardrobes.</p>
      </header>
      <div className="dress-intro entrance"><p key={shown} className={`dress-copy-motion copy-left ${transition ? 'copy-leaving' : ''}`}>{shown === 'red' ? 'The Anarkali draws inspiration from the flowing peshwaz worn in Mughal-era and later royal courts. Its fitted bodice and flared skirt reflect the elegance of courtly fashion.' : 'Chikankari celebrates the delicate art of embroidery. Floral motifs and fine stitches bring texture and detail to the ivory fabric, creating a look defined by its intricate craftsmanship.'}</p></div>
      <div className="dress-atmosphere" aria-hidden="true">{Array.from({length:32},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,top:`${(i*23)%100}%`,animationDelay:`${-i*.71}s`}}/>)}</div>
      <div className="dress-art-stage">
        <DressArtwork look={transition?.from ?? shown} phase={transition ? 'outgoing' : 'settled'} />
        {transition && <DressArtwork look={transition.to} phase="incoming" />}
        {transition && <DressArtwork look={transition.to} phase="contact" />}
      </div>
      <div className="dress-pavilion entrance"><img src={asset('pavilion.png')} alt="Carved golden pavilion displaying embroidered cushions and a peacock fan" /></div>
      <aside className="dress-description entrance"><div key={shown} className={`dress-copy-motion copy-right ${transition ? 'copy-leaving' : ''}`}><Divider className="dress-copy-divider"/><p>{shown === 'red' ? 'Traditionally crafted from fine fabrics with delicate embellishments, it symbolised grace and luxury. Today, this timeless silhouette lives on in festive and modern Indian fashion.' : 'The ivory palette highlights the floral embroidery and the richness of its detail. Today, Chikankari continues to find expression in both traditional silhouettes and modern wardrobes.'}</p></div></aside>
      {particles.map(([left,top],i)=><img key={i} className="dress-particle" style={{left,top}} src={asset(`particle-${i}.svg`)} alt="" />)}
      {['tr','tl','br','bl'].map(corner=><div key={corner} className={`dress-corner dress-corner-${corner} entrance`}><img src={asset('corner.png')} alt="" /></div>)}

    </article>
  </div>;
}

function DressArtwork({look, phase}: {look: 'red' | 'white'; phase: 'incoming' | 'outgoing' | 'settled' | 'contact'}) {
 return <div className={`dress-art-layer art-${phase}`} data-art-look={look} aria-hidden={phase==='contact' ? true : undefined}>
  <img className="dress-textile entrance" src={asset(look === 'white' ? 'ivory-textile.png' : 'textile.png')} alt={look === 'white' ? 'Ivory Chikankari floral embroidery' : 'Red and gold embroidered textile'} />
  <div className="dress-figure entrance">
   {look === 'red' ? <><div className="dress-figure-crop"><img src={asset('woman.png')} alt="Seated woman in a red and gold Anarkali" /></div><div className="dress-figure-mask"/><div className="dress-step step-one"/><div className="dress-step step-two"/><div className="dress-step step-three"/></> : <div className="dress-white-crop dress-portrait"><img src={asset('chikankari-portrait.png')} alt="Seated woman in an ivory embroidered Chikankari dress" /></div>}
  </div>
 </div>;
}
