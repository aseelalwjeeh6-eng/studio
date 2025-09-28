'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, get, goOnline, goOffline, runTransaction } from 'firebase/database';
import useUserSession from '@/hooks/use-user-session';
import Player from './Player';
import Chat from './Chat';
import ViewerInfo from './ViewerInfo';
import { Button } from '../ui/button';
import { Loader2, MoreVertical, Search, History, X, Youtube, LogOut, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioConference, useParticipant, useSpeakingParticipants } from '@livekit/components-react';
import LiveKitRoom from './LiveKitRoom';
import Seats from './Seats';
import { searchYoutube } from '@/ai/flows/youtube-search-flow';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export type Member = { 
  name: string;
  joinedAt: object;
};

export type SeatedMember = {
    name: string;
    seatId: number;
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

const RoomHeader = ({ onSearchClick, roomId, onLeaveRoom, onSwitchToVideo }: { onSearchClick: () => void; roomId: string; onLeaveRoom: () => void, onSwitchToVideo: () => void; }) => {
    const { user } = useUserSession();
    const avatar = PlaceHolderImages.find(p => p.id.startsWith('avatar')); // Simple selection for now

    return (
        <header className="flex items-center justify-between p-4 w-full">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreVertical />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card/80 backdrop-blur-lg">
                    <DropdownMenuItem onClick={onSwitchToVideo}>
                        <Video className="me-2" /> مكالمة فيديو
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onLeaveRoom} className="text-destructive">
                        <LogOut className="me-2" /> مغادرة الغرفة
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={onSearchClick} variant="secondary">
                <Youtube className="me-2" />
                بحث يوتيوب
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className='text-right'>
                    <p className='font-bold text-foreground'>غرفة الرمسسة</p>
                    <p>ID: {roomId.slice(0,10)}...</p>
                </div>
                <Avatar>
                    <AvatarImage src={avatar?.imageUrl} />
                    <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>
        </header>
    )
}

