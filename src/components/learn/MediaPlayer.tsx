"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";
import {
  AlertCircle,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MediaPlayerSnapshot = {
  currentTime: number;
  duration: number;
  progressPercent: number;
};

export type MediaPlayerHandle = {
  seekTo: (time: number) => void;
  play: () => Promise<void>;
  pause: () => void;
  getCurrentTime: () => number;
};

interface MediaPlayerProps {
  src: string;
  type: "video" | "audio";
  initialTime?: number;
  maxDuration?: number;
  isLocked?: boolean;
  onTimeUpdate?: (snapshot: MediaPlayerSnapshot) => void;
  onLoadedMetadata?: (duration: number) => void;
  onPause?: (snapshot: MediaPlayerSnapshot) => void;
  onEnded?: (snapshot: MediaPlayerSnapshot) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const AUTO_HIDE_DELAY = 3000;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export const MediaPlayer = forwardRef<MediaPlayerHandle, MediaPlayerProps>(function MediaPlayer(
  {
    src,
    type,
    initialTime = 0,
    maxDuration,
    isLocked = false,
    onTimeUpdate,
    onLoadedMetadata,
    onPause,
    onEnded,
  },
  ref
) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(initialTime > 0 ? initialTime : null);
  const lastReportedTimeRef = useRef(initialTime);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getEffectiveDuration = useCallback(
    (rawDuration: number) => {
      if (typeof maxDuration === "number" && Number.isFinite(maxDuration) && maxDuration > 0) {
        return rawDuration > 0 ? Math.min(rawDuration, maxDuration) : maxDuration;
      }
      return rawDuration;
    },
    [maxDuration]
  );

  const buildSnapshot = useCallback(
    (element: HTMLVideoElement | HTMLAudioElement, rawDuration = duration): MediaPlayerSnapshot => {
      const resolvedDuration = Number.isFinite(rawDuration) ? rawDuration : 0;
      const effectiveDuration = getEffectiveDuration(resolvedDuration);
      const boundedTime =
        effectiveDuration > 0
          ? Math.max(0, Math.min(element.currentTime, effectiveDuration))
          : Math.max(0, element.currentTime);
      return {
        currentTime: boundedTime,
        duration: resolvedDuration,
        progressPercent:
          effectiveDuration > 0 ? Math.round((boundedTime / effectiveDuration) * 100) : 0,
      };
    },
    [duration, getEffectiveDuration]
  );

  const applySeek = useCallback((time: number) => {
    const boundedTime = Math.max(0, Math.round(time));
    const element = mediaRef.current;
    pendingSeekRef.current = boundedTime;
    if (!element) return;
    try {
      element.currentTime = boundedTime;
      setCurrentTime(boundedTime);
      lastReportedTimeRef.current = boundedTime;
      pendingSeekRef.current = null;
    } catch {
      pendingSeekRef.current = boundedTime;
    }
  }, []);

  // ── Controls auto-hide ────────────────────────────────────────────────────

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, AUTO_HIDE_DELAY);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  // Show permanently when paused; auto-hide when playing
  useEffect(() => {
    if (!isPlaying) {
      showControls();
    } else {
      resetHideTimer();
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, resetHideTimer, showControls]);

  // ── Fullscreen ────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  // ── Imperative handle ─────────────────────────────────────────────────────

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (time) => applySeek(time),
      play: async () => {
        if (!mediaRef.current) return;
        await mediaRef.current.play();
      },
      pause: () => mediaRef.current?.pause(),
      getCurrentTime: () => mediaRef.current?.currentTime ?? currentTime,
    }),
    [applySeek, currentTime]
  );

  useEffect(() => {
    applySeek(initialTime);
  }, [applySeek, initialTime, src]);

  // ── Media event handlers ──────────────────────────────────────────────────

  const handleLoadedMetadata = useCallback(() => {
    if (!mediaRef.current) return;
    const rawDuration = mediaRef.current.duration;
    setDuration(rawDuration);
    onLoadedMetadata?.(rawDuration);
    if (pendingSeekRef.current !== null) applySeek(pendingSeekRef.current);
  }, [applySeek, onLoadedMetadata]);

  const handleTimeUpdate = useCallback(() => {
    if (!mediaRef.current) return;
    const element = mediaRef.current;
    const effectiveDuration = getEffectiveDuration(duration);
    if (effectiveDuration > 0 && element.currentTime >= effectiveDuration) {
      element.currentTime = effectiveDuration;
      element.pause();
    }
    const snapshot = buildSnapshot(element);
    const diff = Math.abs(snapshot.currentTime - lastReportedTimeRef.current);
    const nearEnd =
      snapshot.duration > 0 && snapshot.currentTime >= Math.max(snapshot.duration - 1, 0);
    if (!(diff >= 0.5 || snapshot.currentTime === 0 || nearEnd)) return;
    lastReportedTimeRef.current = snapshot.currentTime;
    setCurrentTime(snapshot.currentTime);
    onTimeUpdate?.(snapshot);
  }, [buildSnapshot, duration, getEffectiveDuration, onTimeUpdate]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (!mediaRef.current) return;
    const snapshot = buildSnapshot(mediaRef.current);
    setCurrentTime(snapshot.currentTime);
    onPause?.(snapshot);
  }, [buildSnapshot, onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (!mediaRef.current) return;
    const snapshot = buildSnapshot(mediaRef.current);
    setCurrentTime(snapshot.currentTime);
    onEnded?.(snapshot);
  }, [buildSnapshot, onEnded]);

  // ── Control actions ───────────────────────────────────────────────────────

  const togglePlay = useCallback(async () => {
    if (!mediaRef.current || error || isLocked) return;
    if (isPlaying) {
      mediaRef.current.pause();
      return;
    }
    try {
      await mediaRef.current.play();
      setIsPlaying(true);
    } catch (playbackError) {
      console.error("Playback error:", playbackError);
      setError("Unable to play media");
    }
  }, [error, isLocked, isPlaying]);

  const handleSeek = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const requestedTime = parseFloat(event.target.value);
      applySeek(requestedTime);
      if (mediaRef.current) {
        const snapshot = buildSnapshot(mediaRef.current);
        onTimeUpdate?.(snapshot);
      }
    },
    [applySeek, buildSnapshot, onTimeUpdate]
  );

  const handleVolumeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextVolume = parseFloat(event.target.value);
    setVolume(nextVolume);
    if (mediaRef.current) mediaRef.current.volume = nextVolume;
    if (nextVolume > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const element = mediaRef.current;
    if (!element) return;
    if (isMuted) {
      element.volume = volume;
      setIsMuted(false);
    } else {
      element.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const setPlaybackSpeed = useCallback((s: number) => {
    setSpeed(s);
    setShowSpeedMenu(false);
    if (mediaRef.current) mediaRef.current.playbackRate = s;
  }, []);

  const effectiveDuration = getEffectiveDuration(duration);
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  // ────────────────────────────────────────────────────────────────────────
  // AUDIO PLAYER (standalone, no overlay controls needed)
  // ────────────────────────────────────────────────────────────────────────

  if (type === "audio") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-6 text-white">
        <audio
          ref={mediaRef as RefObject<HTMLAudioElement>}
          src={src}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadStart={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={() => { setError("Failed to load audio"); setIsLoading(false); }}
        />

        {/* Album art placeholder */}
        <div className="mb-8 flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-primary-blue/30 to-slate-800 shadow-2xl shadow-primary-blue/20">
          <Volume2 className="h-14 w-14 text-primary-blue" />
        </div>

        <h3 className="mb-1 text-xl font-semibold">Now Playing Audio</h3>
        <p className="mb-8 text-sm text-slate-400">
          {formatTime(currentTime)} / {formatTime(effectiveDuration)}
        </p>

        {/* Timeline */}
        <div className="mb-6 w-full max-w-lg">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-primary-blue transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={effectiveDuration || 0}
            value={Math.min(currentTime, effectiveDuration || currentTime)}
            onChange={handleSeek}
            disabled={!effectiveDuration || isLocked}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            style={{ position: "relative" }}
          />
          <div className="mt-1.5 flex justify-between text-xs text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMute}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <button
            onClick={togglePlay}
            disabled={Boolean(error) || isLocked}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-blue text-white shadow-lg shadow-primary-blue/40 transition hover:bg-primary-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 translate-x-0.5" />
            )}
          </button>

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu((v) => !v)}
              className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              {speed}×
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-10 right-0 z-50 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={cn(
                      "block w-full px-4 py-2 text-left text-xs font-semibold transition hover:bg-white/10",
                      s === speed ? "text-primary-blue" : "text-white"
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLocked && (
          <div className="mt-6 rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 border border-amber-500/20">
            Preview Limited
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // VIDEO PLAYER — 16:9 cinematic player
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="group relative h-full w-full overflow-hidden bg-black"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
      onTouchStart={() => { setControlsVisible((v) => !v); }}
    >
      {/* ── Video element ── */}
      <video
        ref={mediaRef as RefObject<HTMLVideoElement>}
        src={src}
        className="h-full w-full object-contain"
        preload="auto"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={() => { setError("Failed to load video"); setIsLoading(false); }}
        onClick={togglePlay}
        style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      />

      {/* ── Loading spinner ── */}
      {isLoading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-blue/80" />
        </div>
      )}

      {/* ── Error overlay ── */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
          <AlertCircle className="h-10 w-10 text-rose-400" />
          <p className="text-sm font-semibold text-rose-300">{error}</p>
        </div>
      )}

      {/* ── Center play/pause flash ── */}
      {!error && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            controlsVisible && !isPlaying ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
            <Play className="h-9 w-9 text-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* ── Controls overlay ── */}
      {!error && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 transition-all duration-300",
            controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          )}
        >
          {/* Gradient fog */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

          <div className="relative px-4 pb-4 pt-12 sm:px-6">
            {/* ── Timeline scrubber ── */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold tabular-nums text-white/80">
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1 group/seek">
                {/* track background */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/20 transition-all group-hover/seek:h-2">
                  {/* buffered / progress fill */}
                  <div
                    className="h-full rounded-full bg-primary-blue transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={effectiveDuration || 0}
                  step="0.5"
                  value={Math.min(currentTime, effectiveDuration || currentTime)}
                  onChange={handleSeek}
                  disabled={!effectiveDuration || isLocked}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  style={{ margin: 0 }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-white/80">
                {formatTime(effectiveDuration)}
                {typeof maxDuration === "number" && maxDuration > 0 && maxDuration < duration && (
                  <span className="ml-1 text-[9px] font-bold text-amber-400 uppercase">Preview</span>
                )}
              </span>
            </div>

            {/* ── Bottom controls row ── */}
            <div className="flex items-center justify-between gap-2">
              {/* Left: Play + Volume */}
              <div className="flex items-center gap-1">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  disabled={Boolean(error) || isLocked}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 translate-x-px" />
                  )}
                </button>

                {/* Volume */}
                <div
                  className="relative flex items-center"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    onClick={toggleMute}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/15"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>

                  {/* Volume slider (horizontal, appears on hover) */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      showVolumeSlider ? "w-20 opacity-100" : "w-0 opacity-0"
                    )}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="h-1.5 w-20 cursor-pointer accent-primary-blue"
                    />
                  </div>
                </div>

                {/* Current / total time */}
                <span className="ml-1 hidden select-none text-xs font-semibold tabular-nums text-white/70 sm:block">
                  {formatTime(currentTime)} / {formatTime(effectiveDuration)}
                </span>
              </div>

              {/* Right: Speed + Fullscreen */}
              <div className="flex items-center gap-1">
                {/* Playback speed */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu((v) => !v)}
                    className="flex h-9 items-center justify-center rounded-xl px-2.5 text-xs font-bold text-white transition hover:bg-white/15"
                    title="Playback speed"
                  >
                    {speed}×
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-11 right-0 z-50 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-sm">
                      {SPEEDS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={cn(
                            "block w-full px-5 py-2 text-left text-xs font-semibold transition hover:bg-white/10",
                            s === speed ? "text-primary-blue" : "text-white"
                          )}
                        >
                          {s}×
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/15"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview locked badge ── */}
      {isLocked && (
        <div className="absolute right-4 top-4 z-30 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 backdrop-blur-sm">
          Preview Limited
        </div>
      )}
    </div>
  );
});
