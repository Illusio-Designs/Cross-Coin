// Fix N layers of UTF-8 mojibake (double/triple-encoded text)
const fs = require('fs');
const path = require('path');

const w1252 = {
  0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,
  0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,
  0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,
  0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,
  0x0153:0x9C,0x017E:0x9E,0x0178:0x9F
};

function toW1252Byte(cp) { return cp <= 0xFF ? cp : w1252[cp]; }
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
    tokens.push({ byte: b, ch: ch });
  }
  let out = '';
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const b0 = t.byte;
    const len = b0 !== undefined ? utf8Len(b0) : 0;
    if (len >= 2 && i + len <= tokens.length) {
      let ok = true;
      const bytes = [b0];
      for (let k = 1; k < len; k++) {
        const tk = tokens[i + k];
        if (tk.byte === undefined || !isCont(tk.byte)) { ok = false; break; }
        bytes.push(tk.byte);
      }
      if (ok) {
        const buf = Buffer.from(bytes);
        const decoded = buf.toString('utf8');
        const reenc = Buffer.from(decoded, 'utf8');
        if (reenc.length === bytes.length && reenc.equals(buf) && !decoded.includes('�')) {
          out += decoded;
          i += len;
          continue;
        }
      }
    }
    out += t.ch;
    i++;
  }
  return out;
}

const MOJI_CHARS = new Set([0x00C3, 0x00C2, 0x00E2, 0x00E3, 0x00C4, 0x00C5, 0x20AC, 0x201A, 0x201C, 0x201D, 0x2013, 0x2014, 0x0152, 0x0153, 0x0178, 0x017D, 0x017E, 0x0160, 0x0161, 0x2026, 0x2020, 0x2021, 0x02C6, 0x02DC, 0x2030, 0x2039, 0x203A, 0x2018, 0x2019, 0x2022]);
function mojiScore(s) {
  let n = 0;
  for (const c of s) {
    const cp = c.codePointAt(0);
    if (cp >= 0x80 && cp <= 0x9F) n += 2;
    else if (MOJI_CHARS.has(cp)) n += 1;
    else if ((cp >= 0xC0 && cp <= 0xFF) && cp !== 0xD7 && cp !== 0xF7) n += 1;
  }
  return n;
}

function fixUntilStable(text, maxRounds = 8) {
  let best = text;
  let bestScore = mojiScore(text);
  let cur = text;
  let usedRounds = 0;
  for (let r = 0; r < maxRounds; r++) {
    const next = fixOnce(cur);
    if (next === cur) break;
    usedRounds = r + 1;
    const ns = mojiScore(next);
    if (ns < bestScore) { best = next; bestScore = ns; }
    cur = next;
  }
  return { text: best, rounds: usedRounds };
}

function countNonAscii(s) {
  let n = 0;
  for (const c of s) if (c.codePointAt(0) > 0x7F) n++;
  return n;
}

const EXT_OK = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.css','.scss','.sass','.less','.html','.htm','.svg','.xml','.json','.md','.txt','.env']);
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

console.log(`\n🔍 Scanning ${targets.length} files for mojibake...\n`);
let changed = 0;
for (const f of targets) {
  let orig;
  try { orig = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
  const res = fixUntilStable(orig);
  const fixed = res.text;
  if (orig !== fixed) {
    fs.writeFileSync(f, fixed, 'utf8');
    console.log(`✅ FIXED: ${f}`);
    console.log(`   Non-ASCII chars: ${countNonAscii(orig)} → ${countNonAscii(fixed)}, Rounds: ${res.rounds}`);
    changed++;
  }
}
console.log(`\n📊 Results: Scanned ${targets.length} files, Fixed ${changed}\n`);
