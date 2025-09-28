'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Play, Search, X, Film, Loader2, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import { searchYoutube } from '@/ai/flows/youtube-search-flow';
import { Dialog, DialogContent } from '@/components/ui/dialog';


interface PlayerProps {
  videoUrl: string;
  onSetVideo: (url: string) => void;
  isHost: boolean;
  onSearchClick: () => void;
}

interface YouTubeVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: {
      default: { url: string };
    };
  };
}

function getYouTubeVideoId(url: string) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      return urlObj.searchParams.get('v') || '';
    }
  } catch (e) {
    // Not a valid URL, might be just an ID
  }
  return '';
}

const Player = ({ videoUrl, onSetVideo, isHost, onSearchClick }: PlayerProps) => {
  const videoId = useMemo(() => getYouTubeVideoId(videoUrl), [videoUrl]);
  const [localVideoUrl, setLocalVideoUrl] = useState('');

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localVideoUrl.trim()) {
      onSetVideo(localVideoUrl.trim());
    }
  };

  return (
    <>
      <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-black relative">
        {videoId ? (
          <div className="w-full h-full relative">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&showinfo=0&modestbranding=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <div className="absolute top-0 left-0 w-full h-full bg-transparent"></div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
            {isHost ? (
              <div className='w-full max-w-lg'>
                <Film className="h-16 w-16 mb-4 mx-auto" />
                <h3 className="text-xl font-bold text-foreground">شاشة السينما</h3>
                <p className='mb-4'>ابحث عن فيديو في يوتيوب أو الصق رابطًا لبدء العرض.</p>
                <form onSubmit={handleUrlSubmit} className="flex gap-2 mb-4">
                  <Input 
                    type="text"
                    placeholder="الصق رابط فيديو هنا..."
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
        )}
      </div>
    </>
  );
};

export default Player;
