/* SEO — brand-scoped metadata from the shared backend.
   Backend resolves the row using X-Brand-Name → brand_id, with a
   fallback to brand_id=null and finally any row, so newly-added
   dashboard entries propagate even if a Velquira-specific row is
   missing. */

import { apiClient } from '@/lib/api/client'

export async function getSeoByPageName(pageName) {
  if (!pageName) return null
  // Next 16's App Router `useParams()` returns dynamic segments still
  // percent-encoded — decode first to avoid double-encoding below.
  let normalized = pageName
  try { normalized = decodeURIComponent(pageName) } catch { /* not encoded */ }
  try {
    const json = await apiClient.get(`/api/seo?page_name=${encodeURIComponent(normalized)}`, { suppressErrorToast: true })
    return json?.success ? json.data : json
  } catch { return null }
}
