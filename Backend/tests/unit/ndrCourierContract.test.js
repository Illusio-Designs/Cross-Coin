jest.mock('axios', () => ({}));
jest.mock('../../config/logging.js', () => ({ logger: { debug: jest.fn(), warn: jest.fn() } }));
jest.mock('../../services/settingsHelper.js', () => ({}));
jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn(async () => []) } }));
jest.mock('../../services/shippingProviderFactory.js', () => ({ getShippingProvider: jest.fn() }));
jest.mock('../../services/exceptionsService.js', () => ({ ensureSchema: jest.fn(), logEvent: jest.fn() }));
const { IThinkService } = require('../../services/iThinkService.js');
const { ndrResult } = require('../../services/ndrResponse.js');
const ndr = require('../../services/ndrService.js');
const factory = require('../../services/shippingProviderFactory.js');
const { sequelize } = require('../../config/db.js');
const ex = require('../../services/exceptionsService.js');
const accepted = { status: 'success', status_code: 200, data: { 'TEST-AWB': { status: 'success', remark: 'Instruction accepted' } } };
let provider;
beforeEach(() => {
  jest.clearAllMocks();
  provider = new IThinkService(3);
  provider.initialized = true;
  provider.accessToken = 'fixture-token'; provider.secretKey = 'fixture-key';
  provider.axiosInstance = { post: jest.fn(async () => ({ data: accepted })) };
  factory.getShippingProvider.mockResolvedValue(provider);
});
test('RTO uses the documented endpoint, shipment array, action code and required remark', async () => {
  await provider.ndrAction('TEST-AWB', 'rto', { rto_remark: 'Customer declined delivery' });
  expect(provider.axiosInstance.post).toHaveBeenCalledWith('/api_v3/ndr/add-reattempt-rto.json', {
    data: { access_token: 'fixture-token', secret_key: 'fixture-key', shipments: [{ awb_numbers: 'TEST-AWB', ndr_action: '2', rto_remark: 'Customer declined delivery' }] },
  });
});
test('reattempt transmits the required date and optional new address', async () => {
  await provider.ndrAction('TEST-AWB', 'reattempt', { reattempt_date: '2026-11-17', reattempt_address: 'Fixture address, 360001' });
  expect(provider.axiosInstance.post).toHaveBeenCalledWith('/api_v3/ndr/add-reattempt-rto.json', expect.objectContaining({ data: expect.objectContaining({ shipments: [{ awb_numbers: 'TEST-AWB', ndr_action: '1', reattempt_date: '2026-11-17', reattempt_address: 'Fixture address, 360001' }] }) }));
});
test.each([['rto', {}], ['reattempt', {}], ['reattempt', { reattempt_date: '2026-02-30' }], ['cancel', {}]])('invalid %s request is rejected before contacting iThink', async (action, extra) => {
  await expect(provider.ndrAction('TEST-AWB', action, extra)).rejects.toThrow();
  expect(provider.axiosInstance.post).not.toHaveBeenCalled();
});
test.each([[], null, {}, { status: 'success', status_code: 200, data: [] }, { ...accepted, data: { 'OTHER-AWB': { status: 'success' } } }, { ...accepted, status: 'error' }, { ...accepted, data: { 'TEST-AWB': { status: 'error', remark: 'Not eligible for NDR' } } }])('empty or rejected shipment response is never acceptance: %j', response => {
  expect(ndrResult(response, 'TEST-AWB').accepted).toBe(false);
  expect(ndrResult(response, 'TEST-AWB').message).not.toMatch(/^\[\]$/);
});
test('uses the per-AWB courier rejection rather than the envelope success', () => {
  expect(ndrResult({ ...accepted, data: { 'TEST-AWB': { status: 'error', remark: 'Already delivered' } } }, 'TEST-AWB')).toEqual({ accepted: false, message: 'Already delivered' });
});
test('only explicit per-AWB acceptance moves the case to rto_requested', async () => {
  await ndr.sendToCourier({ id: 9, order_id: 11, brand_id: 3, awb: 'TEST-AWB', reason: 'Declined delivery' }, 'rto');
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('sent_to_courier_at = NOW()'), expect.objectContaining({ replacements: expect.arrayContaining(['rto_requested', 9]) }));
});
test('empty response records refusal but never marks RTO accepted or closes the case', async () => {
  provider.axiosInstance.post.mockResolvedValue({ data: [] });
  await expect(ndr.sendToCourier({ id: 9, order_id: 11, brand_id: 3, awb: 'TEST-AWB' }, 'rto')).rejects.toThrow('did not confirm this AWB');
  expect(sequelize.query.mock.calls.some(([sql]) => sql.includes('sent_to_courier_at = NOW()'))).toBe(false);
  expect(ex.logEvent).toHaveBeenCalledWith('ndr', 9, 11, expect.stringContaining('did not accept'), expect.any(Object));
});
test('missing reattempt date gets a default before contacting the courier', async () => {
  await ndr.sendToCourier({ id: 9, order_id: 11, brand_id: 3, awb: 'TEST-AWB' }, 'reattempt');
  expect(provider.axiosInstance.post.mock.calls[0][1].data.shipments[0].reattempt_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
