'use client';

import Link from 'next/link';
import { productHref, rememberPdpColor } from '@/lib/pdpColor';

// A clean link to a product page that remembers the card's colour (see
// lib/pdpColor), so the page opens on it without a ?color= in the address.
// Not prefetched: the colour is picked at the edge from the cookie set on
// click, so a copy fetched ahead of the click could show the wrong colour.
// The product page is cached, so the click still opens it quickly.
export default function PdpLink({ slug, color, onClick, ...rest }) {
  return <Link href={productHref(slug)} prefetch={false} onClick={(e) => { rememberPdpColor(slug, color); onClick?.(e); }} {...rest} />;
}
