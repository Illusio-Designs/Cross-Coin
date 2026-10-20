// Attributes (Dashboard → Attributes) and the store menu's "Shop by …" filters.
//
// Product variations keep their attributes as JSON keyed by the attribute's
// NAME, e.g. {"color":["Black"],"size":["M"]} (the editor lower-cases keys and
// stores lists; older rows may hold a single string or the original casing).
// So everything here matches case-insensitively and accepts both shapes, and
// renaming an attribute or a choice rewrites the variations that use it —
// otherwise those products silently drop out of the menu filters.
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { Attribute, AttributeValue } = require('../model/associations.js');
const cacheManager = require('./cacheManager.js');

const LIST_TYPES = ['select', 'color', 'size'];
const lc = (v) => String(v ?? '').trim().toLowerCase();
const httpError = (status, message) => Object.assign(new Error(message), { status });

function parseAttrs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : {}; } catch { return {}; }
}
const asList = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).map((x) => String(x));

// Which products / variations use each attribute and choice.
// brandId → only products that store sells (product_brands, or the product's
// own brand_id when it has no store links), like the storefront lists them.
async function usageIndex(brandId) {
  const b = Number(brandId) || null;
  const rows = await sequelize.query(
    `SELECT pv.productId AS product_id, pv.attributes
       FROM product_variations pv
       JOIN products p ON p.id = pv.productId
      WHERE p.status = 'active' AND pv.status = 'active' AND pv.attributes IS NOT NULL
        ${b ? `AND (EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id AND pb.brand_id = :b AND (pb.status IS NULL OR pb.status = 'active'))
               OR (p.brand_id = :b AND NOT EXISTS (SELECT 1 FROM product_brands pb2 WHERE pb2.product_id = p.id)))` : ''}`,
    { replacements: { b }, type: QueryTypes.SELECT }
  );
  const byKey = new Map();
  for (const r of rows) {
    const attrs = parseAttrs(r.attributes);
    for (const [key, val] of Object.entries(attrs)) {
      const k = lc(key);
      if (!k || k === '_images') continue;
      const e = byKey.get(k) || { products: new Set(), variations: 0, values: new Map() };
      e.products.add(r.product_id);
      e.variations += 1;
      for (const v of asList(val)) {
        const vk = lc(v);
        if (!vk) continue;
        const ve = e.values.get(vk) || { products: new Set(), variations: 0 };
        ve.products.add(r.product_id);
        ve.variations += 1;
        e.values.set(vk, ve);
      }
      byKey.set(k, e);
    }
  }
  return byKey;
}

async function clearMenuCache() {
  try { await cacheManager.invalidate('mega-menu:*'); } catch { /* cache is best-effort */ }
}

// ── Admin overview ───────────────────────────────────────────────────────────
async function overview(brandId) {
  const b = Number(brandId) || null;
  const where = { status: 'active' };
  const attrs = await Attribute.findAll({
    where,
    include: [{ model: AttributeValue, required: false }],
    order: [['displayOrder', 'ASC'], ['id', 'ASC'], [AttributeValue, 'displayOrder', 'ASC'], [AttributeValue, 'id', 'ASC']],
  });
  const usage = await usageIndex(b);
  const list = attrs
    .filter((a) => !b || a.brand_id == null || Number(a.brand_id) === b)
    .map((a) => {
      const u = usage.get(lc(a.name));
      const values = (a.AttributeValues || []).map((v) => {
        const vu = u?.values.get(lc(v.value));
        return { id: v.id, value: v.value, hidden: v.status !== 'active', products: vu ? vu.products.size : 0, variations: vu ? vu.variations : 0 };
      });
      return {
        id: a.id, name: a.name, type: a.type, list: LIST_TYPES.includes(a.type), isRequired: !!a.isRequired,
        displayOrder: a.displayOrder, brandId: a.brand_id, shared: a.brand_id == null,
        products: u ? u.products.size : 0, variations: u ? u.variations : 0, values,
      };
    });
  const allValues = list.flatMap((a) => (a.list ? a.values : []));
  const unused = allValues.filter((v) => !v.hidden && !v.products);
  return {
    attributes: list,
    summary: {
      attributes: list.length,
      lists: list.filter((a) => a.list).length,
      text: list.filter((a) => !a.list).length,
      choices: allValues.length,
      hidden: allValues.filter((v) => v.hidden).length,
      unused: unused.length,
      unusedNames: unused.slice(0, 4).map((v) => v.value),
      menuFilters: list.filter((a) => a.list && a.values.some((v) => !v.hidden && v.products)).length,
    },
  };
}

