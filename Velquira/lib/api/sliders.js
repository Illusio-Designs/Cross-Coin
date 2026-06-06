import { apiClient } from '@/lib/api/client'

function cleanUrl(url) {
  if (!url) return ''
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'))
  }
  return url
}

export async function getPublicSliders() {
  try {
    const data = await apiClient.get('/api/sliders/listing', { suppressErrorToast: true })
    const slides = data.sliders || data || []
    return slides.map((s) => ({ ...s, image: cleanUrl(s.image) || s.image }))
  } catch { return [] }
}
