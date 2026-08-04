/**
 * Smoke tests for the hardened fetch wrapper. fetch + Cookies + toast
 * mocked so the test runs without network.
 */

jest.mock('js-cookie', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@/lib/toast', () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showInfo: jest.fn(),
  showWarning: jest.fn(),
}));

import Cookies from 'js-cookie';
import { showError } from '@/lib/toast';
import { apiClient } from '@/lib/api/client';

function mockFetch(impl) { global.fetch = jest.fn(impl); }

function jsonResponse(body, { status = 200 } = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

beforeEach(() => {
  jest.clearAllMocks();
  Cookies.get.mockImplementation(() => undefined);
});

describe('apiClient — headers', () => {
  test('attaches X-Brand-Name on every request', async () => {
    mockFetch(async () => jsonResponse({ success: true }));
    await apiClient.get('/api/anything');
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['X-Brand-Name']).toBe('velmique');
  });

  test('attaches Authorization when auth_token cookie present', async () => {
    Cookies.get.mockImplementation((k) => (k === 'auth_token' ? 'abc.def.ghi' : undefined));
    mockFetch(async () => jsonResponse({ success: true }));
    await apiClient.get('/api/me');
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  test('mirrors cc_csrf cookie into X-CSRF-Token on POST', async () => {
    Cookies.get.mockImplementation((k) => (k === 'cc_csrf' ? 'csrf-12345' : undefined));
    mockFetch(async () => jsonResponse({ success: true }));
    await apiClient.post('/api/something', { a: 1 });
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['X-CSRF-Token']).toBe('csrf-12345');
  });

  test('does NOT mirror CSRF on GET', async () => {
    Cookies.get.mockImplementation((k) => (k === 'cc_csrf' ? 'csrf-12345' : undefined));
    mockFetch(async () => jsonResponse({ success: true }));
    await apiClient.get('/api/something');
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['X-CSRF-Token']).toBeUndefined();
  });
});

describe('apiClient — error handling', () => {
  test('throws shaped error on 4xx with category-appropriate message', async () => {
    mockFetch(async () => jsonResponse({ message: 'Not found' }, { status: 404 }));
    await expect(apiClient.get('/api/missing')).rejects.toMatchObject({ status: 404, message: 'Not found' });
    expect(showError).toHaveBeenCalled();
  });

  test('5xx surfaces server-error toast copy', async () => {
    mockFetch(async () => jsonResponse({}, { status: 500 }));
    await expect(apiClient.get('/api/boom')).rejects.toMatchObject({ status: 500 });
    expect(showError).toHaveBeenCalledWith(expect.stringMatching(/server hit a bump/i));
  });

  test('401 surfaces sign-in copy', async () => {
    mockFetch(async () => jsonResponse({}, { status: 401 }));
    await expect(apiClient.get('/api/private')).rejects.toMatchObject({ status: 401 });
    expect(showError).toHaveBeenCalledWith(expect.stringMatching(/sign in/i));
  });

  test('suppressErrorToast skips the toast', async () => {
    mockFetch(async () => jsonResponse({}, { status: 500 }));
    await expect(apiClient.get('/api/boom', { suppressErrorToast: true })).rejects.toBeDefined();
    expect(showError).not.toHaveBeenCalled();
  });

  test('network failure surfaces "can\'t reach the server" copy', async () => {
    mockFetch(async () => { throw new Error('network down'); });
    await expect(apiClient.get('/api/anything')).rejects.toBeDefined();
    expect(showError).toHaveBeenCalledWith(expect.stringMatching(/can't reach the server/i));
  });
});

describe('apiClient — 204 No Content', () => {
  test('returns null without trying to parse JSON', async () => {
    mockFetch(async () => ({ ok: true, status: 204, json: async () => { throw new Error('no body'); } }));
    const result = await apiClient.delete('/api/something');
    expect(result).toBeNull();
  });
});
