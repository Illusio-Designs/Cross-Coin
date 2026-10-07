const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'knitwink'

export async function getPolicyByName(name) {
  const res = await fetch(`${API_URL}/api/policies/name/${name}`, { headers: { 'X-Brand-Name': BRAND } })
  if (!res.ok) throw new Error('Failed to fetch policy')
  return res.json()
}
