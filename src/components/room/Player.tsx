'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Play, Search, Film, Pause } from 'lucide-react';
import { PlayerState } from './RoomClient';

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
    // Not a valid URL, could be just an ID or an external site link
  }
  
  // Handle cases where only the video ID is passed
  if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return url;
  }

  return null;
}

const Player = ({ videoUrl, onSetVideo, canControl, onSearchClick, playerState, onPlayerStateChange, onVideoEnded }: PlayerProps) => {
  const isYoutubeLink = useMemo(() => !!getYouTubeVideoId(videoUrl), [videoUrl]);
  const videoId = isYoutubeLink ? getYouTubeVideoId(videoUrl) : null;
  const [localVideoUrl, setLocalVideoUrl] = useState('');
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isPlayerReady = useRef(false);

  // This ref helps prevent the local component from emitting state changes
  // that it just received from firebase, avoiding infinite loops.
  const isSeekingRef = useRef(false);

  // Sync player with host's state for YouTube videos
  useEffect(() => {
    if (!isYoutubeLink) return; // Only sync for YouTube videos

    const player = playerRef.current;
    if (!player || !playerState || !isPlayerReady.current) return;

    if (canControl) return; // Host controls their own player

    // Sync play/pause state
    const playerStatus = player.getPlayerState();
    if (playerState.isPlaying && playerStatus !== 1) {
      player.playVideo();
    } else if (!playerState.isPlaying && playerStatus === 1) {
      player.pauseVideo();
    }

    // Sync seek time
    const currentTime = player.getCurrentTime();
    const hostTime = playerState.seekTime;
    if (Math.abs(currentTime - hostTime) > 2) {
        isSeekingRef.current = true;
        player.seekTo(hostTime, true);
        setTimeout(() => { isSeekingRef.current = false; }, 1000);
    }

  }, [playerState, canControl, isYoutubeLink]);


  const onReady = (event: { target: YouTubePlayer }) => {
    playerRef.current = event.target;
    isPlayerReady.current = true;
    if (playerState && playerRef.current) {
        // For viewers joining late, seek to the current time, adjusted for time passed since last update
        const initialSeekTime = playerState.seekTime + (Date.now() - playerState.timestamp) / 1000;
        playerRef.current.seekTo(initialSeekTime, true);
        if (playerState.isPlaying) {
            playerRef.current.playVideo();
        } else {
            playerRef.current.pauseVideo();
        }
    }
  };
  
  const onStateChange = (event: { data: number }) => {
      // Only the host should emit state changes
      if (!canControl || !playerRef.current || isSeekingRef.current) return;
      
      const currentTime = playerRef.current.getCurrentTime();

      if (event.data === 0) { // Ended
        onVideoEnded();
        return;
      }

      switch (event.data) {
          case 1: // Playing
              onPlayerStateChange({ isPlaying: true, seekTime: currentTime });
              break;
          case 2: // Paused
              onPlayerStateChange({ isPlaying: false, seekTime: currentTime });
              break;
      }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localVideoUrl.trim() && canControl) {
      onSetVideo(localVideoUrl.trim());
    }
  };

  const togglePlay = () => {
    if (!canControl || !playerRef.current) return;
    const playerStatus = playerRef.current.getPlayerState();
    if (playerStatus === 1) { // is playing
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };


  const renderContent = () => {
    if (isYoutubeLink && videoId) {
      return (
        <YouTube
            key={videoId}
            videoId={videoId}
            opts={{
                height: '100%',
                width: '100%',
                playerVars: {
                  autoplay: canControl ? 1 : 0, // Autoplay for host, viewers sync to host state
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

    // For non-YouTube embeds
    if (!isYoutubeLink && videoUrl) {
      return (
        <iframe
          src={videoUrl}
          title="Shared Content"
          className="w-full h-full border-0 pointer-events-none" // pointer-events-none to prevent clicks
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        ></iframe>
      );
    }

    // Empty state
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
    if (!canControl || !videoUrl || !isYoutubeLink) return null;

    return (
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <Button onClick={togglePlay} size="icon" className="rounded-full bg-black/50 hover:bg-black/80 text-white">
          {playerState?.isPlaying ? <Pause /> : <Play />}
        </Button>
      </div>
    );
  };

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-black relative">
      {renderContent()}
      {/* This overlay prevents ANY clicks on the video player itself, for everyone. */}
      {videoUrl && (
        <div className="absolute inset-0 w-full h-full bg-transparent z-10" />
      )}
      {/* Custom controls are on a higher z-index, so they are clickable by the host. */}
      {renderCustomControls()}
    </div>
  );
};

export default Player;
