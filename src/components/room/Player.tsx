'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Search, X, Film, Loader2, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { searchYoutube } from '@/ai/flows/youtube-search-flow';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    if(typeof window !== 'undefined') {
        const storedHistory = localStorage.getItem('youtubeSearchHistory');
        if (storedHistory) {
            setSearchHistory(JSON.parse(storedHistory));
        }
    }
  }, []);

  const videoId = useMemo(() => getYouTubeVideoId(videoUrl), [videoUrl]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl && isHost) {
      onSetVideo(inputUrl);
    }
  };

  const updateSearchHistory = (query: string) => {
    if(typeof window === 'undefined') return;
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('youtubeSearchHistory', JSON.stringify(newHistory));
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery || !isHost) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const results = await searchYoutube({ query: searchQuery });
      setSearchResults(results.items);
      updateSearchHistory(searchQuery);
    } catch (error) {
        console.error("YouTube search failed:", error);
        if (error instanceof Error && error.message.includes('YOUTUBE_API_KEY is not set')) {
            setSearchError("مفتاح واجهة برمجة تطبيقات YouTube غير مهيأ. يرجى إضافته إلى ملف .env للمتابعة.");
        } else {
            setSearchError("فشل البحث في يوتيوب. يرجى المحاولة مرة أخرى.");
        }
    } finally {
        setIsSearching(false);
    }
  };
  
  const handleSelectVideo = (videoId: string) => {
    if (isHost) {
      onSetVideo(`https://www.youtube.com/watch?v=${videoId}`);
      setSearchResults([]);
      setSearchQuery('');
      setSearchError(null);
      setIsSearchOpen(false);
    }
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    handleSearchSubmit(new Event('submit') as unknown as React.FormEvent);
  };
  
  return (
    <>
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
          </div>
          {isHost && (
            <Tabs defaultValue="search" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-input/50">
                <TabsTrigger value="search" onClick={() => setIsSearchOpen(true)}>
                  <Search className="me-2 h-4 w-4" />
                  بحث في يوتيوب
                  </TabsTrigger>
                <TabsTrigger value="link">
                  <Play className="me-2 h-4 w-4" />
                  لصق رابط
                  </TabsTrigger>
              </TabsList>
              <TabsContent value="search">
                <div 
                    className="flex items-center justify-center text-center p-4 rounded-md border-dashed border-2 border-accent/30 text-muted-foreground cursor-pointer hover:bg-accent/10 hover:text-foreground"
                    onClick={() => setIsSearchOpen(true)}
                >
                    <Search className="me-2 h-5 w-5" />
                    <p className="text-lg">انقر هنا لفتح واجهة البحث</p>
                </div>
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
      
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-none w-screen h-screen m-0 p-0 !rounded-none flex flex-col bg-background">
            <header className="flex items-center gap-4 p-4 border-b border-accent/20 sticky top-0 bg-background z-10">
                <form onSubmit={handleSearchSubmit} className="flex-grow flex items-center gap-2">
                    <Input
                        type="text"
                        placeholder="ابحث في يوتيوب..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-12 text-lg bg-input/70 border-accent/30 focus:ring-accent flex-grow"
                        disabled={isSearching}
                    />
                    <Button type="submit" size="icon" className="h-12 w-12" disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}
                    </Button>
                </form>
                <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setIsSearchOpen(false)}>
                    <X className="h-6 w-6" />
                </Button>
            </header>
            <div className="flex-grow overflow-y-auto">
                {isSearching && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-12 w-12 animate-spin text-accent" />
                    </div>
                )}
                {searchError && (
                    <div className="flex items-center justify-center h-full p-4">
                        <p className="text-center text-destructive text-lg">{searchError}</p>
                    </div>
                )}
                {!isSearching && !searchError && searchResults.length === 0 && (
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground"><History/> سجل البحث</h2>
                        {searchHistory.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {searchHistory.map((term, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleHistoryClick(term)}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 text-start w-full"
                                    >
                                        <History className="text-muted-foreground" />
                                        <span className="text-lg text-foreground">{term}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">لا يوجد سجل بحث حتى الآن.</p>
                        )}
                    </div>
                )}
                {searchResults.length > 0 && (
                     <div className="max-w-4xl mx-auto p-4">
                        <div className="flex flex-col gap-4">
                            {searchResults.map((video) => (
                                <div
                                key={video.id.videoId}
                                className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/20 cursor-pointer transition-colors"
                                onClick={() => handleSelectVideo(video.id.videoId)}
                                >
                                <Image
                                    src={video.snippet.thumbnails.default.url}
                                    alt={video.snippet.title}
                                    width={160} // Increased size
                                    height={90}
                                    className="rounded-lg aspect-video object-cover"
                                />
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-semibold text-foreground line-clamp-2">{video.snippet.title}</h3>
                                    {/* Additional info can be added here if available from API */}
                                    <p className="text-sm text-muted-foreground mt-1">اسم القناة</p> 
                                    <p className="text-sm text-muted-foreground">مشاهدات · قبل وقت</p>
                                </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Player;

    