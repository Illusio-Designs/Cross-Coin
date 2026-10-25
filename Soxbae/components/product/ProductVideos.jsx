'use client';

import { useEffect, useRef, useState } from 'react';

function VideoCard({ video, index }) {
  const player = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const media = player.current;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25);
    }, { threshold: [0, 0.25] });
    observer.observe(media);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = player.current;
    const syncPlayback = () => {
      if (visible && !document.hidden) {
        // Browser autoplay restrictions leave the manual play button available.
        media.play().catch(() => {});
      } else media.pause();
    };
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    return () => document.removeEventListener('visibilitychange', syncPlayback);
  }, [visible]);
  const play = async () => {
    setError('');
    setStarted(true);
    try { await player.current.play(); }
    catch { setError('Unable to play this video. Please try again.'); }
  };
  return (
    <figure className="product-video-card">
      <div className="product-video-frame">
        <video
          ref={player}
          src={video.url}
          poster={video.poster || undefined}
          preload="metadata"
          autoPlay={visible}
          muted
          loop
          playsInline
          controls={started}
          aria-label={video.caption || `Soxbae product video ${index + 1}`}
          onPlay={() => { setPlaying(true); setStarted(true); setError(''); }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => { setPlaying(false); setError('This video is unavailable. Please try again later.'); }}
        />
        {!playing && <button type="button" className="product-video-play" onClick={play} aria-label={`Play product video ${index + 1}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" /></svg>
        </button>}
      </div>
      {video.caption && <figcaption>{video.caption}</figcaption>}
      {error && <p className="product-video-error" role="status">{error}</p>}
    </figure>
  );
}

export default function ProductVideos({ videos = [] }) {
  if (!videos.length) return null;
  return (
    <section className="product-videos" aria-label="Soxbae product videos">
      <div className="product-video-grid">
        {videos.map((video, index) => <VideoCard key={`${video.url}-${index}`} video={video} index={index} />)}
      </div>
    </section>
  );
}
