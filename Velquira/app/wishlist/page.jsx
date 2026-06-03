
import { WishlistPageClient } from './WishlistPageClient';
import SeoWrapper from '@/components/SeoWrapper';

export const metadata = {
  title: 'Wishlist',
  description: 'Your saved favourites.'
};

export default function WishlistPage() {
  return (
    <SeoWrapper pageName="wishlist">
      <WishlistPageClient />
    </SeoWrapper>
  );
}