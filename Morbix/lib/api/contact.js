/* Contact / lead capture API — mirrors Knitwink/lib/api/contact.js.
 * Endpoint: POST /api/leads.
 */
import { API_URL, authHeaders } from './client';

export async function sendMessage(data) {
  const res = await fetch(`${API_URL}/api/leads`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Failed to send message');
  return body;
}
