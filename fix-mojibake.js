// Fix double-encoded UTF-8 (mojibake) in source files.
// Method: walk runs of bytes that look like UTF-8 (per RFC 3629),
// converting each char back to its Win1252 byte then decoding as UTF-8.
// Only replace when the result is a valid UTF-8 sequence whose
// re-encoded bytes match the original byte stream — safe no-op otherwise.

const fs = require('fs');

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

// UTF-8 start-byte detection
function utf8Len(b) {
  if ((b & 0x80) === 0x00) return 1; // ASCII
  if ((b & 0xE0) === 0xC0) return 2;
  if ((b & 0xF0) === 0xE0) return 3;
  if ((b & 0xF8) === 0xF0) return 4;
  return 0;
}
function isCont(b) { return (b & 0xC0) === 0x80; }

function fixText(text) {
  // 1. Convert every char to its Win1252 byte where possible.
  //    For chars we can't map, leave the char as a JS code point and
  //    we'll splice them back in around the byte runs.
  const tokens = []; // array of { type: 'byte'|'char', value }
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const b = toW1252Byte(cp);
    if (b !== undefined) tokens.push({ type: 'byte', value: b });
    else tokens.push({ type: 'char', value: ch });
  }

  // 2. Walk through, find runs of bytes that form a valid UTF-8 sequence
  //    starting with a multi-byte start byte. Replace those bytes with
  //    the decoded text. ASCII bytes (0x00-0x7F) are kept as-is unless
  //    they were originally ASCII (not from mojibake), which they always
  //    are since toW1252Byte for ASCII just returns the codepoint.
  let out = '';
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === 'char') {
      out += t.value;
      i++;
      continue;
    }
    const b0 = t.value;
    const len = utf8Len(b0);
    if (len >= 2) {
      // try to gather `len` bytes
      if (i + len <= tokens.length) {
        let ok = true;
        const bytes = [b0];
        for (let k = 1; k < len; k++) {
          const tk = tokens[i + k];
          if (tk.type !== 'byte' || !isCont(tk.value)) { ok = false; break; }
          bytes.push(tk.value);
        }
        if (ok) {
          const decoded = Buffer.from(bytes).toString('utf8');
          // sanity check: re-encoding gives same bytes (no replacement char)
          const reenc = Buffer.from(decoded, 'utf8');
          if (reenc.length === bytes.length && reenc.equals(Buffer.from(bytes))) {
            out += decoded;
            i += len;
            continue;
          }
        }
      }
    }
    // Not a valid multi-byte UTF-8 start — keep original char
    out += String.fromCodePoint(b0);
    i++;
  }
  return out;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node fix-mojibake.js <file> [<file> ...]');
  process.exit(1);
}

for (const f of files) {
  const orig = fs.readFileSync(f, 'utf8');
  const fixed = fixText(orig);
  if (orig === fixed) {
    console.log('unchanged: ' + f);
  } else {
    fs.writeFileSync(f, fixed, 'utf8');
    const dBefore = (orig.match(/[-￿]/g) || []).length;
    const dAfter = (fixed.match(/[-￿]/g) || []).length;
    console.log('fixed:     ' + f + '  (non-ASCII ' + dBefore + ' -> ' + dAfter + ')');
  }
}
