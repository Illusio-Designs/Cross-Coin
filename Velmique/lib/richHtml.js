import DOMPurify from 'isomorphic-dompurify';

const RICH_TAGS = ['p','br','hr','div','span','strong','b','em','i','u','s','sub','sup','mark','h1','h2','h3','h4','h5','h6','ol','ul','li','blockquote','pre','code','a','img','figure','figcaption','table','thead','tbody','tr','th','td'];
const RICH_ATTR = ['href','target','rel','title','src','alt','width','height','loading','class','style'];

export function sanitizeRich(html) {
  return DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS: RICH_TAGS,
    ALLOWED_ATTR: RICH_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

export function richHtml(html) {
  return { dangerouslySetInnerHTML: { __html: sanitizeRich(html) } };
}
