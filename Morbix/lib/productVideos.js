function mediaUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? value : '';
  } catch { return ''; }
}

export function productVideos(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((video) => {
    const url = mediaUrl(video?.url);
    return url ? [{ url, poster: mediaUrl(video.poster), caption: String(video.caption || '').trim().slice(0, 300) }] : [];
  });
}

// Some MySQL/MariaDB responses return the JSON attributes column as text.
export function videosForProduct(product) {
  const direct = productVideos(product?.videos);
  if (direct.length) return direct;
  let attributes = product?.attributes;
  if (typeof attributes === 'string') {
    try { attributes = JSON.parse(attributes); } catch { return []; }
  }
  return productVideos(attributes?._videos);
}
