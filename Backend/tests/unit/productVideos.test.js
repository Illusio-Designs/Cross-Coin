const { parseProductAttributes, mergeProductAttributes } = require('../../utils/productAttributes');
const { normalizeProductVideos, matchesVideoHeader, MAX_PRODUCT_VIDEOS, MAX_PRODUCT_VIDEO_BYTES } = require('../../utils/productVideos');

const video = { url: 'https://cdn.example.com/socks.mp4', caption: '  How to wear Morbix  ', poster: 'https://cdn.example.com/cover.jpg' };

describe('Product video metadata', () => {
  test('round-trips the uploaded video, caption and cover through product attributes JSON', () => {
    const attributes = parseProductAttributes(JSON.stringify({ notes: [{ name: 'Cotton', image: '' }], _videos: [video] }));
    expect(attributes.notes[0].name).toBe('Cotton');
    expect(normalizeProductVideos(attributes._videos)).toEqual([{ ...video, caption: 'How to wear Morbix' }]);
  });
  test('supports removing all videos and products without videos', () => {
    expect(normalizeProductVideos([], { strict: true })).toEqual([]);
    expect(normalizeProductVideos(undefined)).toEqual([]);
  });
  test.each(['javascript:alert(1)', 'data:video/mp4;base64,abcd', '//evil.example/video', 'https://user:secret@example.com/a.mp4'])('rejects unsafe media URL %s', (url) => {
    expect(() => normalizeProductVideos([{ ...video, url }], { strict: true })).toThrow();
    expect(normalizeProductVideos([{ ...video, url }])).toEqual([]);
  });
  test('rejects invalid covers, malformed metadata and too many videos', () => {
    expect(() => normalizeProductVideos([{ ...video, poster: 'javascript:alert(1)' }], { strict: true })).toThrow();
    expect(() => normalizeProductVideos('bad', { strict: true })).toThrow();
    expect(() => normalizeProductVideos(Array(5).fill(video), { strict: true })).toThrow();
    expect(MAX_PRODUCT_VIDEOS).toBe(4);
    expect(MAX_PRODUCT_VIDEO_BYTES).toBe(50 * 1024 * 1024);
  });
  test('caps captions and ignores unsafe legacy entries on reads', () => {
    expect(normalizeProductVideos([{ ...video, caption: 'a'.repeat(400) }])[0].caption).toHaveLength(300);
    expect(normalizeProductVideos([null, video])).toHaveLength(1);
  });
});

test('updates preserve other attribute groups and video order; explicit empty videos removes the section', () => {
  const previous = { notes: [], _videos: [video] };
  expect(mergeProductAttributes(JSON.stringify({ notes: ['Cotton'] }), previous)._videos).toEqual([video]);
  expect(mergeProductAttributes(JSON.stringify({ notes: [], _videos: [] }), previous)._videos).toEqual([]);
  expect(mergeProductAttributes(undefined, previous)).toBeUndefined();
  const next = parseProductAttributes({ notes: ['Cotton'], accords: [{ name: 'Fresh', image: '' }], _videos: [{ ...video, caption: 'Second' }, { ...video, caption: 'First' }] });
  expect(next.accords[0].name).toBe('Fresh');
  expect(next._videos.map(item => item.caption)).toEqual(['Second', 'First']);
});

describe('Product video signatures', () => {
  test('accepts MP4 and WebM container headers', () => {
    expect(matchesVideoHeader('video/mp4', Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109]))).toBe(true);
    expect(matchesVideoHeader('video/webm', Buffer.from([0x1a,0x45,0xdf,0xa3,0]))).toBe(true);
  });
  test('rejects a file whose content does not match its declared video MIME type', () => {
    expect(matchesVideoHeader('video/mp4', Buffer.from('<script>bad</script>'))).toBe(false);
    expect(matchesVideoHeader('video/mp4', Buffer.from('ftyp'))).toBe(false);
    expect(matchesVideoHeader('image/png', Buffer.alloc(12))).toBe(false);
  });
});
