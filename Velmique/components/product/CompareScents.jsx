'use client';
import {useState} from 'react';
import Link from 'next/link';
import CustomSelect from '@/components/ui/CustomSelect';
const notes=p=>(p.variations?.find(v=>String(v.id)===String(p.defaultVariationId))?.noteItems||p.variations?.[0]?.noteItems||p.notes||[]).map(n=>typeof n==='string'?n:n.name).filter(Boolean).join(' · ');
const attribute=(p,key)=>{const a=p.variations?.[0]?.attributes||{};const value=a[key];return Array.isArray(value)?value.join(' · '):value||'—'};
export default function CompareScents({product,alternatives=[]}){
 const [choice,setChoice]=useState(0);const other=alternatives[choice];if(!other)return null;
 return <section className="v-product-compare m-wrap" id="product-compare"><div className="v-heading"><div><span className="m-eyebrow">Find your signature</span><h2>Compare Scents</h2></div><div className="v-compare-picker"><span>Compare {product.name} with</span><CustomSelect value={choice} onChange={v=>setChoice(Number(v))} label={`Compare ${product.name} with`} options={alternatives.map((p,i)=>({value:i,label:p.name}))}/></div></div><div className="v-comparison-table"><div className="v-comparison-head"><span/><>{[product,other].map(p=><div key={p.id}>{p.images?.[0]&&<img src={p.images[0]} alt={p.name} loading="lazy"/>}<h3>{p.name}</h3><p>₹{Number(p.price).toLocaleString('en-IN')}</p></div>)}</></div>{[['Key Notes',notes],['Fragrance Family',p=>attribute(p,'main accords')],['Best For',p=>attribute(p,'best for')],['Season',p=>attribute(p,'season')]].map(([label,get])=><div className="v-comparison-row" key={label}><b>{label}</b><span>{get(product)||'—'}</span><span>{get(other)||'—'}</span></div>)}<div className="v-comparison-row"><span/>{[product,other].map(p=><Link key={p.id} className="m-btn m-btn--fill" href={`/product/${p.slug}`}>View {p.name} →</Link>)}</div></div></section>
}
