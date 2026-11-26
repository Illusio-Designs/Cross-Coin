const KEY = '_scent_descriptions';

function readAttributes(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function variationAttributesWithScentCopy(attributes, previous) {
  const next = { ...readAttributes(attributes) };
  const source = Object.hasOwn(next, KEY) ? next[KEY] : readAttributes(previous)[KEY];
  const copy = {};
  for (const phase of ['top', 'heart', 'base']) {
    const description = source?.[phase];
    if (typeof description === 'string' && description.trim()) {
      copy[phase] = description.trim().slice(0, 600);
    }
  }
  if (Object.keys(copy).length) next[KEY] = copy;
  else delete next[KEY];
  return next;
}

module.exports = { variationAttributesWithScentCopy, KEY };
