// Retry only reads, once, for transport/timeouts or transient server failures.
// Cancellation and permission errors must never be retried.
export async function loadChatMessages(client, url, { signal, params } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await client.get(url, { signal, ...(params ? { params } : {}) });
    } catch (error) {
      const cancelled = signal?.aborted || ['ERR_CANCELED', 'CanceledError', 'AbortError'].includes(error.code || error.name);
      const status = error.response?.status;
      const transient = ['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(error.code) || [502, 503, 504].includes(status);
      if (cancelled || !transient || attempt > 0) throw error;
    }
  }
}
