const { normalizeDescriptionMedia } = require('../../utils/descriptionMedia');
const base = 'https://api.crosscoin.in';
test.each([
  ['/uploads/products/info.png', `${base}/api/uploads/products/info.png`],
  ['/api/uploads/products/info.png', `${base}/api/uploads/products/info.png`],
  ['uploads/products/info.png', `${base}/api/uploads/products/info.png`],
  [`${base}/uploads/products/info.png`, `${base}/api/uploads/products/info.png`],
  ['http://localhost:5000/uploads/products/info.png', `${base}/api/uploads/products/info.png`],
  ['https://ik.imagekit.io/store/uploads/products/info.png', 'https://ik.imagekit.io/store/uploads/products/info.png'],
  ['https://external.test/uploads/info.png', 'https://external.test/uploads/info.png'],
  ['data:image/png;base64,abc', 'data:image/png;base64,abc'],
])('repairs local sources without altering external image %s', (source, expected) => {
  expect(normalizeDescriptionMedia(`<p>Details</p><img src="${source}" alt="Infographic">`, base)).toBe(`<p>Details</p><img src="${expected}" alt="Infographic">`);
});
test('preserves non-image markup and image query parameters', () => {
  const html = `<a href="/uploads/manual.pdf">Download</a><img alt='Info' src='/uploads/products/info.png?w=800&amp;h=300'>`;
  expect(normalizeDescriptionMedia(html, base)).toBe(`<a href="/uploads/manual.pdf">Download</a><img alt='Info' src='${base}/api/uploads/products/info.png?w=800&amp;h=300'>`);
});
test('normalization is idempotent and handles missing description', () => {
  const fixed = normalizeDescriptionMedia('<img src="/uploads/products/info.png">', base);
  expect(normalizeDescriptionMedia(fixed, base)).toBe(fixed);
  expect(normalizeDescriptionMedia(null, base)).toBeNull();
});
