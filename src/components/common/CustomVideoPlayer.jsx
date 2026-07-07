import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

export default function CustomVideoPlayer({ src, className = "" }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);

  // Auto-hide controls when playing and not hovering
  useEffect(() => {
    let timeout;
    if (isPlaying) {
      timeout = setTimeout(() => setShowControls(false), 2500);
    } else {
      setShowControls(true);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, showControls]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    setProgress((current / dur) * 100);
    setCurrentTime(formatTime(current));
  };

  const handleLoadedMetadata = () => {
    setDuration(formatTime(videoRef.current.duration));
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const newMutedState = !isMuted;
    videoRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
    if (newMutedState) {
      setVolume(0);
    } else {
      setVolume(1);
      videoRef.current.volume = 1;
    }
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    if (newVolume === 0) {
      setIsMuted(true);
      videoRef.current.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };

  const toggleFullScreen = (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group bg-black rounded overflow-hidden flex items-center justify-center ${className}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => { if(isPlaying) setShowControls(false) }}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="max-w-full max-h-[85vh] object-contain outline-none"
      />

      {/* Play/Pause Center Overlay (when paused) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none transition-opacity duration-300">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1 drop-shadow-lg" />
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
      >
        {/* Progress Bar */}
        <div 
          className="relative w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-3 group/progress overflow-hidden hover:h-2 transition-all"
          onClick={handleSeek}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-[#8B6914] rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Buttons and Time */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="hover:text-[#8B6914] transition-colors focus:outline-none">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <div className="flex items-center gap-2 group/volume relative">
              <button onClick={toggleMute} className="hover:text-[#8B6914] transition-colors focus:outline-none z-10">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              
              <div className="w-0 overflow-hidden transition-all duration-300 ease-in-out group-hover/volume:w-20 flex items-center h-full">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#8B6914] focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #8B6914 ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%)`
                  }}
                />
              </div>

              <span className="text-xs font-medium tracking-wide font-mono opacity-90 select-none ml-2">
                {currentTime} / {duration}
              </span>
            </div>
          </div>

          <button onClick={toggleFullScreen} className="hover:text-[#8B6914] transition-colors focus:outline-none">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
