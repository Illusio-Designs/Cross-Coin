'use client';
import {useState} from 'react';
import Link from 'next/link';
const phases=[['Top','Opening','0–15 min'],['Heart','Heart','15 min–4 hr'],['Base','Dry Down','4 hr+']];
const descriptions={Top:'Spray onto skin and take in the first impression. Allow the fragrance a few moments to settle.',Heart:'As the opening softens, discover the character at the heart of the fragrance.',Base:'Revisit the fragrance later to experience its softer, lingering finish. Wear time varies with skin and conditions.'};
export default function ScentExperience({name,tiers=[],notes=[],accords=[],spec=[]}){
 const available=phases.map(([key,label,time])=>({key,label,time,items:tiers.find(t=>t.label===key)?.items||[]}));
 const [active,setActive]=useState(0);
 const phase=available[active]||available[0];
 const flat=notes.map(n=>typeof n==='string'?{name:n}:n).filter(n=>n?.name);
 const items=phase?.items?.length?phase.items:flat;
 const picture=items.find(n=>n.image);
 return <div className="v-scent-story">
   <section className="v-detail-section"><h2>The Scent Experience</h2><p className="v-detail-caption">{available.length?`Discover how ${name} unfolds over time.`:`Discover the character of ${name}.`}</p>
   {available.length>0&&<div className="v-phase-tabs" role="tablist" aria-label="Fragrance development">{available.map((p,i)=><button type="button" role="tab" id={`phase-${p.key}`} aria-controls="scent-phase" aria-selected={active===i} key={p.key} onClick={()=>setActive(i)}>{p.label}<small>({p.time})</small></button>)}</div>}
   <div className="v-phase-content" role={phase?'tabpanel':undefined} id="scent-phase" aria-labelledby={phase?`phase-${phase.key}`:undefined}>
    {picture&&<img src={picture.image} alt={picture.name} loading="lazy"/>}<div><h3>{phase?.items.length?items.map(n=>n.name).join(' · '):accords.slice(0,3).join(' · ')||name}</h3><p>{phase?.items.length ? `${phase.label}: ${items.map(n=>n.name).join(', ')}.` : descriptions[phase?.key] || 'Explore the fragrance notes below.'}</p></div>
   </div></section>
   {(tiers.length>0||flat.length>0)&&<section className="v-detail-section"><h2>Fragrance Notes</h2><div className="v-note-cards">{(tiers.length?tiers:flat.map(n=>({label:n.name,items:[n]}))).map(t=><div className="v-note-card" key={t.label}>{t.items.find(n=>n.image)&&<img src={t.items.find(n=>n.image).image} alt="" loading="lazy"/>}<div><b>{tiers.length ? `${t.label} Notes` : t.label}</b>{tiers.length>0&&<p>{t.items.map(n=>n.name).join(', ')}</p>}</div></div>)}</div></section>}
   {spec.length>0&&<div className="v-detail-specs">{spec.map(([key,value])=><div key={key}><b>{key}</b><span>{value}</span></div>)}</div>}
   <div className="v-compare-banner"><div><h3>Compare with Another Scent</h3><p>Find the fragrance that feels most like you.</p></div><Link className="m-btn m-btn--fill" href="#product-compare">Compare Now →</Link></div>
 </div>
}
