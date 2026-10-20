/* Gripzus skeleton kit — square, hairline, paper-toned placeholders drawn in
   the exact frames the real content uses (the `.sk` shimmer lives in
   styles/globals.css). Keep page heroes, toolbars and filters on screen and
   replace only the part that is loading; on a refresh with data already shown,
   dim it (`sk-dim`) instead of flashing skeletons.

     <Sk className="h-3 w-1/3" />                     one bar (size via classes or w/h)
     <SkBusy label="Loading pairs…" className="grid …"><ProductCardSkeletons n={8} /></SkBusy>
*/

export function Sk({ w, h, className = '', style }) {
  return <span aria-hidden="true" className={`sk ${className}`} style={{ width: w, height: h, ...style }} />;
}

// Announced wrapper: screen readers hear the label once; shapes are aria-hidden.
export function SkBusy({ label = 'Loading…', className, style, children }) {
  return (
    <div className={className} style={style} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// Matches components/products/ProductCard: 1px-framed 4:5 image, collection
// eyebrow + colour dots, name/price baseline row, hairline-topped Add row.
export function ProductCardSkeleton({ className = '' }) {
  return (
    <div className={`flex h-full flex-col ${className}`} aria-hidden="true">
      <div className="relative border border-line bg-paper-warm">
        <div className="relative aspect-[4/5]"><Sk className="sk-fill" /></div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-3">
        <Sk className="h-2.5 w-1/3" />
        <span className="flex gap-1">{[0, 1, 2].map((i) => <Sk key={i} className="h-2.5 w-2.5" />)}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <Sk className="h-3.5 w-1/2" />
        <Sk className="h-3.5 w-12" />
      </div>
      <div className="mt-3 border-t border-line pt-3 flex justify-center"><Sk className="h-2.5 w-24" /></div>
    </div>
  );
}

// `vis(i)` lets a caller hide extra cells per breakpoint, like the real grid.
export function ProductCardSkeletons({ n = 8, vis }) {
  return Array.from({ length: n }).map((_, i) => <ProductCardSkeleton key={i} className={vis ? vis(i) : ''} />);
}

// Matches components/products/CollectionCard: framed image + caption below.
export function CollectionCardSkeletons({ n = 4, ratio = 'aspect-[4/5]', vis }) {
  return Array.from({ length: n }).map((_, i) => (
    <div key={i} className={vis ? vis(i) : ''} aria-hidden="true">
      <div className={`relative ${ratio} border border-line bg-paper-warm`}><Sk className="sk-fill" /></div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <Sk className={`h-5 ${['w-1/2', 'w-2/5', 'w-3/5'][i % 3]}`} />
        <Sk className="h-2.5 w-14" />
      </div>
    </div>
  ));
}

// Matches components/common/BlogCard: 16:9 framed cover + caption lines.
export function BlogCardSkeletons({ n = 3 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div key={i} className="flex flex-col" aria-hidden="true">
      <div className="relative aspect-[16/9] border border-line bg-paper-warm"><Sk className="sk-fill" /></div>
      <div className="pt-4 flex flex-col gap-2.5">
        <Sk className="h-2.5 w-1/4" />
        <Sk className="h-4 w-11/12" />
        <Sk className="h-3 w-4/5" />
        <Sk className="h-3 w-2/5 mt-2" />
      </div>
    </div>
  ));
}

// Running text (policies, articles).
const LINE = ['95%', '80%', '90%', '65%', '88%', '72%', '92%', '60%'];
export function TextSkeleton({ lines = 8 }) {
  return (
    <div className="space-y-3.5" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => <Sk key={i} className="h-3.5" w={LINE[i % LINE.length]} />)}
    </div>
  );
}
