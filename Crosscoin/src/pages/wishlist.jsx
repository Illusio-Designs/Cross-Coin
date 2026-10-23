// Live /wishlist route — renders the Mint design (utility page, noindex via its own
// Head). Kept on its canonical URL so existing links keep working.
import TestWishlist from './test/wishlist';

export default function TestWishlistLive() {
  return <TestWishlist />;
}
TestWishlistLive.mintChrome = true;
