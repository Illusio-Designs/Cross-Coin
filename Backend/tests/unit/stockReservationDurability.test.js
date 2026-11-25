jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../services/redisService.js', () => ({
  isReady: jest.fn(), get: jest.fn(), getClient: jest.fn(),
}));
jest.mock('../../config/logging.js', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));

const { sequelize } = require('../../config/db.js');
const redis = require('../../services/redisService.js');
const { getReservationByRazorpayOrder, linkRazorpayOrder } = require('../../services/stockReservationService.js');

const orderId = 'order_fixture';
const reservationId = 'res_fixture';
const session = { reservation_id: reservationId, brand_id: 7, totals: { final: 449.10 } };
const client = { get: jest.fn(), ttl: jest.fn(), set: jest.fn() };

beforeEach(() => {
  jest.resetAllMocks();
  redis.isReady.mockReturnValue(true);
  redis.getClient.mockReturnValue(client);
  client.get.mockResolvedValue(JSON.stringify(session));
  client.ttl.mockResolvedValue(90);
  sequelize.query.mockResolvedValue([[]]);
});

test('requires a durable checkout write before making the order available in Redis', async () => {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('INSERT INTO checkout_session_store')) throw new Error('database unavailable');
    return [[]];
  });
  await expect(linkRazorpayOrder(orderId, reservationId)).rejects.toThrow('database unavailable');
  expect(client.set).not.toHaveBeenCalled();
});

test('uses the durable checkout when Redis fails mid-query', async () => {
  redis.get.mockRejectedValue(new Error('Redis connection reset'));
  sequelize.query.mockImplementation(async (sql) => sql.includes('SELECT session')
    ? [[{ session: JSON.stringify({ ...session, razorpay_order_id: orderId }) }]] : [[]]);
  await expect(getReservationByRazorpayOrder(orderId)).resolves.toMatchObject(session);
});

test('uses the durable copy of the specific order after a retry changes the live reservation', async () => {
  redis.get.mockResolvedValueOnce(reservationId).mockResolvedValueOnce(JSON.stringify({
    ...session, razorpay_order_id: 'order_retry',
  }));
  sequelize.query.mockResolvedValue([[{ session: JSON.stringify({ ...session, razorpay_order_id: orderId }) }]]);
  await expect(getReservationByRazorpayOrder(orderId)).resolves.toMatchObject({ razorpay_order_id: orderId });
});
