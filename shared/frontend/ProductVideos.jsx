'use client';

import { useId, useRef, useState } from 'react';
import styles from './ProductVideos.module.css';

function VideoCard({ video, index, onPlay }) {
  const player = useRef(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(false);
  const label = video.caption || `Product video ${index + 1}`;

  const play = async () => {
    const media = player.current;
    setError(false);
    if (!media.hasAttribute('src')) media.src = video.url;
    else if (media.error) media.load();
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
          preload="none"
          playsInline
          controls={started && !error}
          tabIndex={started && !error ? 0 : -1}
          aria-label={label}
          onPlay={(event) => { setStarted(true); setError(false); onPlay(event.currentTarget); }}
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
  if (!videos.length) return null;

  function pauseOtherVideos(activePlayer) {
    for (const player of rail.current.querySelectorAll('video')) {
      if (player !== activePlayer && !player.paused) player.pause();
    }
  }

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}>Product videos</h2>
      <div ref={rail} className={styles.rail} tabIndex={0} role="group" aria-label="Product video cards" data-lenis-prevent-horizontal>
        {videos.map((video, index) => (
          <VideoCard key={`${video.url}-${index}`} video={video} index={index} onPlay={pauseOtherVideos} />
        ))}
      </div>
    </section>
  );
}
