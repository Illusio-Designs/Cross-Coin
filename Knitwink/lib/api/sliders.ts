const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000'
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'knitwink'

export interface Slide {
  id: number
  title: string
  description: string
  image: string
  imageMobile?: string
  buttonText: string
  buttonLink?: string
  categoryName?: string
}

function cleanUrl(url: string | undefined): string {
  if (!url) return ''
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'))
  }
  return url
}

export async function getPublicSliders(): Promise<Slide[]> {
  try {
    const res = await fetch(`${API_URL}/api/sliders/listing`, {
      headers: { 'X-Brand-Name': BRAND_NAME },
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    const slides: Slide[] = data.sliders || data || []
    return slides.map(s => ({ ...s, image: cleanUrl(s.image) || s.image }))
  } catch {
    return []
  }
}
