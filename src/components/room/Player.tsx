'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';

interface PlayerProps {
  videoUrl: string;
  onSetVideo: (url: string) => void;
  isHost: boolean;
}

function getYouTubeVideoId(url: string) {
  let videoId = '';
  const urlObj = new URL(url);
  if (urlObj.hostname === 'youtu.be') {
    videoId = urlObj.pathname.slice(1);
  } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
    videoId = urlObj.searchParams.get('v') || '';
  }
  return videoId;
}

const Player = ({ videoUrl, onSetVideo, isHost }: PlayerProps) => {
  const [inputUrl, setInputUrl] = useState('');

  const videoId = videoUrl ? getYouTubeVideoId(videoUrl) : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl) {
      onSetVideo(inputUrl);
    }
  };

  return (
    <Card className="flex-grow w-full bg-card/50 backdrop-blur-lg border-accent/20 shadow-lg flex flex-col">
      <CardContent className="p-2 md:p-4 flex-grow flex flex-col gap-4">
        <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-black">
          {videoId ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              ينتظر المضيف لبدء الفيلم...
            </div>
          )}
        </div>
        {isHost && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="الصق رابط يوتيوب هنا..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="bg-input/70 border-accent/30 focus:ring-accent"
            />
            <Button type="submit" variant="default">
              <Play className="h-4 w-4 me-2" />
              تشغيل
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default Player;