// ── Rewrites on rename ───────────────────────────────────────────────────────
// Rewrite every variation that uses `oldKey` (and optionally one of its
// values). Returns how many variations changed.
async function rewriteVariations(transaction, { oldKey, newKey, oldValue = null, newValue = null }) {
  const ok = lc(oldKey);
  const rows = await sequelize.query(
    'SELECT id, attributes FROM product_variations WHERE attributes IS NOT NULL AND LOWER(attributes) LIKE :needle',
    { replacements: { needle: `%${ok.replace(/[\\%_]/g, (c) => `\\${c}`)}%` }, type: QueryTypes.SELECT, transaction }
  );
  let changed = 0;
  for (const r of rows) {
    const attrs = parseAttrs(r.attributes);
    let dirty = false;
    const out = {};
    for (const [key, val] of Object.entries(attrs)) {
      if (key === '_images' && val && typeof val === 'object') {
        const imgs = {};
        for (const [ik, group] of Object.entries(val)) {
          const isKey = lc(ik) === ok;
          let g = group;
          if (isKey && oldValue != null && group && typeof group === 'object') {
            g = {};
            for (const [gv, url] of Object.entries(group)) {
              if (lc(gv) === lc(oldValue)) { g[newValue] = url; dirty = true; } else g[gv] = url;
            }
          }
          const nk = isKey && newKey && newKey !== ik ? lc(newKey) : ik;
          if (nk !== ik) dirty = true;
          imgs[nk] = g;
        }
        out._images = imgs;
        continue;
      }
      if (lc(key) !== ok) { out[key] = val; continue; }
      let v = val;
      if (oldValue != null) {
        const swap = (x) => (lc(x) === lc(oldValue) ? (dirty = true, newValue) : x);
        v = Array.isArray(val) ? val.map(swap) : swap(val);
      }
      const nk = newKey ? lc(newKey) : key;
      if (nk !== key) dirty = true;
      out[nk] = v;
    }
    if (dirty) {
      await sequelize.query('UPDATE product_variations SET attributes = :a WHERE id = :id', { replacements: { a: JSON.stringify(out), id: r.id }, transaction });
      changed += 1;
    }
  }
  return changed;
}

// ── Writes ───────────────────────────────────────────────────────────────────
async function assertNameFree(name, exceptId, transaction) {
  const [taken] = await sequelize.query(
    "SELECT id, name FROM attributes WHERE status = 'active' AND LOWER(TRIM(name)) = :n AND id <> :id LIMIT 1",
    { replacements: { n: lc(name), id: Number(exceptId) || 0 }, type: QueryTypes.SELECT, transaction }
  );
  if (taken) throw httpError(409, `There is already an attribute called “${taken.name}”.`);
}

function cleanValues(values) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(values) ? values : String(values || '').split(/[,\n]/)) {
    const v = String(raw || '').trim().slice(0, 100);
    if (v && !seen.has(lc(v))) { seen.add(lc(v)); out.push(v); }
  }
  return out;
}

async function create({ name, type = 'select', isRequired = false, values = [] }) {
  const n = String(name || '').trim().slice(0, 100);
  if (!n) throw httpError(400, 'Give the attribute a name, like Color or Size.');
  const t = ['select', 'text'].includes(type) ? type : 'select';
  return sequelize.transaction(async (transaction) => {
    await assertNameFree(n, null, transaction);
    const max = await Attribute.max('displayOrder', { where: { status: 'active' }, transaction });
    const attr = await Attribute.create({ name: n, type: t, isRequired: !!isRequired, displayOrder: (Number(max) || 0) + 1, status: 'active', brand_id: null }, { transaction });
    if (t === 'select') {
      const vals = cleanValues(values);
      for (let i = 0; i < vals.length; i += 1) await AttributeValue.create({ attributeId: attr.id, value: vals[i], displayOrder: i, status: 'active' }, { transaction });
    }
    return attr.id;
  }).then(async (id) => { await clearMenuCache(); return { id }; });
}

async function update(id, { name, type, isRequired }) {
  const result = await sequelize.transaction(async (transaction) => {
    const attr = await Attribute.findOne({ where: { id, status: 'active' }, transaction });
    if (!attr) throw httpError(404, 'Attribute not found.');
    const patch = {};
    let renamed = 0;
    if (name !== undefined) {
      const n = String(name || '').trim().slice(0, 100);
      if (!n) throw httpError(400, 'The name can’t be empty.');
      if (n !== attr.name) {
        await assertNameFree(n, attr.id, transaction);
        if (lc(n) !== lc(attr.name)) renamed = await rewriteVariations(transaction, { oldKey: attr.name, newKey: n });
        patch.name = n;
      }
    }
    if (type !== undefined) {
      // Keep the finer list kinds (color/size) when it stays a list.
      if (type === 'text' && attr.type !== 'text') patch.type = 'text';
      if (type === 'select' && attr.type === 'text') patch.type = 'select';
    }
    if (isRequired !== undefined) patch.isRequired = !!isRequired;
    if (Object.keys(patch).length) await attr.update(patch, { transaction });
    return { renamedVariations: renamed };
  });
  await clearMenuCache();
  return result;
}

async function remove(id) {
  const attr = await Attribute.findOne({ where: { id, status: 'active' } });
  if (!attr) throw httpError(404, 'Attribute not found.');
  const u = (await usageIndex(null)).get(lc(attr.name));
  if (u && u.products.size) throw httpError(409, `“${attr.name}” is used on ${u.products.size} product${u.products.size === 1 ? '' : 's'} — change those products first.`);
  await sequelize.transaction(async (transaction) => {
    await attr.update({ status: 'inactive' }, { transaction });
    await AttributeValue.update({ status: 'inactive' }, { where: { attributeId: id }, transaction });
  });
  await clearMenuCache();
  return { ok: true };
}

