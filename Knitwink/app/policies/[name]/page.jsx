import PolicyClient from './PolicyClient'

// Server shell so each policy page has its own title in the HTML (the client
// part loads the text). e.g. "return-policy" → "Return Policy | Knitwink".
function formatTitle(name) {
  return (name || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function generateMetadata({ params }) {
  const { name } = await params
  return { title: formatTitle(name) || 'Policy' }
}

export default function PolicyPage() {
  return <PolicyClient />
}
