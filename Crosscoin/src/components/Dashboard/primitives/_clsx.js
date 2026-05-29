/**
 * Tiny classnames helper so primitives don't all need to copy the same
 * filter/join boilerplate. Accepts strings, arrays, or falsy values.
 */
export default function clsx(...args) {
  const out = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === 'string') out.push(a);
    else if (Array.isArray(a)) out.push(clsx(...a));
  }
  return out.join(' ');
}
