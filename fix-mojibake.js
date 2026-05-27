// Fix N layers of UTF-8 mojibake (double/triple-encoded text) in source files.
// Walk runs of code points, mapping each back to a Win1252 byte where possible,
// then decode adjacent bytes as UTF-8. Apply repeatedly until stable.
// Safety: only replaces when re-encoding the decoded text yields the same bytes.

const fs = require('fs');
const path = require('path');

const w1252 = {
  0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,
  0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,
  0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,
  0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,
  0x0153:0x9C,0x017E:0x9E,0x0178:0x9F
};

function toW1252Byte(cp) {
  if (cp <= 0xFF) return cp;
  return w1252[cp];
}
function utf8Len(b) {
  if ((b & 0x80) === 0x00) return 1;
  if ((b & 0xE0) === 0xC0) return 2;
  if ((b & 0xF0) === 0xE0) return 3;
  if ((b & 0xF8) === 0xF0) return 4;
  return 0;
}
function isCont(b) { return (b & 0xC0) === 0x80; }

function fixOnce(text) {
  const tokens = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const b = toW1252Byte(cp);
    if (b !== undefined) tokens.push({ type: 'byte', value: b });
    else tokens.push({ type: 'char', value: ch });
  }
  let out = '';
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === 'char') { out += t.value; i++; continue; }
    const b0 = t.value;
    const len = utf8Len(b0);
    if (len >= 2 && i + len <= tokens.length) {
      let ok = true;
      const bytes = [b0];
      for (let k = 1; k < len; k++) {
        const tk = tokens[i + k];
        if (tk.type !== 'byte' || !isCont(tk.value)) { ok = false; break; }
        bytes.push(tk.value);
      }
      if (ok) {
        const buf = Buffer.from(bytes);
        const decoded = buf.toString('utf8');
        const reenc = Buffer.from(decoded, 'utf8');
        if (reenc.length === bytes.length && reenc.equals(buf)) {
          out += decoded;
          i += len;
          continue;
        }
      }
    }
    out += String.fromCodePoint(b0);
    i++;
  }
  return out;
}

function fixUntilStable(text, maxRounds) {
  if (!maxRounds) maxRounds = 8;
  let cur = text;
  let rounds = 0;
  while (rounds < maxRounds) {
    const next = fixOnce(cur);
    rounds++;
    if (next === cur) break;
    cur = next;
  }
  return { text: cur, rounds: rounds };
}

function countNonAscii(s) {
  let n = 0;
  for (const c of s) if (c.codePointAt(0) > 0x7F) n++;
  return n;
}

// Walk a directory tree, yielding files matching extensions.
const EXT_OK = new Set([
  '.js','.jsx','.ts','.tsx','.mjs','.cjs',
  '.css','.scss','.sass','.less',
  '.html','.htm','.svg','.xml',
  '.json','.md','.txt','.env'
]);
const SKIP_DIRS = new Set(['node_modules','.git','.next','dist','build','out','.vercel','.cache']);

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) yield* walk(p);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (EXT_OK.has(ext)) yield p;
    }
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node fix-mojibake.js <file-or-dir> [...]');
  process.exit(1);
}

const targets = [];
for (const a of args) {
  const st = fs.statSync(a);
  if (st.isDirectory()) for (const f of walk(a)) targets.push(f);
  else targets.push(a);
}

let changed = 0;
for (const f of targets) {
  let orig;
  try { orig = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
  const res = fixUntilStable(orig);
  const fixed = res.text;
  if (orig !== fixed) {
    fs.writeFileSync(f, fixed, 'utf8');
    console.log('fixed: ' + f + '  (non-ASCII ' + countNonAscii(orig) + ' -> ' + countNonAscii(fixed) + ', rounds ' + res.rounds + ')');
    changed++;
  }
}
console.log('\nscanned ' + targets.length + ' files, changed ' + changed);
