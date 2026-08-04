// Google Merchant product feed → /google-merchant.xml
// Google Merchant Center + Meta Commerce both accept this RSS 2.0 (g:) feed.
import { feedResponse } from '../../lib/productFeed';

export const dynamic = 'force-dynamic';

export async function GET() {
  return feedResponse();
}
