'use client';

import { useRef, useState } from 'react';

function VideoCard({ video, index, onPlay }) {
  const player = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
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
          playsInline
          controls={started}
          aria-label={video.caption || `Morbix product video ${index + 1}`}
          onPlay={() => { setPlaying(true); setError(''); onPlay(player.current); }}
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
  const activePlayer = useRef(null);
  if (!videos.length) return null;
  const onPlay = (player) => {
    if (activePlayer.current && activePlayer.current !== player) activePlayer.current.pause();
    activePlayer.current = player;
  };
  return (
    <section className="product-videos" aria-label="Morbix product videos">
      <div className="product-video-grid">
        {videos.map((video, index) => <VideoCard key={`${video.url}-${index}`} video={video} index={index} onPlay={onPlay} />)}
      </div>
    </section>
  );
}
