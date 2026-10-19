/* Right-size ImageKit images per slot (width + auto format/quality) instead of
   shipping the full-resolution original to every card. Non-ImageKit URLs and
   URLs that already carry a transform are returned untouched. */
export function ik(src, w) {
  if (!src || typeof src !== 'string') return src || '';
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-${w},q-80,f-auto`;
  }
  return src;
}
