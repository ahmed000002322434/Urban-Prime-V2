import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PauseIcon, PlayIcon, VoiceWaveIcon } from './MessageIcons';

interface VoiceNotePlayerProps {
  audioUrl: string;
  durationMs?: number;
  isOwn?: boolean;
}

const WAVE_BARS = [0.24, 0.44, 0.58, 0.36, 0.66, 0.48, 0.72, 0.34, 0.62, 0.28, 0.56, 0.4, 0.64, 0.32, 0.52, 0.44, 0.68, 0.38];

const formatSeconds = (value: number) => {
  const safeValue = Math.max(0, Math.round(value));
  const mins = Math.floor(safeValue / 60);
  const secs = safeValue % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ audioUrl, durationMs, isOwn = false }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationMs ? durationMs / 1000 : 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const syncTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('loadedmetadata', syncDuration);
    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', syncDuration);
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  }, []);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const displayDuration = duration || (durationMs ? durationMs / 1000 : 0);

  const handleTogglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const progressLabel = useMemo(
    () => formatSeconds(isPlaying ? currentTime : displayDuration || 0),
    [currentTime, displayDuration, isPlaying]
  );

  return (
    <div className={`messages-voice-note ${isOwn ? 'is-own' : 'is-peer'}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
      <button type="button" onClick={handleTogglePlayback} className="messages-voice-note-play" aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="messages-voice-note-wave" aria-hidden="true">
          <div className="messages-voice-note-progress" style={{ width: `${progress * 100}%` }} />
          {WAVE_BARS.map((height, index) => (
            <span
              key={`voice-bar-${index}`}
              className={`messages-voice-bar ${isPlaying ? 'is-playing' : ''}`}
              style={{
                height: `${height * 100}%`,
                opacity: progress >= index / WAVE_BARS.length ? 1 : 0.36,
                animationDelay: `${index * 60}ms`
              }}
            />
          ))}
        </div>
        <div className="messages-voice-note-meta">
          <span className="inline-flex items-center gap-1">
            <VoiceWaveIcon />
            Voice note
          </span>
          <span>{progressLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default VoiceNotePlayer;
