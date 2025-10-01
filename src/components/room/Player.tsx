'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Play, Search, Film, Pause, Forward, Rewind } from 'lucide-react';
import { PlayerState } from './RoomClient';
import { Slider } from '../ui/slider';
import { cn } from '@/lib/utils';

interface PlayerProps {
  videoUrl: string;
  onSetVideo: (url: string) => void;
  canControl: boolean;
  onSearchClick: () => void;
  playerState: PlayerState | null;
  onPlayerStateChange: (newState: Partial<PlayerState>) => void;
  onVideoEnded: () => void;
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;
    }
  } catch (e) {
    // Not a valid URL
  }
  if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return url;
  }
  return null;
}

const Player = ({ videoUrl, onSetVideo, canControl, onSearchClick, playerState, onPlayerStateChange, onVideoEnded }: PlayerProps) => {
  const videoId = useMemo(() => getYouTubeVideoId(videoUrl), [videoUrl]);
  const [localVideoUrl, setLocalVideoUrl] = useState('');
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isPlayerReady = useRef(false);
  const isSeekingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleStateChange = useCallback((isPlaying: boolean, seekTime: number) => {
    if (canControl) {
      onPlayerStateChange({ isPlaying, seekTime });
    }
  }, [canControl, onPlayerStateChange]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || !canControl) return;

    const playerStatus = player.getPlayerState();
    if (playerStatus === 1) { // Playing
      player.pauseVideo();
    } else { // Paused, Buffering, Cued
      player.playVideo();
    }
  }, [canControl]);

  const seek = useCallback((amount: number) => {
    const player = playerRef.current;
    if (!player || !canControl) return;
    const currentTime = player.getCurrentTime();
    const newTime = Math.max(0, currentTime + amount);
    player.seekTo(newTime, true);
    handleStateChange(player.getPlayerState() === 1, newTime);
  }, [canControl, handleStateChange]);

  const handleSliderChange = (value: number[]) => {
    if (!playerRef.current || !canControl) return;
    const newTime = value[0];
    setProgress(newTime);
    playerRef.current.seekTo(newTime, true);
    handleStateChange(playerRef.current.getPlayerState() === 1, newTime);
  };
  
  const hideControlsAfterDelay = () => {
    if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
    }, 3000);
  };

  const toggleControls = () => {
      if (!canControl || !videoId) return;
      setShowControls(prev => !prev);
      if (!showControls) {
          hideControlsAfterDelay();
      }
  };

  // Effect for syncing remote state to local player (for viewers)
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !playerState || !isPlayerReady.current || canControl) return;

    const playerStatus = player.getPlayerState();
    if (playerState.isPlaying && playerStatus !== 1) {
      player.playVideo();
    } else if (!playerState.isPlaying && playerStatus === 1) {
      player.pauseVideo();
    }

    const currentTime = player.getCurrentTime();
    const hostTime = playerState.seekTime + (Date.now() - playerState.timestamp) / 1000;
    if (Math.abs(currentTime - hostTime) > 3) {
      isSeekingRef.current = true;
      player.seekTo(hostTime, true);
      setTimeout(() => { isSeekingRef.current = false; }, 1000);
    }
  }, [playerState, canControl]);

  // Effect for host to update progress bar
  useEffect(() => {
    if (canControl && playerRef.current && playerState?.isPlaying) {
      intervalRef.current = setInterval(() => {
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        setProgress(currentTime);
        hideControlsAfterDelay(); // Reset timeout on activity
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [canControl, playerState?.isPlaying]);

  const onReady = (event: { target: YouTubePlayer }) => {
    playerRef.current = event.target;
    isPlayerReady.current = true;
    setDuration(event.target.getDuration());

    if (playerState) {
      const initialSeekTime = canControl ? playerState.seekTime : playerState.seekTime + (Date.now() - playerState.timestamp) / 1000;
      event.target.seekTo(initialSeekTime, true);
      if (playerState.isPlaying) {
        event.target.playVideo();
      }
    }
  };

  const onStateChange = (event: { data: number }) => {
    if (!canControl || !playerRef.current || isSeekingRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();

    if (event.data === 0) { // Ended
      onVideoEnded();
    } else if (event.data === 1) { // Playing
      handleStateChange(true, currentTime);
    } else if (event.data === 2) { // Paused
      handleStateChange(false, currentTime);
      setProgress(currentTime); // Update progress on pause
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localVideoUrl.trim() && canControl) {
      onSetVideo(localVideoUrl.trim());
    }
  };
  
  const formatTime = (seconds: number) => {
    const date = new Date(0);
    date.setSeconds(seconds || 0);
    return date.toISOString().substr(11, 8);
  };


  const renderContent = () => {
    if (videoId) {
      return (
        <YouTube
          key={videoId}
          videoId={videoId}
          opts={{
            height: '100%',
            width: '100%',
            playerVars: {
              autoplay: 1,
              controls: 0,
              rel: 0,
              showinfo: 0,
              modestbranding: 1,
              iv_load_policy: 3,
              disablekb: 1,
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
          className="w-full h-full"
        />
      );
    }

    // For non-YouTube embeds or empty state
    if (videoUrl && !videoId) {
        return (
          <iframe
            src={videoUrl}
            title="Shared Content"
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          ></iframe>
        );
      }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
        {canControl ? (
          <div className='w-full max-w-lg'>
            <Film className="h-16 w-16 mb-4 mx-auto" />
            <h3 className="text-xl font-bold text-foreground">شاشة السينما</h3>
            <p className='mb-4'>ابحث عن فيديو في يوتيوب أو الصق رابط فيلم لبدء العرض.</p>
            <form onSubmit={handleUrlSubmit} className="flex gap-2 mb-4">
              <Input
                type="text"
                placeholder="الصق رابط فيلم هنا..."
                value={localVideoUrl}
                onChange={(e) => setLocalVideoUrl(e.target.value)}
                className="bg-input border-border focus:ring-accent"
              />
              <Button type="submit">
                <Play className="me-2 h-4 w-4" />
                تشغيل
              </Button>
            </form>
             <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-muted-foreground text-xs">أو</span>
              <div className="flex-grow border-t border-border"></div>
            </div>
            <Button onClick={onSearchClick} className="w-full" variant="secondary">
              <Search className="me-2 h-4 w-4" />
              بحث في يوتيوب
            </Button>
          </div>
        ) : (
          <>
            <Film className="h-16 w-16 mb-4" />
            <p className="text-lg">ينتظر المضيف لبدء الفيلم...</p>
          </>
        )}
      </div>
    );
  }

  const renderCustomControls = () => {
    if (!canControl || !videoId) return null;

    return (
      <div 
        className={cn(
            "absolute inset-0 z-20 flex flex-col justify-between p-4 bg-black/30 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
        )}
        onMouseMove={hideControlsAfterDelay} // Keep controls visible while mouse is moving
      >
        {/* Top Spacer */}
        <div></div>

        {/* Center Controls */}
        <div className="flex items-center justify-center gap-8">
            <Button onClick={() => seek(-10)} size="icon" variant="ghost" className="text-white hover:bg-white/20 hover:text-white rounded-full w-16 h-16">
                <Rewind className="w-8 h-8" />
            </Button>
            <Button onClick={togglePlay} size="icon" variant="ghost" className="text-white hover:bg-white/20 hover:text-white rounded-full w-20 h-20">
                {playerState?.isPlaying ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12" />}
            </Button>
             <Button onClick={() => seek(10)} size="icon" variant="ghost" className="text-white hover:bg-white/20 hover:text-white rounded-full w-16 h-16">
                <Forward className="w-8 h-8" />
            </Button>
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center gap-4 text-white font-mono text-sm">
           <span>{formatTime(progress)}</span>
           <Slider
                value={[progress]}
                max={duration}
                step={1}
                onValueChange={handleSliderChange}
            />
           <span>{formatTime(duration)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-black relative">
      {renderContent()}
      <div 
        className="absolute inset-0 w-full h-full bg-transparent z-10"
        onClick={toggleControls}
      />
      {renderCustomControls()}
    </div>
  );
};

export default Player;
