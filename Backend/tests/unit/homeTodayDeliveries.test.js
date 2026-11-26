jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../services/salesReportService.js', () => ({
  salesSummary: async () => ({ summary: { rates: {} }, previous: {} }),
}));
jest.mock('../../services/pickupScheduleService.js', () => ({ nextBatchDate: () => null }));

const { sequelize } = require('../../config/db.js');
const { getToday } = require('../../services/homeTodayService.js');

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-25T19:00:00Z'));
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

test('delivery history fills seven India dates and uses the selected brand', async () => {
  sequelize.query.mockImplementation(async (sql) => sql.includes('delivery.first_at')
    ? [{ day: '2026-11-22', n: '3' }, { day: '2026-11-26', n: '2' }] : [{}]);
  const result = await getToday({ brandId: 8 });
  expect(result.deliveredWeek).toEqual([
    { day: '2026-11-20', orders: 0 }, { day: '2026-11-21', orders: 0 }, { day: '2026-11-22', orders: 3 },
    { day: '2026-11-23', orders: 0 }, { day: '2026-11-24', orders: 0 }, { day: '2026-11-25', orders: 0 },
    { day: '2026-11-26', orders: 2 },
  ]);
  const [sql, options] = sequelize.query.mock.calls.find(([query]) => query.includes('delivery.first_at'));
  expect(sql).toContain('h.status = \'delivered\'');
  expect(sql).toContain('GROUP BY h.order_id');
  expect(sql).toContain('prior.created_at < :weekStart');
  expect(sql).toContain('o.brand_id = :brandId');
  expect(options.replacements).toMatchObject({ brandId: 8, weekStart: new Date('2026-11-19T18:30:00Z') });
});

test('unavailable delivery history is distinct from seven zero-delivery days', async () => {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('delivery.first_at')) throw Error('Unavailable');
    return [{}];
  });
  expect(await getToday()).toMatchObject({ deliveredWeek: null });
});
