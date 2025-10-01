'use client';

import { useEffect, useState, useMemo, FormEvent, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, get, goOnline, goOffline, runTransaction, update, off, Unsubscribe } from 'firebase/database';
import useUserSession from '@/hooks/use-user-session';
import Player from './Player';
import Chat from './Chat';
import ViewerInfo from './ViewerInfo';
import { Button } from '../ui/button';
import { Loader2, MoreVertical, Search, History, X, Youtube, LogOut, Video, Film, Users, Send, Play, Clapperboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioConference, useLiveKitRoom, useLocalParticipant, useParticipants } from '@livekit/components-react';
import LiveKitRoom from './LiveKitRoom';
import Seats from './Seats';
import { searchYoutube } from '@/ai/flows/youtube-search-flow';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import VideoConference from './VideoConference';
import { AppUser, getFriends, sendRoomInvitation } from '@/lib/firebase-service';
import YouTube, { YouTubePlayer } from 'react-youtube';


export type Member = { 
  name: string;
  avatarId?: string;
  joinedAt: object;
};

export type SeatedMember = {
    name: string;
    avatarId?: string;
    seatId: number;
}

export type PlayerState = {
    isPlaying: boolean;
    seekTime: number;
    timestamp: number;
}

interface YouTubeVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
    };
  };
}

