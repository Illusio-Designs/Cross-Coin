// Dashboard "Search everything" (Ctrl/Cmd+K) — GET /api/search?q=
// Returns { success, q, groups: { customers, orders, chats, returns } };
// the backend only fills the groups the signed-in staff role may open.
import { adminApi } from './index';

export const searchService = {
  searchEverything: async (q, { signal } = {}) => {
    const { data } = await adminApi.get('/api/search', { params: { q }, signal, timeout: 10000 });
    return data;
  },
};

export default searchService;
