const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'product-videos-'));
process.env.UPLOAD_PATH = temporary;
const { productVideoUpload, validateProductVideos } = require('../../middleware/uploadMiddleware');
const app = express();
app.post('/api/products/upload-videos', productVideoUpload.array('videos', 4), validateProductVideos, (req, res) => res.json({ count: req.files.length, filenames: req.files.map(f => f.filename) }));
app.use((error, req, res, next) => res.status(400).json({ message: error.message }));
const valid = Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109]);
let server;
let endpoint;
beforeAll(async () => {
  server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  endpoint = `http://127.0.0.1:${server.address().port}/api/products/upload-videos`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await fs.promises.rm(temporary, { recursive: true, force: true });
});
const upload = async (files) => {
  const form = new FormData();
  for (const { field = 'videos', bytes = valid, type = 'video/mp4', name = 'demo.mp4' } of files) form.append(field, new Blob([bytes], { type }), name);
  const response = await fetch(endpoint, { method: 'POST', body: form });
  return { status: response.status, body: await response.json() };
};

test('accepts a video container upload using the separate videos field', async () => {
  const response = await upload([{}]);
  expect(response.status).toBe(200);
  expect(response.body.count).toBe(1);
  expect(response.body.filenames[0]).toMatch(/\.mp4$/);
});
test('rejects images and forged video content', async () => {
  expect((await upload([{ bytes: Buffer.from('image'), type: 'image/png', name: 'photo.png' }])).status).toBe(400);
  const forged = await upload([{ bytes: Buffer.from('<script>bad</script>') }]);
  expect(forged.status).toBe(400);
  expect(forged.body.message).toMatch(/content does not match/);
});
test('rejects more than four files and unexpected upload fields', async () => {
  expect((await upload(Array.from({ length: 5 }, () => ({})))).status).toBe(400);
  expect((await upload([{ field: 'images' }])).status).toBe(400);
});
