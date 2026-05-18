/* Policies — shared across every brand, so NO X-Brand-Name header.
   Same endpoint as Knitwink: GET /api/policies/name/:name
   Returns { title, content } where content is HTML. */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';

export async function getPolicyByName(name) {
  try {
    const res = await fetch(`${API_URL}/api/policies/name/${name}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
