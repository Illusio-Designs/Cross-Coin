// Calendar-day estimates use the store's Indian timezone, including near midnight.
export function getDeliveryEstimate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(now);
  const value = (type) => Number(parts.find((part) => part.type === type).value);
  const today = Date.UTC(value('year'), value('month') - 1, value('day'));
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric',
  });
  const deliveryDay = (offset) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + offset);
    return { dateTime: date.toISOString().slice(0, 10), label: format.format(date) };
  };
  return { earliest: deliveryDay(5), latest: deliveryDay(7) };
}
