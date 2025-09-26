'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Search, X, Film } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';

interface PlayerProps {
  videoUrl: string;
  onSetVideo: (url: string) => void;
  isHost: boolean;
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

const Player = ({ videoUrl, onSetVideo, isHost }: PlayerProps) => {
  const [inputUrl, setInputUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const videoId = useMemo(() => getYouTubeVideoId(videoUrl), [videoUrl]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl && isHost) {
      onSetVideo(inputUrl);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery || !isHost) return;
    setIsSearching(true);
    // In a real app, you would use the YouTube Data API.
    // Here we will simulate a search by constructing a search URL and hoping for the best.
    // This is a creative workaround as we cannot use API keys here.
    // We will just create a few fake results to demonstrate the UI.
    const fakeResults: YouTubeVideo[] = [
      { id: { videoId: 'dQw4w9WgXcQ' }, snippet: { title: `"${searchQuery}" - Result 1`, thumbnails: { default: { url: `https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg` } } } },
      { id: { videoId: 'o-YBDTqX_ZU' }, snippet: { title: `"${searchQuery}" - Result 2`, thumbnails: { default: { url: `https://i.ytimg.com/vi/o-YBDTqX_ZU/default.jpg` } } } },
      { id: { videoId: '8ybW48rKBME' }, snippet: { title: `"${searchQuery}" - Result 3`, thumbnails: { default: { url: `https://i.ytimg.com/vi/8ybW48rKBME/default.jpg` } } } },
      { id: { videoId: 'C_blVSouVlA' }, snippet: { title: `"${searchQuery}" - Result 4`, thumbnails: { default: { url: `https://i.ytimg.com/vi/C_blVSouVlA/default.jpg` } } } },
      { id: { videoId: 'V2hlQkVJZhE' }, snippet: { title: `"${searchQuery}" - Result 5`, thumbnails: { default: { url: `https://i.ytimg.com/vi/V2hlQkVJZhE/default.jpg` } } } },
    ];
    setSearchResults(fakeResults);
    setIsSearching(false);
  };
  
  const handleSelectVideo = (videoId: string) => {
    if (isHost) {
      onSetVideo(`https://www.youtube.com/watch?v=${videoId}`);
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  return (
    <Card className="flex-grow w-full bg-card/50 backdrop-blur-lg border-accent/20 shadow-lg flex flex-col">
      <CardContent className="p-2 md:p-4 flex-grow flex flex-col gap-4">
        <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-black relative">
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
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
              {isHost ? (
                <>
                  <Film className="h-16 w-16 mb-4" />
                  <h3 className="text-xl font-bold text-foreground">شاشة السينما</h3>
                  <p>ابحث عن فيديو في يوتيوب أو الصق رابطاً لبدء العرض</p>
                </>
              ) : (
                <>
                  <Film className="h-16 w-16 mb-4" />
                  <p className="text-lg">ينتظر المضيف لبدء الفيلم...</p>
                </>
              )}
            </div>
          )}
           {searchResults.length > 0 && isHost && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex flex-col">
              <div className="p-4 flex justify-between items-center border-b border-accent/20">
                <h3 className="text-lg font-bold">نتائج البحث عن: "{searchQuery}"</h3>
                <Button variant="ghost" size="icon" onClick={() => setSearchResults([])}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ScrollArea className="flex-grow">
                <div className="p-4 space-y-2">
                  {searchResults.map((video) => (
                    <div
                      key={video.id.videoId}
                      className="flex items-center gap-4 p-2 rounded-md hover:bg-accent/20 cursor-pointer"
                      onClick={() => handleSelectVideo(video.id.videoId)}
                    >
                      <Image
                        src={video.snippet.thumbnails.default.url}
                        alt={video.snippet.title}
                        width={120}
                        height={90}
                        className="rounded"
                      />
                      <p className="font-medium text-foreground">{video.snippet.title}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        {isHost && (
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-input/50">
              <TabsTrigger value="search">
                <Search className="me-2 h-4 w-4" />
                بحث في يوتيوب
                </TabsTrigger>
              <TabsTrigger value="link">
                <Play className="me-2 h-4 w-4" />
                لصق رابط
                </TabsTrigger>
            </TabsList>
            <TabsContent value="search">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="ابحث عن فيلم أو مسلسل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-input/70 border-accent/30 focus:ring-accent"
                  disabled={isSearching}
                />
                <Button type="submit" variant="default" disabled={isSearching}>
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="link">
              <form onSubmit={handleUrlSubmit} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="الصق رابط يوتيوب أو أي منصة أخرى هنا..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="bg-input/70 border-accent/30 focus:ring-accent"
                />
                <Button type="submit" variant="default">
                  <Play className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default Player;
