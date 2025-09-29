'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Play, Search, Film } from 'lucide-react';
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
    // Not a valid URL, might be just an ID
  }
  
  // Handle cases where only the video ID is passed
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

  // This ref helps prevent the local component from emitting state changes
  // that it just received from firebase, avoiding infinite loops.
  const isSeekingRef = useRef(false);

  // Sync player with host's state for YouTube videos
  useEffect(() => {
    if (!videoId) return; // Only sync for YouTube videos

    const player = playerRef.current;
    if (!player || !playerState || canControl || !isPlayerReady.current) return;

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

  }, [playerState, canControl, videoId]);


  const onReady = (event: { target: YouTubePlayer }) => {
    playerRef.current = event.target;
    isPlayerReady.current = true;
    if (playerState && playerRef.current) {
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
      if (!canControl || !playerRef.current || isSeekingRef.current) return;
      
      const currentTime = playerRef.current.getCurrentTime();

      if (event.data === 0) { // Ended
        onVideoEnded();
        return;
      }

      switch (event.data) {
          case 1: // Playing
              onPlayerStateChange({ isPlaying: true, seekTime: currentTime, timestamp: Date.now() });
              break;
          case 2: // Paused
              onPlayerStateChange({ isPlaying: false, seekTime: currentTime, timestamp: Date.now() });
              break;
      }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localVideoUrl.trim() && canControl) {
      onSetVideo(localVideoUrl.trim());
    }
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
                  controls: canControl ? 1 : 0,
                  rel: 0,
                  showinfo: 0,
                  modestbranding: 1,
                  iv_load_policy: 3,
                  disablekb: canControl ? 0 : 1,
                },
            }}
            onReady={onReady}
            onStateChange={onStateChange}
            className="w-full h-full"
        />
      );
    }

    if (videoUrl) {
      return (
        <iframe
          src={videoUrl}
          title="Shared Content"
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-presentation"
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

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-black relative">
      {renderContent()}
    </div>
  );
};

export default Player;
