'use client';

import { useEffect, useRef, useState } from 'react';

function VideoCard({ video, index }) {
  const player = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  // The video file is attached only once the card is close to the screen (or
  // the shopper taps play): opening the page downloads no video at all. These
  // sit well below the first screen, and fetching them at load slowed the page
  // and logged failed requests in page-speed tests.
  const [near, setNear] = useState(false);
  const [wantPlay, setWantPlay] = useState(false);

  useEffect(() => {
    const media = player.current;
    if (!('IntersectionObserver' in window)) { setNear(true); setVisible(true); return; }
    const nearObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); nearObserver.disconnect(); }
    }, { rootMargin: '300px 0px' });
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25);
    }, { threshold: [0, 0.25] });
    nearObserver.observe(media);
    observer.observe(media);
    return () => { nearObserver.disconnect(); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const media = player.current;
    const syncPlayback = () => {
      if (!near) return;
      if (visible && !document.hidden) {
        // Browser autoplay restrictions leave the manual play button available.
        media.play().catch(() => {});
      } else media.pause();
    };
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    return () => document.removeEventListener('visibilitychange', syncPlayback);
  }, [visible, near]);

  // A tap before the file was attached: attach it, then play once it is set.
  useEffect(() => {
    if (!wantPlay || !near) return;
    setWantPlay(false);
    player.current.play().catch(() => setError('Unable to play this video. Please try again.'));
  }, [wantPlay, near]);

  const play = async () => {
    setError('');
    setStarted(true);
    if (!near) { setNear(true); setWantPlay(true); return; }
    try { await player.current.play(); }
    catch { setError('Unable to play this video. Please try again.'); }
  };
  return (
    <figure className="product-video-card">
      <div className="product-video-frame">
        <video
          ref={player}
          src={near ? video.url : undefined}
          poster={video.poster || undefined}
          preload={near ? 'metadata' : 'none'}
          autoPlay={near && visible}
          muted
          loop
          playsInline
          controls={started}
          aria-label={video.caption || `Soxbae product video ${index + 1}`}
          onPlay={() => { setPlaying(true); setStarted(true); setError(''); }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => { if (!near) return; setPlaying(false); setError('This video is unavailable. Please try again later.'); }}
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
