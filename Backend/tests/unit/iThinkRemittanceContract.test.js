jest.mock('../../config/logging.js', () => ({ logger: {} }));
jest.mock('../../services/settingsHelper.js', () => ({}));

const { IThinkService } = require('../../services/iThinkService.js');

function provider(...responses) {
  const service = new IThinkService(1);
  service.initialized = true;
  service.accessToken = 'test-token';
  service.secretKey = 'test-key';
  service.axiosInstance = { post: jest.fn() };
  for (const response of responses) {
    if (response instanceof Error) service.axiosInstance.post.mockRejectedValueOnce(response);
    else service.axiosInstance.post.mockResolvedValueOnce(response);
  }
  return service;
}

test('uses both documented remittance endpoints with the same date and account', async () => {
  const summary = [{ cod_remitted: '430.00' }];
  const shipments = [{ airway_bill_no: 'AWB123', price: '449.10' }];
  const service = provider(
    { status: 200, data: { status: 'success', data: summary } },
    { status: 200, data: { status: 'success', data: shipments } },
  );
  await expect(service.getCodRemittance('2026-11-01')).resolves.toEqual({ summary, shipments, issues: [] });
  for (const endpoint of ['get', 'get_details']) {
    expect(service.axiosInstance.post).toHaveBeenCalledWith(
      `/api_v3/remittance/${endpoint}.json`,
      { data: { remittance_date: '2026-11-01', access_token: 'test-token', secret_key: 'test-key' } },
      expect.any(Object),
    );
  }
});

test('recognizes an explicit empty remittance message in either provider message field', async () => {
  const service = provider(
    { status: 400, data: { status: 'error', html_message: '<p>Data not found.</p>' } },
    { status: 404, data: { status: 'error', message: 'No remittance data found for the selected date.' } },
  );
  await expect(service.getCodRemittance('2026-11-01')).resolves.toEqual({ summary: [], shipments: [], issues: [] });
});

test('reports the observed HTTP 200 authentication error as an access issue', async () => {
  const rejection = { status: 200, data: { status: 'error', status_code: 200, html_message: 'Invalid Access Token And Secret Key.' } };
  const service = provider(rejection, rejection);
  await expect(service.getCodRemittance('2026-11-01')).resolves.toEqual({
    summary: null, shipments: null, issues: ['access_denied', 'access_denied'],
  });
});

test('keeps the shipment report when the payout summary times out', async () => {
  const shipments = [{ airway_bill_no: 'AWB123', price: '449.10' }];
  const service = provider(
    Object.assign(new Error('fixture'), { code: 'ECONNABORTED' }),
    { status: 200, data: { status: 'success', data: shipments } },
  );
  await expect(service.getCodRemittance('2026-11-01')).resolves.toEqual({
    summary: null, shipments, issues: ['timeout'],
  });
});
