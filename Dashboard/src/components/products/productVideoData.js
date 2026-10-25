// Read both API versions and MySQL/MariaDB JSON-column representations.
export function videosForProduct(product) {
  if (Array.isArray(product?.videos) && product.videos.length) return product.videos;
  let attributes = product?.attributes;
  if (typeof attributes === 'string') {
    try { attributes = JSON.parse(attributes); } catch { return []; }
  }
  return Array.isArray(attributes?._videos) ? attributes._videos : [];
}

export function detailImageForProduct(product) {
  let attributes = product?.attributes;
  if (typeof attributes === 'string') {
    try { attributes = JSON.parse(attributes); } catch { attributes = null; }
  }
  return product?.detailImage || attributes?._detailImage || null;
}