const RoomHeader = ({ onSearchClick, roomId, onLeaveRoom, onSwitchToVideo, onSwitchToPlayer, videoMode, onInviteClick, canControl }: { onSearchClick: () => void; roomId: string; onLeaveRoom: () => void, onSwitchToVideo: () => void; onSwitchToPlayer: () => void; videoMode: boolean; onInviteClick: () => void; canControl: boolean; }) => {
    const { user } = useUserSession();
    const avatar = PlaceHolderImages.find(p => p.id === user?.avatarId) ?? PlaceHolderImages[0];

    return (
        <header className="flex items-center justify-between p-4 w-full">
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card/80 backdrop-blur-lg">
                        {videoMode ? (
                            <DropdownMenuItem onClick={onSwitchToPlayer}>
                                <Film className="me-2" /> العودة للمشاهدة
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={onSwitchToVideo}>
                                <Video className="me-2" /> مكالمة فيديو
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={onLeaveRoom} className="text-destructive">
                            <LogOut className="me-2" /> مغادرة الغرفة
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={onInviteClick} variant="secondary">
                    <Users className="me-2" />
                    دعوة أصدقاء
                </Button>
            </div>

            {!videoMode && canControl && (
                <Button onClick={onSearchClick} variant="outline">
                    <Youtube className="me-2" />
                    بحث يوتيوب
                </Button>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className='text-right'>
                    <p className='font-bold text-foreground'>غرفة المشاهدة</p>
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

const RoomLayout = ({ roomId, videoMode = false }: { roomId: string, videoMode?: boolean }) => {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUserSession();
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [seatedMembers, setSeatedMembers] = useState<SeatedMember[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [hostName, setHostName] = useState('');
  const [moderators, setModerators] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [friends, setFriends] = useState<AppUser[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  const [previewVideo, setPreviewVideo] = useState<YouTubeVideo | null>(null);
  const previewPlayerRef = useRef<YouTubePlayer | null>(null);

  
  const { toast } = useToast();
  const { room } = useLiveKitRoom();
  const { localParticipant } = useLocalParticipant();

  const isHost = user?.name === hostName;
  const isModerator = user ? moderators.includes(user.name) : false;
  const canControl = isHost || isModerator;

  const viewers = useMemo(() => {
    const seatedNames = new Set(seatedMembers.map(m => m.name));
    return allMembers.filter(m => !seatedNames.has(m.name));
  }, [allMembers, seatedMembers]);

  const isSeated = useMemo(() => {
    if (!user) return false;
    return seatedMembers.some(m => m.name === user.name);
  }, [seatedMembers, user]);
  
  const isMuted = useMemo(() => {
      if (!localParticipant) return true;
      return localParticipant.isMicrophoneMuted;
  }, [localParticipant, localParticipant?.isMicrophoneMuted]);


  const handleLeaveRoom = () => {
    router.push('/lobby');
  };

  const handleSwitchToVideo = () => {
    router.push(`/rooms/${roomId}/video`);
  };

  const handleSwitchToPlayer = () => {
      router.push(`/rooms/${roomId}`);
  }
  
  useEffect(() => {
    if (!isUserLoaded || !user) return;

    let isMounted = true;
    const listeners: Unsubscribe[] = [];

    const setupListeners = async () => {
        const roomRef = ref(database, `rooms/${roomId}`);
        const roomSnapshot = await get(roomRef);
        if (!isMounted) return;

        if (!roomSnapshot.exists()) {
          toast({ title: 'الغرفة غير موجودة', description: 'تمت إعادة توجيهك إلى الردهة.', variant: 'destructive' });
          router.push('/lobby');
          return;
        }

        const membersRef = ref(database, `rooms/${roomId}/members`);
        listeners.push(onValue(membersRef, (snapshot) => setAllMembers(snapshot.exists() ? Object.values(snapshot.val()) : [])));
        
        const seatedMembersRef = ref(database, `rooms/${roomId}/seatedMembers`);
        listeners.push(onValue(seatedMembersRef, (snapshot) => {
            const seatedData = snapshot.val();
            const seatedArray = seatedData ? Object.values(seatedData) : [];
            setSeatedMembers(seatedArray as SeatedMember[]);
        }));
        
        const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
        listeners.push(onValue(videoUrlRef, (snapshot) => setVideoUrl(snapshot.val() || '')));

        const playerStateRef = ref(database, `rooms/${roomId}/playerState`);
        listeners.push(onValue(playerStateRef, (snapshot) => setPlayerState(snapshot.val())));

        const hostRef = ref(database, `rooms/${roomId}/host`);
        listeners.push(onValue(hostRef, (snapshot) => setHostName(snapshot.val() || '')));

        const moderatorsRef = ref(database, `rooms/${roomId}/moderators`);
        listeners.push(onValue(moderatorsRef, (snapshot) => setModerators(snapshot.val() || [])));
    };

    setupListeners();

    return () => {
        isMounted = false;
        listeners.forEach(unsubscribe => unsubscribe());
    };
}, [isUserLoaded, user, roomId, router, toast]);

  useEffect(() => {
      if(typeof window !== 'undefined') {
          const storedHistory = localStorage.getItem('youtubeSearchHistory');
          if (storedHistory) {
              setSearchHistory(JSON.parse(storedHistory));
          }
      }
  }, []);

  useEffect(() => {
    if (user && isSeated) {
        const currentUserSeat = seatedMembers.find(m => m.name === user.name);
        if (currentUserSeat) {
            const updates: { [key: string]: any } = {};
            updates[`/rooms/${roomId}/seatedMembers/${currentUserSeat.seatId}/avatarId`] = user.avatarId;
            updates[`/rooms/${roomId}/members/${user.name}/avatarId`] = user.avatarId;
            update(ref(database), updates);
        }
    }
  }, [user?.avatarId, isSeated, roomId, user, seatedMembers]);
    
  const handleTakeSeat = (seatId: number) => {
      if (!user) return;
      const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${seatId}`);
      const currentUserSeat = seatedMembers.find(m => m.name === user.name);

      runTransaction(seatRef, (currentData) => {
          if (currentData === null) {
              if (currentUserSeat) {
                 const oldSeatRef = ref(database, `rooms/${roomId}/seatedMembers/${currentUserSeat.seatId}`);
                 set(oldSeatRef, null);
              }
              return { name: user.name, avatarId: user.avatarId, seatId: seatId };
          }
          return; 
      }).catch((error) => {
          console.error("Transaction failed: ", error);
          toast({ title: "المقعد محجوز بالفعل", variant: "destructive" });
      });
  };

  const handleLeaveSeat = () => {
      if (!user) return;
      const currentUserSeat = seatedMembers.find(m => m.name === user.name);
      if (currentUserSeat) {
          const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${currentUserSeat.seatId}`);
          set(seatRef, null);
      }
  };

  const handleToggleMute = () => {
    if (isSeated && localParticipant) {
        const isEnabled = localParticipant.isMicrophoneEnabled;
        localParticipant.setMicrophoneEnabled(!isEnabled);
    }
  };

  const updateSearchHistory = (query: string) => {
      if(typeof window === 'undefined' || !query) return;
      const newHistory = [query, ...searchHistory.filter(h => h.toLowerCase() !== query.toLowerCase())].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('youtubeSearchHistory', JSON.stringify(newHistory));
  };

  const performSearch = async (query: string) => {
      if (!query.trim() || !canControl) return;
      
      setIsSearching(true);
      setSearchError(null);
      setResults([]);
      try {
        const results = await searchYoutube({ query: query.trim() });
        setResults(results.items);
        updateSearchHistory(query.trim());
      } catch (error) {
          console.error("YouTube search failed:", error);
          if (error instanceof Error && error.message.includes('YOUTUBE_API_KEY')) {
              setSearchError("مفتاح واجهة برمجة تطبيقات YouTube غير مهيأ أو غير صحيح. يرجى إضافته إلى ملف .env للمتابعة.");
          } else if (error instanceof Error) {
              setSearchError(`فشل البحث في يوتيوب: ${error.message}`);
          } else {
              setSearchError("فشل البحث في يوتيوب. يرجى المحاولة مرة أخرى.");
          }
      } finally {
          setIsSearching(false);
      }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  }

  const handleHistoryClick = (query: string) => {
      setSearchQuery(query);
      performSearch(query);
  };
  
  const onSetVideo = useCallback((url: string, startTime = 0) => {
    if (canControl) {
      set(ref(database, `rooms/${roomId}/videoUrl`), url);
      set(ref(database, `rooms/${roomId}/playerState`), { 
        isPlaying: true, 
        seekTime: startTime, 
        timestamp: Date.now()
      });
    }
  }, [canControl, roomId]);
  
  const handlePlayerStateChange = useCallback((newState: Partial<PlayerState>) => {
    if (canControl) {
        const playerStateRef = ref(database, `rooms/${roomId}/playerState`);
        runTransaction(playerStateRef, (currentState) => {
            const current = currentState || { isPlaying: false, seekTime: 0 };
            return { ...current, ...newState, timestamp: Date.now() };
        });
    }
  }, [canControl, roomId]);


  const handleSetVideoFromPreview = () => {
    if (previewPlayerRef.current && previewVideo) {
      const currentTime = previewPlayerRef.current.getCurrentTime();
      onSetVideo(`https://www.youtube.com/watch?v=${previewVideo.id.videoId}`, currentTime);
      setPreviewVideo(null); // Close preview dialog
      setIsSearchOpen(false); // Close search dialog
    }
  };

  const handleVideoEnded = () => {
    if (!canControl) return;
    onSetVideo('');
  };

  const handleKickUser = (userNameToKick: string) => {
    if (!canControl || !userNameToKick) return;

    const memberRef = ref(database, `rooms/${roomId}/members/${userNameToKick}`);
    set(memberRef, null);

    const userSeat = seatedMembers.find(m => m.name === userNameToKick);
    if (userSeat) {
        const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${userSeat.seatId}`);
        set(seatRef, null);
    }
    toast({ title: `تم طرد ${userNameToKick}` });
  };
  
  const handleOpenInviteDialog = async () => {
    if (!user) return;
    const friendsData = await getFriends(user.name);
    setFriends(friendsData);
    setIsInviteOpen(true);
  };

  const handleSendInvitation = async (recipientName: string) => {
    if (!user) return;
    try {
        await sendRoomInvitation(user.name, recipientName, roomId, `غرفة ${hostName}`);
        setInvitedFriends(prev => new Set(prev).add(recipientName));
        toast({ title: "تم إرسال الدعوة", description: `تمت دعوة ${recipientName} إلى الغرفة.` });
    } catch (error: any) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handlePromote = (userName: string) => {
      if (!isHost) return;
      const roomRef = ref(database, `rooms/${roomId}/moderators`);
      const newModerators = [...moderators, userName];
      set(roomRef, newModerators);
      toast({ title: "تمت الترقية", description: `أصبح ${userName} مشرفًا.` });
  }

  const handleDemote = (userName: string) => {
      if (!isHost) return;
      const roomRef = ref(database, `rooms/${roomId}/moderators`);
      const newModerators = moderators.filter(mod => mod !== userName);
      set(roomRef, newModerators);
      toast({ title: "تم تخفيض الرتبة", description: `لم يعد ${userName} مشرفًا.` });
  }

  const handleTransferHost = (userName: string) => {
      if (!isHost) return;
      const roomRef = ref(database, `rooms/${roomId}/host`);
      set(roomRef, userName);
      handleDemote(userName); // Demote from moderator if they were one
      toast({ title: "تم نقل الملكية", description: `أصبحت الغرفة الآن ملك ${userName}.` });
  }

  const getAvatar = (user: AppUser | Member | SeatedMember) => {
    return PlaceHolderImages.find(p => p.id === user.avatarId) ?? PlaceHolderImages[0];
  }

  if (!isUserLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background items-center">
        <RoomHeader 
            onSearchClick={() => setIsSearchOpen(true)} 
            roomId={roomId}
            onLeaveRoom={handleLeaveRoom}
            onSwitchToVideo={handleSwitchToVideo}
            onSwitchToPlayer={handleSwitchToPlayer}
            videoMode={videoMode}
            onInviteClick={handleOpenInviteDialog}
            canControl={canControl}
        />
        <main className="w-full max-w-7xl mx-auto flex-grow flex flex-col gap-4 px-4 pb-4">
            {videoMode ? (
               <div className="flex-grow rounded-lg overflow-hidden">
                 <VideoConference />
               </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-4 h-full min-h-0">
                    <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
                        <Player 
                            videoUrl={videoUrl} 
                            onSetVideo={onSetVideo} 
                            canControl={canControl} 
                            onSearchClick={() => setIsSearchOpen(true)}
                            playerState={playerState}
                            onPlayerStateChange={handlePlayerStateChange}
                            onVideoEnded={handleVideoEnded}
                        />
                         <Seats 
                            seatedMembers={seatedMembers}
                            moderators={moderators}
                            onTakeSeat={handleTakeSeat}
                            onLeaveSeat={handleLeaveSeat}
                            currentUser={user}
                            isHost={isHost}
                            onKickUser={handleKickUser}
                            onPromote={handlePromote}
                            onDemote={handleDemote}
                            onTransferHost={handleTransferHost}
                            room={room}
                        />
                        <ViewerInfo members={viewers} />
                    </div>
                    <div className="min-h-0">
                       <Chat 
                            roomId={roomId} 
                            user={user} 
                            isHost={isHost}
                            isSeated={isSeated}
                            isMuted={isMuted}
                            onToggleMute={handleToggleMute}
                        />
                    </div>
                </div>
            )}

        </main>
         <div className="hidden">
            <AudioConference />
        </div>

    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>دعوة أصدقاء</DialogTitle>
                <DialogDescription>
                    أرسل دعوات لأصدقائك للانضمام إليك في غرفة المشاهدة.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-80 overflow-y-auto mt-4">
                {friends.length > 0 ? friends.map((friend) => (
                    <div key={friend.name} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={getAvatar(friend)?.imageUrl} alt={friend.name} />
                                <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{friend.name}</span>
                        </div>
                        <Button 
                            size="sm" 
                            onClick={() => handleSendInvitation(friend.name)} 
                            disabled={invitedFriends.has(friend.name)}
                        >
                            {invitedFriends.has(friend.name) ? "تمت الدعوة" : "دعوة"}
                            {!invitedFriends.has(friend.name) && <Send className="ms-2 h-4 w-4"/>}
                        </Button>
                    </div>
                )) : (
                    <p className="text-center text-muted-foreground py-4">ليس لديك أصدقاء لدعوتهم بعد.</p>
                )}
            </div>
        </DialogContent>
    </Dialog>


    <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>بحث يوتيوب</DialogTitle>
            <DialogDescription>
              ابحث عن مقاطع فيديو من يوتيوب لتشغيلها في الغرفة.
            </DialogDescription>
            <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-4">
              <Input
                type="text"
                placeholder="ابحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-input"
                disabled={isSearching}
              />
              <Button type="submit" disabled={isSearching}>
                {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
              </Button>
            </form>
          </DialogHeader>
          <div className="p-6 pt-2 max-h-[60vh] overflow-y-auto">
            {isSearching && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            )}
            {searchError && (
              <div className="text-center text-destructive py-8">{searchError}</div>
            )}
            {!isSearching && !searchError && searchResults.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {searchHistory.length > 0 ? (
                  <div>
                    <h3 className="font-semibold mb-2">سجل البحث الأخير</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                      {searchHistory.map((term, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handleHistoryClick(term)}
                        >
                          <History className="me-2 h-4 w-4" />
                          {term}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>ابحث عن فيديو لبدء الحفلة.</p>
                )}
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((video) => (
                  <div
                    key={video.id.videoId}
                    className="flex items-center gap-4 p-2 rounded-lg bg-secondary/50"
                  >
                    <Image
                      src={video.snippet.thumbnails.default.url}
                      alt={video.snippet.title}
                      width={120}
                      height={68}
                      className="rounded-lg aspect-video object-cover"
                    />
                    <div className="flex-grow overflow-hidden">
                      <h3 className="font-semibold text-foreground truncate">
                        {video.snippet.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {video.snippet.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewVideo(video)}
                    >
                      <Play className="me-2 h-4 w-4" />
                      معاينة
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>


    {previewVideo && (
        <Dialog open={!!previewVideo} onOpenChange={(isOpen) => !isOpen && setPreviewVideo(null)}>
            <DialogContent className="max-w-4xl w-full">
                <DialogHeader>
                    <DialogTitle>{previewVideo.snippet.title}</DialogTitle>
                    <DialogDescription className="line-clamp-2">{previewVideo.snippet.description}</DialogDescription>
                </DialogHeader>
                <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-black relative">
                     <YouTube
                        videoId={previewVideo.id.videoId}
                        opts={{
                            height: '100%',
                            width: '100%',
                            playerVars: {
                              autoplay: 1,
                              controls: 1,
                            },
                        }}
                        onReady={(event) => { previewPlayerRef.current = event.target; }}
                        className="w-full h-full"
                    />
                </div>
                <Button onClick={handleSetVideoFromPreview} size="lg" className="w-full">
                    <Clapperboard className="me-2" />
                    عرض للجميع
                </Button>
            </DialogContent>
        </Dialog>
    )}
</div>
  )
}


const RoomClient = ({ roomId, videoMode = false }: { roomId: string, videoMode?: boolean }) => {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUserSession();
  const [token, setToken] = useState('');
  const { toast } = useToast();
  
  useEffect(() => {
    if (!isUserLoaded) return;
    if (!user) {
        router.push('/');
        return;
    }

    let isMounted = true;
    let memberRef = ref(database, `rooms/${roomId}/members/${user.name}`);

    const setupRoom = async () => {
        const roomRef = ref(database, `rooms/${roomId}`);
        const roomSnapshot = await get(roomRef);

        if (!roomSnapshot.exists()) {
            toast({ title: 'الغرفة غير موجودة', description: 'تمت إعادة توجيهك إلى الردهة.', variant: 'destructive' });
            router.push('/lobby');
            return;
        }

        // Setup presence and fetch LiveKit token in parallel
        const presencePromise = (async () => {
            await goOnline(database);
            const memberData = { name: user.name, avatarId: user.avatarId || 'avatar1', joinedAt: serverTimestamp() };
            await set(memberRef, memberData);
            onDisconnect(memberRef).remove();
        })();

        const tokenFetchPromise = (async () => {
            try {
                const res = await fetch(`/api/livekit?room=${roomId}&username=${user.name}`);
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Failed to fetch token: ${res.statusText} - ${errorText}`);
                }
                const data = await res.json();
                if (isMounted) {
                    setToken(data.token);
                }
            } catch (error) {
                 if (isMounted) {
                    console.error("Error fetching LiveKit token:", error);
                    toast({ title: 'خطأ في الاتصال', description: 'فشل في الحصول على رمز الدخول للغرفة الصوتية.', variant: 'destructive' });
                 }
            }
        })();

        try {
            await Promise.all([presencePromise, tokenFetchPromise]);
        } catch (error) {
            if (isMounted) {
                console.error("Error setting up room:", error);
                toast({ title: 'خطأ في الاتصال', description: 'فشل في تهيئة الغرفة.', variant: 'destructive' });
                router.push('/lobby');
            }
        }
    };

    setupRoom();

    return () => {
        isMounted = false;
        // The onDisconnect handles removal, but we can also do it client-side for faster cleanup.
        // The check for snapshot existence is to prevent errors if the component unmounts quickly.
        get(memberRef).then(snapshot => {
            if (snapshot.exists()) {
                remove(memberRef);
            }
        }).finally(() => {
            goOffline(database);
        });
    };
}, [isUserLoaded, user, roomId, router, toast]);

  if (!isUserLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }
  
  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
        <p className="ms-4 text-muted-foreground">جارٍ تهيئة الغرفة...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
      user={user}
      isSeated={true} // This will be managed within RoomLayout based on seatedMembers state
      videoMode={videoMode}
    >
      <RoomLayout roomId={roomId} videoMode={videoMode} />
    </LiveKitRoom>
  );
};

export default RoomClient;
