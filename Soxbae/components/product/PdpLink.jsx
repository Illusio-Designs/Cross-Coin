'use client';

import Link from 'next/link';
import { productHref, rememberPdpColor } from '@/lib/pdpColor';

// A clean link to a product page that remembers the card's colour (see
// lib/pdpColor), so the page opens on it without a ?color= in the address.
export default function PdpLink({ slug, color, onClick, ...rest }) {
  return <Link href={productHref(slug)} onClick={(e) => { rememberPdpColor(slug, color); onClick?.(e); }} {...rest} />;
}
