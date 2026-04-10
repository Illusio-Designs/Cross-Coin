import Cookies from 'js-cookie';


const getBaseUrl = () =>
typeof window === 'undefined' ?
process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in' :
process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';

async function apiFetch(path, init) {
  const token = typeof window !== 'undefined' ? Cookies.get('auth_token') : undefined;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {})
  };

  const res = await fetch(`${getBaseUrl()}${path}`, { ...init, headers });

  if (!res.ok) {
    const error = {
      message: 'An error occurred',
      status: res.status
    };
    try {
      const body = await res.json();
      error.message = body.message ?? error.message;
      error.code = body.code;
    } catch {


      // ignore parse errors
    }throw error;}

  return res.json();
}

export const apiClient = {
  get: (path, init) =>
  apiFetch(path, { ...init, method: 'GET' }),

  post: (path, body, init) =>
  apiFetch(path, { ...init, method: 'POST', body: JSON.stringify(body) }),

  patch: (path, body, init) =>
  apiFetch(path, { ...init, method: 'PATCH', body: JSON.stringify(body) }),

  delete: (path, init) =>
  apiFetch(path, { ...init, method: 'DELETE' })
};