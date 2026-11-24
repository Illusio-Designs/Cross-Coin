jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../config/logging.js', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('../../utils/encryption.js', () => ({ decrypt: (value) => value, phoneHash: (value) => `hash:${value}` }));
jest.mock('../../services/cartRecoveryService.js', () => ({
  getCartRules: async () => ({ minValue: 0 }),
  backstopDelayMin: () => 5,
}));

const { sequelize } = require('../../config/db.js');
const { getCarts } = require('../../services/whatsappInsightsService.js');

test('cart delivery follows the exact receipt and only matches unambiguous older reminders', async () => {
  const now = new Date();
  const cart = (id, messageId = null) => ({
    id, brand_id: 1, phone: `987654321${id}`, status: 'messaged', wa_sent: 1,
    created_at: now, updated_at: now, wa_sent_at: now, recovery_wa_message_id: messageId,
  });
  const carts = [cart(1, 'exact'), cart(2, 'missing'), cart(3), cart(4)];
  sequelize.query.mockImplementation(async (sql, { replacements }) => {
    if (sql.includes('FROM information_schema')) return [];
    if (sql.includes('FROM brands')) return [{ id: 1, name: 'CrossCoin' }];
    if (sql.includes('FROM abandoned_carts')) return carts;
    if (sql.includes('FROM whatsapp_conversations')) return carts.map((c) => ({ id: c.id, customer_phone: c.phone }));
    if (sql.includes('WHERE wa_message_id IN')) {
      expect(replacements.messageIds).toEqual(['exact', 'missing']);
      return [{ wa_message_id: 'exact', cid: 1, status: 'failed', error_reason: 'Undeliverable (code 131026)' }];
    }
    if (sql.includes('WHERE conversation_id IN')) {
      expect(replacements.convIds).toEqual([3, 4]);
      expect(sql).toContain("automation_key = 'abandoned_cart'");
      return [
        { cid: 3, status: 'failed', at: now, error_reason: 'Marketing limit (code 131049)' },
        { cid: 4, status: 'failed', at: now },
        { cid: 4, status: 'delivered', at: now },
      ];
    }
    return [];
  });

  const report = await getCarts({ days: 7 });
  expect(report.counts).toMatchObject({ all: 4, failed: 2, sent: 2 });
  expect(report.flow.messaged).toBe(2);
  expect(report.rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 1, wa: 'failed', result: expect.stringContaining('code 131026'), conversation_id: 1 }),
    expect.objectContaining({ id: 2, wa: 'sent', result: 'Awaiting delivery confirmation' }),
    expect.objectContaining({ id: 3, wa: 'failed', result: expect.stringContaining('code 131049') }),
    expect.objectContaining({ id: 4, wa: 'sent', result: 'Awaiting delivery confirmation' }),
  ]));
  const failed = await getCarts({ days: 7, status: 'failed' });
  expect(failed.rows.map((row) => row.id)).toEqual([1, 3]);
});
