const { variationAttributesWithScentCopy, KEY } = require('../../utils/scentDescriptions.js');

test('keeps the three phase descriptions as bounded text alongside attributes and images', () => {
  const attributes = { size: ['100 ml'], _images: { 'the scent experience': { 'First impression': 'image.webp' } } };
  expect(variationAttributesWithScentCopy({ ...attributes, [KEY]: {
    top: '  Bright strawberry.  ', heart: 'x'.repeat(601), base: ['Invalid'], unrelated: 'Ignored',
  } })).toEqual({ ...attributes, [KEY]: { top: 'Bright strawberry.', heart: 'x'.repeat(600) } });
});

test('older editors preserve saved copy and an explicit clear removes it', () => {
  const previous = JSON.stringify({ [KEY]: { base: 'Soft musk.' } });
  expect(variationAttributesWithScentCopy({ size: ['100 ml'] }, previous)).toEqual({
    size: ['100 ml'], [KEY]: { base: 'Soft musk.' },
  });
  expect(variationAttributesWithScentCopy({ size: ['100 ml'], [KEY]: { base: ' ' } }, previous))
    .toEqual({ size: ['100 ml'] });
});