const RoomClient = ({ roomId }: { roomId: string }) => {
  const router = useRouter();
  const { user, isLoaded } = useUserSession();
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [seatedMembers, setSeatedMembers] = useState<SeatedMember[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const { toast } = useToast();
  const userName = useMemo(() => user?.name, [user]);

  const viewers = useMemo(() => {
    const seatedNames = new Set(seatedMembers.map(m => m.name));
    return allMembers.filter(m => !seatedNames.has(m.name));
  }, [allMembers, seatedMembers]);

  const setupPresence = useCallback((name: string) => {
    goOnline(database);
    const userRef = ref(database, `rooms/${roomId}/members/${name}`);
    const onDisconnectUserRef = onDisconnect(userRef);
    onDisconnectUserRef.remove();
    set(userRef, { name, joinedAt: serverTimestamp() });
    return onDisconnectUserRef;
  }, [roomId]);
  
  const handleLeaveRoom = () => {
    router.push('/lobby');
  };

  useEffect(() => {
    if (!roomId || !userName) return;
    (async () => {
      try {
        const resp = await fetch(`/api/livekit?room=${roomId}&username=${userName}`);
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [roomId, userName]);

  useEffect(() => {
    const isClient = typeof window !== 'undefined';
    if (!isClient) return;

    if (isLoaded && !userName) {
      router.push('/');
      return;
    }
    if (!userName) return;

    setIsLoading(true);
    let disconnectPresence: ReturnType<typeof onDisconnect> | null = null;
    
    const roomRef = ref(database, `rooms/${roomId}`);
    const membersRef = ref(database, `rooms/${roomId}/members`);
    const seatedMembersRef = ref(database, `rooms/${roomId}/seatedMembers`);
    const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
    
    get(roomRef).then((snapshot) => {
      if (!snapshot.exists()) {
        toast({ title: 'الغرفة غير موجودة', variant: 'destructive' });
        router.push('/lobby');
        return;
      }
      const roomData = snapshot.val();
      const hostName = roomData.host;
      setIsHost(hostName === userName);

      // Initialize seatedMembers if it doesn't exist
      if (!roomData.seatedMembers) {
        set(seatedMembersRef, {});
      }

      disconnectPresence = setupPresence(userName);
      setIsLoading(false);
    }).catch(error => {
      console.error("Failed to fetch room", error);
      toast({ title: 'حدث خطأ', variant: 'destructive' });
      router.push('/lobby');
    });

    const onMembersValue = onValue(membersRef, (snapshot) => setAllMembers(data => snapshot.exists() ? Object.values(snapshot.val()) : []));
    const onSeatedMembersValue = onValue(seatedMembersRef, (snapshot) => {
        const seatedData = snapshot.val();
        const seatedArray = seatedData ? Object.entries(seatedData).map(([seatId, name]) => ({ seatId: parseInt(seatId), name: name as string })) : [];
        setSeatedMembers(seatedArray);
    });
    const onVideoUrlValue = onValue(videoUrlRef, (snapshot) => setVideoUrl(snapshot.val() || ''));

    return () => {
      onValue(membersRef, () => {});
      onValue(videoUrlRef, () => {});
      onValue(seatedMembersRef, () => {});

      if (disconnectPresence) disconnectPresence.cancel();
      
      const userSeat = seatedMembers.find(m => m.name === userName);
      if (userSeat) {
          const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${userSeat.seatId}`);
          set(seatRef, null);
      }
      
      const memberRef = ref(database, `rooms/${roomId}/members/${userName}`);
      get(memberRef).then(snapshot => { if (snapshot.exists()) set(memberRef, null); });
      goOffline(database);
    };
  }, [isLoaded, userName, roomId, router, toast, setupPresence]);

    useEffect(() => {
        if(typeof window !== 'undefined') {
            const storedHistory = localStorage.getItem('youtubeSearchHistory');
            if (storedHistory) {
                setSearchHistory(JSON.parse(storedHistory));
            }
        }
    }, []);
    
    const handleTakeSeat = (seatId: number) => {
        if (!userName) return;
        const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${seatId}`);
        const currentUserSeat = seatedMembers.find(m => m.name === userName);

        runTransaction(seatRef, (currentData) => {
            if (currentData === null) {
                // If user is already seated, remove them from old seat first
                if (currentUserSeat) {
                   const oldSeatRef = ref(database, `rooms/${roomId}/seatedMembers/${currentUserSeat.seatId}`);
                   set(oldSeatRef, null);
                }
                return userName;
            }
            return; // Abort transaction if seat is taken
        }).catch((error) => {
            console.error("Transaction failed: ", error);
            toast({ title: "المقعد محجوز بالفعل", variant: "destructive" });
        });
    };

    const handleLeaveSeat = () => {
        if (!userName) return;
        const currentUserSeat = seatedMembers.find(m => m.name === userName);
        if (currentUserSeat) {
            const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${currentUserSeat.seatId}`);
            set(seatRef, null);
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
        setIsSearchOpen(false);
        }
    };

    const handleHistoryClick = (query: string) => {
        setSearchQuery(query);
        handleSearchSubmit(new Event('submit') as unknown as React.FormEvent);
    };

  const onSetVideo = (url: string) => {
    if (isHost && url) {
      const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
      set(videoUrlRef, url);
    }
  };

  const handleKickUser = (userNameToKick: string) => {
    if (!isHost || !userNameToKick) return;

    // Remove from members
    const memberRef = ref(database, `rooms/${roomId}/members/${userNameToKick}`);
    set(memberRef, null);

    // Remove from seated members if they are seated
    const userSeat = seatedMembers.find(m => m.name === userNameToKick);
    if (userSeat) {
        const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${userSeat.seatId}`);
        set(seatRef, null);
    }
    toast({ title: `تم طرد ${userNameToKick}` });
  };


  if (!isLoaded || !user || isLoading || !token) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      user={user}
      seatedMembers={seatedMembers}
    >
        <div className="flex flex-col h-screen w-full bg-background items-center">
            <RoomHeader 
                onSearchClick={() => setIsSearchOpen(true)} 
                roomId={roomId}
                onLeaveRoom={handleLeaveRoom}
                onSwitchToVideo={() => toast({ title: "ميزة الفيديو سيتم إضافتها قريباً!"})}
            />
            <main className="w-full max-w-4xl mx-auto flex-grow flex flex-col gap-4 px-4">
                <Player videoUrl={videoUrl} onSetVideo={onSetVideo} isHost={isHost} onSearchClick={() => setIsSearchOpen(true)} />
                <Seats 
                    seatedMembers={seatedMembers}
                    onTakeSeat={handleTakeSeat}
                    onLeaveSeat={handleLeaveSeat}
                    currentUser={user}
                    isHost={isHost}
                    onKickUser={handleKickUser}
                />
                <ViewerInfo members={viewers} />
                <div className="flex-grow min-h-0">
                    <Chat roomId={roomId} user={user} />
                </div>
            </main>
             <div className="hidden">
                <AudioConference />
            </div>
        </div>

        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogContent className="max-w-none w-screen h-screen m-0 p-0 !rounded-none flex flex-col bg-background">
                <header className="flex items-center gap-4 p-4 border-b border-border sticky top-0 bg-background z-10">
                    <form onSubmit={handleSearchSubmit} className="flex-grow flex items-center gap-2">
                        <Input
                            type="text"
                            placeholder="ابحث في يوتيوب..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-12 text-lg bg-input border-border focus:ring-accent flex-grow"
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
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-start w-full"
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
                                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-secondary cursor-pointer transition-colors"
                                    onClick={() => handleSelectVideo(video.id.videoId)}
                                    >
                                    <Image
                                        src={video.snippet.thumbnails.default.url}
                                        alt={video.snippet.title}
                                        width={160}
                                        height={90}
                                        className="rounded-lg aspect-video object-cover"
                                    />
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-semibold text-foreground line-clamp-2">{video.snippet.title}</h3>
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
    </LiveKitRoom>
  );
};

export default RoomClient;

    