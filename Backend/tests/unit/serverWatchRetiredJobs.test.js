jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../services/whatsappService.js', () => ({ tName: jest.fn() }));

const { sequelize } = require('../../config/db.js');
const whatsapp = require('../../services/whatsappService.js');
const { watch, _internal } = require('../../services/serverWatchService.js');

test('closes retired job alerts quietly and keeps failures from active jobs', async () => {
  const now = new Date();
  const obsolete = { id: 1, alert_key: 'job_failed:shiprocket-order-reconciliation', notified_count: 2 };
  const current = { id: 2, alert_key: 'job_failed:prepaid-recovery', notified_count: 1, last_notified_at: now };
  const settings = { emails: [], whatsapp: [], rules: { ordersStoppedHours: 0, memoryMb: 0, courierQuietHours: 0 } };
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('SELECT data FROM server_watch_settings')) return [{ data: JSON.stringify(settings) }];
    if (sql.includes('COALESCE(SUM(requests)')) return [{ requests: 0 }];
    if (sql.includes('FROM job_runs jr')) return [
      { job_key: 'shiprocket-order-reconciliation', error: 'HTTP 400', started_at: now },
      { job_key: 'prepaid-recovery', error: 'Current failure', started_at: now },
    ];
    if (sql.includes('SELECT * FROM server_alerts WHERE resolved_at IS NULL')) return [obsolete, current];
    return [];
  });
  const found = await _internal.checkRules(_internal.cleanSettings(settings));
  expect(found.map(({ key }) => key)).toEqual(['job_failed:prepaid-recovery']);
  await expect(watch()).resolves.toMatchObject({ status: 'partial', summary: expect.stringContaining('1 resolved') });
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('SET resolved_at'),
    expect.objectContaining({ replacements: expect.objectContaining({ id: 1 }) }));
  expect(sequelize.query).not.toHaveBeenCalledWith(expect.stringContaining('SET resolved_at'),
    expect.objectContaining({ replacements: expect.objectContaining({ id: 2 }) }));
  expect(whatsapp.tName).not.toHaveBeenCalled();
});
