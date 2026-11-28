'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import styles from './ProductVideos.module.css';

function loadVideo(media) {
  if (!media.hasAttribute('src')) media.src = media.dataset.videoUrl;
  else if (media.error) media.load();
}

function VideoCard({ video, index, onPlay }) {
  const player = useRef(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(false);
  const label = video.caption || `Product video ${index + 1}`;

  const play = async () => {
    const media = player.current;
    setError(false);
    loadVideo(media);
    try {
      await media.play();
      media.focus({ preventScroll: true });
    } catch (failure) {
      if (failure.name !== 'AbortError') setError(true);
    }
  };

  return (
    <figure className={styles.card}>
      <div className={styles.frame}>
        <video
          ref={player}
          data-video-url={video.url}
          preload="none"
          playsInline
          controls={started && !error}
          tabIndex={started && !error ? 0 : -1}
          aria-label={label}
          onPlay={(event) => onPlay(event.currentTarget)}
          onPlaying={() => { setStarted(true); setError(false); }}
          onError={() => setError(true)}
        />
        {!started && video.poster && (
          <img className={styles.cover} src={video.poster} alt="" loading="lazy" decoding="async" />
        )}
        {(!started || error) && (
          <button type="button" className={styles.play} onClick={play} aria-label={`Play ${label}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" /></svg>
          </button>
        )}
      </div>
      {video.caption && <figcaption>{video.caption}</figcaption>}
      {error && <p className={styles.error} role="status">Couldn’t play this video. Try again.</p>}
    </figure>
  );
}

export default function ProductVideos({ videos = [] }) {
  const headingId = useId();
  const rail = useRef(null);
  const active = useRef(null);

  const selectPlayer = useCallback((player) => {
    if (active.current !== player) {
      if (active.current) {
        active.current.pause();
        active.current.preload = 'none';
      }
      active.current = player;
    }
  }, []);

  useEffect(() => {
    if (!rail.current || !('IntersectionObserver' in window)) return;
    const players = Array.from(rail.current.querySelectorAll('video'));
    const visible = new Map();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      if (document.hidden) {
        selectPlayer(null);
        return;
      }
      // Keep the current clip selected while at least half of it is visible.
      // This also preserves a shopper's manual selection or pause.
      if (visible.get(active.current) >= 0.5) return;
      selectPlayer(null);
      if (reducedMotion.matches) return;
      const next = players.find((player) => visible.get(player) >= 0.5);
      if (!next) return;

      selectPlayer(next);
      next.muted = true;
      next.preload = 'auto';
      loadVideo(next);
      next.play().catch(() => {});
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) visible.set(entry.target, entry.intersectionRatio);
      update();
    }, { threshold: [0.5] });

    for (const player of players) observer.observe(player);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      selectPlayer(null);
    };
  }, [selectPlayer, videos]);

  if (!videos.length) return null;

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}>Product videos</h2>
      <div ref={rail} className={styles.rail} tabIndex={0} role="group" aria-label="Product video cards" data-lenis-prevent-horizontal>
        {videos.map((video, index) => (
          <VideoCard key={`${video.url}-${index}`} video={video} index={index} onPlay={selectPlayer} />
        ))}
      </div>
    </section>
  );
}