async function addValues(id, values) {
  const added = await sequelize.transaction(async (transaction) => {
    const attr = await Attribute.findOne({ where: { id, status: 'active' }, include: [{ model: AttributeValue, required: false }], transaction });
    if (!attr) throw httpError(404, 'Attribute not found.');
    const existing = new Map((attr.AttributeValues || []).map((v) => [lc(v.value), v]));
    let order = Math.max(-1, ...(attr.AttributeValues || []).map((v) => Number(v.displayOrder) || 0)) + 1;
    const out = [];
    for (const v of cleanValues(values)) {
      const ex = existing.get(lc(v));
      if (ex) { if (ex.status !== 'active') { await ex.update({ status: 'active' }, { transaction }); out.push(ex.value); } continue; }
      await AttributeValue.create({ attributeId: attr.id, value: v, displayOrder: order, status: 'active' }, { transaction });
      order += 1;
      out.push(v);
    }
    return out;
  });
  await clearMenuCache();
  return { added };
}

async function updateValue(id, valueId, { value, hidden }) {
  const result = await sequelize.transaction(async (transaction) => {
    const attr = await Attribute.findOne({ where: { id, status: 'active' }, include: [{ model: AttributeValue, required: false }], transaction });
    if (!attr) throw httpError(404, 'Attribute not found.');
    const row = (attr.AttributeValues || []).find((v) => Number(v.id) === Number(valueId));
    if (!row) throw httpError(404, 'Choice not found.');
    const patch = {};
    let renamed = 0;
    if (value !== undefined) {
      const v = String(value || '').trim().slice(0, 100);
      if (!v) throw httpError(400, 'The choice can’t be empty.');
      if (v !== row.value) {
        const clash = (attr.AttributeValues || []).find((x) => Number(x.id) !== Number(row.id) && lc(x.value) === lc(v));
        if (clash) throw httpError(409, `“${clash.value}” is already a choice.`);
        renamed = await rewriteVariations(transaction, { oldKey: attr.name, oldValue: row.value, newValue: v });
        patch.value = v;
      }
    }
    if (hidden !== undefined) patch.status = hidden ? 'inactive' : 'active';
    if (Object.keys(patch).length) await row.update(patch, { transaction });
    return { renamedVariations: renamed };
  });
  await clearMenuCache();
  return result;
}

async function removeValue(id, valueId) {
  const attr = await Attribute.findOne({ where: { id, status: 'active' }, include: [{ model: AttributeValue, required: false }] });
  if (!attr) throw httpError(404, 'Attribute not found.');
  const row = (attr.AttributeValues || []).find((v) => Number(v.id) === Number(valueId));
  if (!row) throw httpError(404, 'Choice not found.');
  const vu = (await usageIndex(null)).get(lc(attr.name))?.values.get(lc(row.value));
  if (vu && vu.products.size) throw httpError(409, `“${row.value}” is on ${vu.products.size} product${vu.products.size === 1 ? '' : 's'} — hide it instead, or change those products first.`);
  await row.destroy();
  await clearMenuCache();
  return { ok: true };
}

async function reorder({ attributeIds, attributeId, valueIds }) {
  await sequelize.transaction(async (transaction) => {
    if (Array.isArray(attributeIds)) {
      for (let i = 0; i < attributeIds.length; i += 1) await Attribute.update({ displayOrder: i + 1 }, { where: { id: attributeIds[i] }, transaction });
    }
    if (attributeId && Array.isArray(valueIds)) {
      for (let i = 0; i < valueIds.length; i += 1) await AttributeValue.update({ displayOrder: i }, { where: { id: valueIds[i], attributeId }, transaction });
    }
  });
  await clearMenuCache();
  return { ok: true };
}

// ── Store menu: "Shop by …" with product counts for one store ───────────────
async function megaMenu(brandId) {
  const b = Number(brandId) || null;
  const attrs = await Attribute.findAll({
    where: { status: 'active' },
    include: [{ model: AttributeValue, where: { status: 'active' }, required: false }],
    order: [['displayOrder', 'ASC'], ['id', 'ASC'], [AttributeValue, 'displayOrder', 'ASC'], [AttributeValue, 'id', 'ASC']],
  });
  const usage = await usageIndex(b);
  const out = [];
  for (const a of attrs) {
    if (b && a.brand_id != null && Number(a.brand_id) !== b) continue; // shared + this store's own
    if (!LIST_TYPES.includes(a.type)) continue; // free text isn't a filter
    const u = usage.get(lc(a.name));
    const values = (a.AttributeValues || [])
      .map((v) => ({ id: v.id, value: v.value, product_count: u?.values.get(lc(v.value))?.products.size || 0 }))
      .filter((v) => v.product_count > 0);
    if (values.length) out.push({ id: a.id, name: a.name, values });
  }
  return out;
}

module.exports = { overview, create, update, remove, addValues, updateValue, removeValue, reorder, megaMenu, usageIndex, LIST_TYPES };
