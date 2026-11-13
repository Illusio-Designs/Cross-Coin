jest.mock('../../config/logging.js', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../config/db.js', () => ({ sequelize: { transaction: jest.fn(), query: jest.fn() } }));
jest.mock('../../model/orderModel.js', () => ({ Order: { findByPk: jest.fn() } }));
jest.mock('../../model/orderItemModel.js', () => ({ OrderItem: { findAll: jest.fn() } }));
jest.mock('../../model/orderStatusHistoryModel.js', () => ({ OrderStatusHistory: { create: jest.fn() } }));
jest.mock('../../model/productVariationModel.js', () => ({ ProductVariation: { increment: jest.fn() } }));
jest.mock('../../model/orderShipmentModel.js', () => ({ OrderShipment: { findOne: jest.fn(), update: jest.fn() } }));
jest.mock('../../services/couponRulesService.js', () => ({ releaseCouponUse: jest.fn() }));
jest.mock('../../services/loyaltyService.js', () => ({ refundPoints: jest.fn() }));
jest.mock('../../services/refundService.js', () => ({ autoRefundOnCancel: jest.fn() }));
jest.mock('../../services/orderEvents.js', () => ({ emit: jest.fn() }));
jest.mock('../../controller/orderShippingController.js', () => ({ resolveProviderForOrder: jest.fn() }));
const { sequelize } = require('../../config/db.js');
const { Order } = require('../../model/orderModel.js');
const { OrderItem } = require('../../model/orderItemModel.js');
const { OrderStatusHistory } = require('../../model/orderStatusHistoryModel.js');
const { ProductVariation } = require('../../model/productVariationModel.js');
const { OrderShipment } = require('../../model/orderShipmentModel.js');
const { autoRefundOnCancel } = require('../../services/refundService.js');
const events = require('../../services/orderEvents.js');
const { resolveProviderForOrder } = require('../../controller/orderShippingController.js');
const service = require('../../services/orderService.js');
let order, scheduled, releaseCommit, atCommit, commitError, courierCancel;
const flush = async () => { while (scheduled.length) await scheduled.shift()(); };
beforeEach(() => {
  jest.clearAllMocks(); scheduled = []; commitError = null;
  jest.spyOn(global, 'setImmediate').mockImplementation((fn) => { scheduled.push(fn); });
  order = { id: 1, order_number: 'ORDER-1', user_id: 2, brand_id: 3, status: 'pending', payment_type: 'razorpay', payment_status: 'paid', shipping_waybill: 'AWB-1' };
  order.update = jest.fn(async (patch) => Object.assign(order, patch));
  Order.findByPk.mockResolvedValue(order);
  OrderItem.findAll.mockResolvedValue([{ variation_id: 12, quantity: 2 }]);
  OrderShipment.findOne.mockResolvedValue(null);
  sequelize.query.mockResolvedValue([[{ id: 1 }]]);
  atCommit = new Promise((resolve) => { releaseCommit = resolve; });
  sequelize.transaction.mockImplementation(async (work) => {
    const result = await work({});
    await atCommit;
    if (commitError) throw commitError;
    return result;
  });
  courierCancel = jest.fn(); resolveProviderForOrder.mockResolvedValue({ name: 'fixture-courier', service: { cancelOrder: courierCancel } });
});
afterEach(() => jest.restoreAllMocks());
const waitForWork = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
test('confirmation emits no event or background work while commit is pending', async () => {
  const result = service.confirmOrder(1, 5); await waitForWork();
  expect(order.status).toBe('confirmed'); expect(scheduled).toHaveLength(0); expect(events.emit).not.toHaveBeenCalled();
  releaseCommit(); await result; await flush();
  expect(events.emit).toHaveBeenCalledTimes(1); expect(events.emit).toHaveBeenCalledWith('order.confirmed', order);
});
test('failed confirmation commit never starts notifications or shipping', async () => {
  const result = service.confirmOrder(1, 5); await waitForWork(); commitError = new Error('commit failed'); releaseCommit();
  await expect(result).rejects.toThrow('commit failed'); await flush(); expect(events.emit).not.toHaveBeenCalled();
});
test('paid cancellation defers courier, refund and notification until committed', async () => {
  const result = service.cancelOrder(1, { reason: 'Customer requested', cancelledBy: 2 }); await waitForWork();
  expect(scheduled).toHaveLength(0); expect(autoRefundOnCancel).not.toHaveBeenCalled();
  releaseCommit(); await result; await flush();
  expect(order.payment_status).toBe('refund_pending');
  expect(courierCancel).toHaveBeenCalledWith('AWB-1', 'Customer requested');
  expect(autoRefundOnCancel).toHaveBeenCalledTimes(1);
  expect(events.emit).toHaveBeenCalledWith('order.cancelled', order);
  expect(ProductVariation.increment).toHaveBeenCalledTimes(1);
});
test('failed cancellation commit never cancels courier, refunds or notifies', async () => {
  const result = service.cancelOrder(1, { reason: 'Customer requested', cancelledBy: 2 }); await waitForWork();
  commitError = new Error('commit failed'); releaseCommit(); await expect(result).rejects.toThrow('commit failed'); await flush();
  expect(courierCancel).not.toHaveBeenCalled(); expect(autoRefundOnCancel).not.toHaveBeenCalled(); expect(events.emit).not.toHaveBeenCalled();
});
test('audit failure rolls back cancellation without queuing external work', async () => {
  sequelize.query.mockResolvedValueOnce([[{id:1}]]).mockRejectedValueOnce(new Error('audit failed'));
  await expect(service.cancelOrder(1, { reason: 'Customer requested' })).rejects.toThrow('audit failed');
  await flush(); expect(autoRefundOnCancel).not.toHaveBeenCalled(); expect(events.emit).not.toHaveBeenCalled(); expect(courierCancel).not.toHaveBeenCalled();
});
test.each(['refund_pending','partial_refund','refunded'])('cancellation preserves the %s payment state', async (status) => {
  order.payment_status = status; releaseCommit(); await service.cancelOrder(1, { reason: 'Customer requested' }); await flush();
  expect(order.payment_status).toBe(status);
  if (status !== 'refund_pending') expect(autoRefundOnCancel).not.toHaveBeenCalled();
});
test('COD cancellation remains unpaid and never requests a refund', async () => {
  Object.assign(order, {payment_type:'cod',payment_status:'pending'}); releaseCommit(); await service.cancelOrder(1,{reason:'Customer requested'}); await flush();
  expect(order.payment_status).toBe('cancelled'); expect(autoRefundOnCancel).not.toHaveBeenCalled();
});
test('repeating cancellation never restores stock or sends work twice', async () => {
  releaseCommit(); await service.cancelOrder(1,{reason:'Customer requested'}); await flush();
  await expect(service.cancelOrder(1,{reason:'Retry'})).rejects.toThrow('Cannot cancel'); await flush();
  expect(ProductVariation.increment).toHaveBeenCalledTimes(1); expect(courierCancel).toHaveBeenCalledTimes(1); expect(autoRefundOnCancel).toHaveBeenCalledTimes(1);
});
test('refund failure after commit cannot fail the saved cancellation or suppress its event', async () => {
  autoRefundOnCancel.mockRejectedValueOnce(new Error('provider unavailable')); releaseCommit();
  await expect(service.cancelOrder(1,{reason:'Customer requested'})).resolves.toMatchObject({status:'cancelled'}); await flush();
  expect(events.emit).toHaveBeenCalledWith('order.cancelled',order);
});
test.each(['pending','failed','refunded','partial_refund','refund_pending','cancelled'])('admin cannot confirm a prepaid order with %s payment', async (status) => {
  order.payment_status=status; releaseCommit(); await expect(service.confirmOrder(1,5)).rejects.toThrow('payment');
  expect(order.update).not.toHaveBeenCalled(); expect(OrderStatusHistory.create).not.toHaveBeenCalled(); expect(scheduled).toHaveLength(0);
});
test('unpaid COD confirmation is allowed', async () => {
  Object.assign(order,{payment_type:'cod',payment_status:'pending'});releaseCommit();await service.confirmOrder(1,5);await flush();
  expect(order.status).toBe('confirmed');expect(events.emit).toHaveBeenCalledTimes(1);
});
