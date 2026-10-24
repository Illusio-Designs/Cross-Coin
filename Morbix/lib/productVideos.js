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
