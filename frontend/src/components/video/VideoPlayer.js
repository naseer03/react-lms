import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { videoService } from '../../services/video.service';
import Spinner from '../ui/Spinner';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings
} from 'lucide-react';

// Dynamically load hls.js from CDN (keeps bundle lean)
let HlsLib = null;
const loadHls = () =>
  new Promise((resolve) => {
    if (HlsLib) return resolve(HlsLib);
    if (window.Hls) { HlsLib = window.Hls; return resolve(HlsLib); }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.6/dist/hls.min.js';
    script.onload = () => { HlsLib = window.Hls; resolve(HlsLib); };
    document.head.appendChild(script);
  });

const SAVE_INTERVAL = 10; // seconds between background progress saves

const VideoPlayer = ({ lessonId, courseId, onComplete }) => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const progressSaveRef = useRef(null);
  const lastSavedRef = useRef(0);
  // Tracks whether we already fired onComplete for this lesson so we don't
  // call it on every timeupdate tick past 90%.
  const completedFiredRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenData, setTokenData] = useState(null);

  // Player state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const controlsTimer = useRef(null);

  // Watermark
  const watermarkText = user ? `${user.name} • ${user.email}` : '';

  // Fetch stream token + resume position
  useEffect(() => {
    if (!lessonId) return;
    completedFiredRef.current = false; // reset when lesson changes
    setLoading(true);
    setError(null);

    Promise.all([
      videoService.getStreamToken(lessonId),
      videoService.getLessonProgress(lessonId),
    ])
      .then(([tokenRes, progressRes]) => {
        setTokenData(tokenRes.data.data);
        const resumeAt = progressRes.data.data?.progress?.lastPosition || 0;
        initPlayer(tokenRes.data.data.videoId, tokenRes.data.data.token, resumeAt);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load video');
        setLoading(false);
      });

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      clearInterval(progressSaveRef.current);
    };
  }, [lessonId]); // eslint-disable-line

  const initPlayer = async (videoId, token, resumeAt) => {
    const Hls = await loadHls();
    const video = videoRef.current;
    if (!video) return;

    const streamUrl = videoService.getStreamUrl(videoId, token);

    if (Hls.isSupported()) {
      // No xhrSetup needed — the backend rewrites all .m3u8 manifests so that
      // every sub-manifest and segment URL already contains the signed token.
      const hls = new Hls({});
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (resumeAt > 5) video.currentTime = resumeAt;
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setError('Video stream error. Try refreshing.');
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        if (resumeAt > 5) video.currentTime = resumeAt;
      });
    } else {
      setError('Your browser does not support HLS video streaming.');
      setLoading(false);
    }
  };

  const saveProgress = useCallback((time) => {
    if (Math.abs(time - lastSavedRef.current) < SAVE_INTERVAL) return;
    lastSavedRef.current = time;
    videoService.saveProgress(courseId, lessonId, {
      currentTime: time,
      duration: videoRef.current?.duration || 0,
    }).catch(() => {});
  }, [courseId, lessonId]);

  // Video event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    if (video.buffered.length > 0) {
      setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
    }

    // Background debounced save (every 10 s)
    saveProgress(video.currentTime);

    // Completion detection — fire exactly once per lesson
    if (
      !completedFiredRef.current &&
      video.duration > 0 &&
      video.currentTime / video.duration >= 0.9
    ) {
      completedFiredRef.current = true;

      // Force-POST to backend NOW (bypasses the 10-second debounce) so
      // isCompleted=true and the course progress % are written to the DB
      // BEFORE onComplete triggers fetchMe() in the parent.
      videoService
        .saveProgress(courseId, lessonId, {
          currentTime: video.currentTime,
          duration: video.duration,
        })
        .finally(() => {
          // Fire onComplete after backend confirms (or errors — still mark done in UI)
          onComplete?.();
        });
    }
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration || 0);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); }
    else { video.pause(); setPlaying(false); }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * video.duration;
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setMuted(v === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const skip = (secs) => {
    const video = videoRef.current;
    if (video) video.currentTime = Math.max(0, Math.min(video.currentTime + secs, video.duration));
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!document.fullscreenElement) { el.requestFullscreen(); setFullscreen(true); }
    else { document.exitFullscreen(); setFullscreen(false); }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (playing) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-red-400 font-medium mb-2">{error}</p>
          <button onClick={() => window.location.reload()} className="text-slate-400 text-sm underline">Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden group select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); saveProgress(duration); onComplete?.(); }}
        onClick={togglePlay}
        // Security: disable right-click
        onContextMenu={(e) => e.preventDefault()}
        playsInline
        controlsList="nodownload"
        disablePictureInPicture
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Spinner size="xl" className="border-white/20 border-t-white" />
        </div>
      )}

      {/* Watermark */}
      {!loading && watermarkText && (
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: '8%',
            right: '3%',
            color: 'rgba(255,255,255,0.18)',
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '0.5px',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            fontFamily: 'monospace',
          }}
        >
          {watermarkText}
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${
          showControls || !playing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 px-4 pb-4 space-y-2">
          {/* Progress bar */}
          <div
            className="relative h-1.5 bg-white/30 rounded-full cursor-pointer group/bar hover:h-2.5 transition-all"
            onClick={handleSeek}
          >
            {/* Buffered */}
            <div className="absolute top-0 left-0 h-full bg-white/25 rounded-full" style={{ width: `${buffered}%` }} />
            {/* Played */}
            <div className="absolute top-0 left-0 h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progressPct}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-primary-300 transition-colors">
              {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>

            {/* Skip */}
            <button onClick={() => skip(-10)} className="text-white/80 hover:text-white">
              <SkipBack size={16} />
            </button>
            <button onClick={() => skip(10)} className="text-white/80 hover:text-white">
              <SkipForward size={16} />
            </button>

            {/* Volume */}
            <button onClick={toggleMute} className="text-white/80 hover:text-white">
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
              onChange={handleVolume}
              className="w-16 h-1 accent-primary-500 cursor-pointer"
            />

            {/* Time */}
            <span className="text-white/80 text-xs tabular-nums ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white/80 hover:text-white">
              {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
