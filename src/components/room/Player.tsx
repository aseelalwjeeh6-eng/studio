'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import YouTube, { YouTubePlayer } from 'react-youtube';
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

type UrlType = 'youtube' | 'direct' | 'iframe' | 'empty';

function getUrlType(url: string): UrlType {
    if (!url) return 'empty';
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const pathname = urlObj.pathname;
        
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
            return 'youtube';
        }
        if (pathname.endsWith('.mp4') || pathname.endsWith('.webm') || pathname.endsWith('.ogv') || pathname.endsWith('.m3u8')) {
            return 'direct';
        }

    } catch (e) {
      // Not a valid URL, might be youtube ID
      if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
        return 'youtube';
      }
    }
    return 'iframe';
}


function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    if (hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }
    if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
      if (urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/embed/')[1].split('?')[0];
      }
    }
  } catch (e) {
    // Not a valid URL, could be a video ID
  }
  // Fallback for just ID
  if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return url;
  }
  return null;
}

const Player = ({ videoUrl, onSetVideo, canControl, onSearchClick, playerState, onPlayerStateChange, onVideoEnded }: PlayerProps) => {
  const urlType = useMemo(() => getUrlType(videoUrl), [videoUrl]);
  const videoId = useMemo(() => (urlType === 'youtube' ? getYouTubeVideoId(videoUrl) : null), [videoUrl, urlType]);

  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const htmlPlayerRef = useRef<HTMLVideoElement | null>(null);
  const isPlayerReady = useRef(false);
  const isSeekingRef = useRef(false);
  const hostSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- Generic Player Control ---
  const getCurrentPlayerTime = () => {
    if (ytPlayerRef.current) return ytPlayerRef.current.getCurrentTime();
    if (htmlPlayerRef.current) return htmlPlayerRef.current.currentTime;
    return 0;
  }
  const getPlayerState = () => {
     if (ytPlayerRef.current) return ytPlayerRef.current.getPlayerState();
     if (htmlPlayerRef.current) return htmlPlayerRef.current.paused ? 2 : 1;
     return -1; // unstarted
  }

  // --- Syncing Logic ---
  const handleStateChange = useCallback((isPlaying: boolean, seekTime: number) => {
    if (canControl) {
      onPlayerStateChange({ isPlaying, seekTime });
    }
  }, [canControl, onPlayerStateChange]);

  // Effect for syncing remote state to local player (for viewers)
  useEffect(() => {
    if (canControl || !playerState || !isPlayerReady.current) return;

    let player: YouTubePlayer | HTMLVideoElement | null = null;
    let getStatus: () => number = () => -1; // -1: unstarted, 0: ended, 1: playing, 2: paused
    let play: () => void = () => {};
    let pause: () => void = () => {};
    let seek: (time: number) => void = () => {};
    let getCurrentTime: () => number = () => 0;

    if (urlType === 'youtube' && ytPlayerRef.current) {
        player = ytPlayerRef.current;
        getStatus = () => player!.getPlayerState();
        play = () => player!.playVideo();
        pause = () => player!.pauseVideo();
        seek = (time) => player!.seekTo(time, true);
        getCurrentTime = () => player!.getCurrentTime();
    } else if (urlType === 'direct' && htmlPlayerRef.current) {
        player = htmlPlayerRef.current;
        getStatus = () => player!.paused ? 2 : 1;
        play = () => player!.play().catch(console.error);
        pause = () => player!.pause();
        seek = (time) => { player!.currentTime = time; };
        getCurrentTime = () => player!.currentTime;
    }

    if (!player) return;

    const playerStatus = getStatus();

    // Sync play/pause state
    if (playerState.isPlaying && playerStatus !== 1 && playerStatus !== 3) { // 3 is buffering for YT
        play();
    } else if (!playerState.isPlaying && playerStatus === 1) {
        pause();
    }

    // Sync seek time, accounting for latency
    const hostTime = playerState.seekTime + (Date.now() - playerState.timestamp) / 1000;
    const currentTime = getCurrentTime();
    
    if (Math.abs(currentTime - hostTime) > 2) {
      isSeekingRef.current = true;
      seek(hostTime);
      setTimeout(() => { isSeekingRef.current = false; }, 1000);
    }
  }, [playerState, canControl, urlType]);

  // Effect for host to update progress bar and sync state periodically
  useEffect(() => {
    if (canControl && isPlayerReady.current && playerState?.isPlaying) {
      hostSyncIntervalRef.current = setInterval(() => {
        if (isSeekingRef.current) return;
        const currentTime = getCurrentPlayerTime();
        if (currentTime !== null && !isNaN(currentTime)) {
            setProgress(currentTime);
            // Periodically sync host time to prevent drift
            onPlayerStateChange({ seekTime: currentTime });
        }
      }, 1000);
    } else {
      if (hostSyncIntervalRef.current) {
        clearInterval(hostSyncIntervalRef.current);
      }
    }

    return () => {
      if (hostSyncIntervalRef.current) clearInterval(hostSyncIntervalRef.current);
    };
  }, [canControl, playerState?.isPlaying, onPlayerStateChange]);
  
  // Update local progress for viewers
  useEffect(() => {
    if (!canControl && playerState) {
        const newProgress = playerState.seekTime + (Date.now() - playerState.timestamp) / 1000;
        if (newProgress <= duration) {
            setProgress(newProgress);
        }
    }
  }, [playerState, canControl, duration]);

  // --- Player Controls ---
  const togglePlay = useCallback(() => {
    if (!canControl) return;
    const playerStatus = getPlayerState();
    handleStateChange(playerStatus !== 1, getCurrentPlayerTime());
  }, [canControl, handleStateChange]);

  const seek = useCallback((amount: number) => {
    if (!canControl) return;
    const currentTime = getCurrentPlayerTime();
    const newTime = Math.max(0, currentTime + amount);
    
    if (ytPlayerRef.current) ytPlayerRef.current.seekTo(newTime, true);
    if (htmlPlayerRef.current) htmlPlayerRef.current.currentTime = newTime;

    handleStateChange(getPlayerState() === 1, newTime);
  }, [canControl, handleStateChange]);

  const handleSliderChange = (value: number[]) => {
    if (!canControl) return;
    const newTime = value[0];
    setProgress(newTime);
    
    if (ytPlayerRef.current) ytPlayerRef.current.seekTo(newTime, true);
    if (htmlPlayerRef.current) htmlPlayerRef.current.currentTime = newTime;
    
    handleStateChange(getPlayerState() === 1, newTime);
  };
  
  // --- YouTube Player Event Handlers ---
  const onYtReady = (event: { target: YouTubePlayer }) => {
    ytPlayerRef.current = event.target;
    isPlayerReady.current = true;
    setDuration(event.target.getDuration());
    if (playerState) {
        const initialSeekTime = playerState.seekTime + (Date.now() - playerState.timestamp) / 1000;
        event.target.seekTo(initialSeekTime, true);
        if (playerState.isPlaying) event.target.playVideo();
    }
  };

  const onYtStateChange = (event: { data: number }) => {
    if (!canControl || isSeekingRef.current) return;
    const currentTime = ytPlayerRef.current?.getCurrentTime() ?? 0;
    if (event.data === 0) { // Ended
      onVideoEnded();
      handleStateChange(false, 0);
    } else if (event.data === 1 || event.data === 2) { // Playing or Paused
      handleStateChange(event.data === 1, currentTime);
      setProgress(currentTime);
    }
  };

  // --- HTML5 Player Event Handlers ---
  const onHtmlReady = () => {
    if (!htmlPlayerRef.current) return;
    isPlayerReady.current = true;
    setDuration(htmlPlayerRef.current.duration);
    if (playerState) {
        const initialSeekTime = playerState.seekTime + (Date.now() - playerState.timestamp) / 1000;
        htmlPlayerRef.current.currentTime = initialSeekTime;
        if (playerState.isPlaying) htmlPlayerRef.current.play().catch(console.error);
    }
  };
  
  const onHtmlStateChange = () => {
      if (!canControl || isSeekingRef.current || !htmlPlayerRef.current) return;
      handleStateChange(!htmlPlayerRef.current.paused, htmlPlayerRef.current.currentTime);
      setProgress(htmlPlayerRef.current.currentTime);
  };

  const onHtmlEnded = () => {
    if (!canControl) return;
    onVideoEnded();
    handleStateChange(false, 0);
  }

  // --- Rendering ---
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const date = new Date(0);
    date.setSeconds(seconds);
    const hasHours = date.getUTCHours() > 0;
    return date.toISOString().substr(hasHours ? 11 : 14, hasHours ? 8 : 5);
  };

  const renderContent = () => {
    switch(urlType) {
        case 'youtube':
            if (!videoId) return renderEmptyState('Invalid YouTube URL');
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
                  onReady={onYtReady}
                  onStateChange={onYtStateChange}
                  className="w-full h-full"
                />
            );
        
        case 'direct':
            return (
                <video
                    ref={htmlPlayerRef}
                    src={videoUrl}
                    className="w-full h-full"
                    onLoadedData={onHtmlReady}
                    onPlay={onHtmlStateChange}
                    onPause={onHtmlStateChange}
                    onEnded={onHtmlEnded}
                    playsInline
                    autoPlay
                />
            );

        case 'iframe':
             return (
              <iframe
                src={videoUrl}
                title="Shared Content"
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-presentation"
              ></iframe>
            );

        case 'empty':
        default:
            return renderEmptyState();
    }
  };

  const renderEmptyState = (message?: string) => (
    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
      {canControl ? (
        <div className='w-full max-w-lg'>
          <Film className="h-16 w-16 mb-4 mx-auto" />
          <h3 className="text-xl font-bold text-foreground">شاشة السينما فارغة</h3>
          <p className='mb-4'>{message || 'أضف فيديو من يوتيوب أو الصق رابط فيلم لبدء العرض.'}</p>
          <Button onClick={onSearchClick} className="w-full" variant="secondary">
            <Search className="me-2 h-4 w-4" />
            إضافة فيديو
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

  const renderCustomControls = () => {
    if (!canControl || urlType === 'empty' || urlType === 'iframe') return null;

    return (
      <div 
        className="absolute inset-0 z-20 flex flex-col justify-between p-4 bg-black/30 opacity-100"
      >
        <div></div>

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
      <div className="absolute inset-0 w-full h-full">
         {renderContent()}
      </div>
      <div 
        className="absolute inset-0 w-full h-full bg-transparent z-10"
      />
      {renderCustomControls()}
    </div>
  );
};

export default Player;
