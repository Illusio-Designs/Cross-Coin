const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const worker = fs.readFileSync(path.join(__dirname, '../../Dashboard/public/sw.js'), 'utf8');

function runWorker() {
  const handlers = new Map();
  const notifications = [];
  const self = {
    addEventListener: (event, fn) => handlers.set(event, fn),
    registration: {
      getNotifications: async ({ tag }) => notifications.filter((item) => item.tag === tag),
      showNotification: async (_, options) => notifications.push(options),
    },
  };
  vm.runInNewContext(worker, { self });
  const push = (tag) => {
    let done;
    handlers.get('push')({
      data: { json: () => ({ title: 'Order alert', tag }) },
      waitUntil: (promise) => { done = promise; },
    });
    return done;
  };
  return { notifications, push };
}

test('simultaneous and repeated pushes for one order show one device alert', async () => {
  const { notifications, push } = runWorker();
  await Promise.all([push('order-MX-1'), push('order-MX-1')]);
  await push('order-MX-1');
  await push('order-MX-2');
  assert.deepEqual(notifications.map(({ tag, renotify }) => [tag, renotify]), [
    ['order-MX-1', false], ['order-MX-2', false],
  ]);
});

test('the push test button can send more than one test alert', async () => {
  const { notifications, push } = runWorker();
  await push('push-test');
  await push('push-test');
  assert.equal(notifications.length, 2);
  assert.ok(notifications.every(({ renotify }) => renotify));
});
