'use client';

import { useEffect, useState, useMemo, FormEvent, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, get, goOnline, goOffline, runTransaction, update, off, Unsubscribe, remove, push } from 'firebase/database';
import useUserSession from '@/hooks/use-user-session';
import Player from './Player';
import Chat, { Message } from './Chat';
import ViewerInfo from './ViewerInfo';
import { Button } from '../ui/button';
import { Loader2, MoreVertical, Search, History, X, Youtube, LogOut, Video, Film, Users, Send, Play, Clapperboard, Plus, ListMusic, Wallpaper, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioConference, useLiveKitRoom, useLocalParticipant, useParticipants } from '@livekit/components-react';
import LiveKitRoom from './LiveKitRoom';
import Seats from './Seats';
import { searchYoutube } from '@/ai/flows/youtube-search-flow';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages, ImagePlaceholder } from '@/lib/placeholder-images';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import VideoConference from './VideoConference';
import { AppUser, getFriends, sendRoomInvitation } from '@/lib/firebase-service';
import YouTube, { YouTubePlayer } from 'react-youtube';
import Playlist, { PlaylistItem } from './Playlist';
import { cn } from '@/lib/utils';


export type Member = { 
  name: string;
  avatarId?: string;
  joinedAt: any; // Can be a server timestamp object or a number
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

const RoomHeader = ({ onSearchClick, onPlaylistClick, roomId, onLeaveRoom, onSwitchToVideo, onSwitchToPlayer, videoMode, onInviteClick, onBackgroundClick, canControl }: { onSearchClick: () => void; onPlaylistClick: () => void; roomId: string; onLeaveRoom: () => void, onSwitchToVideo: () => void; onSwitchToPlayer: () => void; videoMode: boolean; onInviteClick: () => void; onBackgroundClick: () => void; canControl: boolean; }) => {
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
                         <DropdownMenuItem onClick={onInviteClick}>
                            <Users className="me-2" />
                            دعوة أصدقاء
                        </DropdownMenuItem>
                        {canControl && (
                            <DropdownMenuItem onClick={onBackgroundClick}>
                                <Wallpaper className="me-2"/>
                                تغيير الخلفية
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
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
            </div>

            {!videoMode && canControl && (
                <div className='flex items-center gap-2'>
                    <Button onClick={onPlaylistClick} variant="outline">
                        <ListMusic className="me-2" />
                        قائمة التشغيل
                    </Button>
                    <Button onClick={onSearchClick} variant="outline">
                        <Youtube className="me-2" />
                        إضافة فيديو
                    </Button>
                </div>
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
  const seatedMembersRef = useRef<SeatedMember[]>([]);
  const [seatedMembers, setSeatedMembers] = useState<SeatedMember[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [hostName, setHostName] = useState('');
  const [moderators, setModerators] = useState<string[]>([]);
  const [roomBackground, setRoomBackground] = useState<string | null>(null);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
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
  const participants = useParticipants();

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
      const participant = [localParticipant, ...participants].find(p => p.identity === user?.name);
      return participant ? !participant.isMicrophoneEnabled : true;
  }, [localParticipant, participants, user?.name]);


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
        
        const seatedMembersRefDb = ref(database, `rooms/${roomId}/seatedMembers`);
        listeners.push(onValue(seatedMembersRefDb, (snapshot) => {
            const seatedData = snapshot.val();
            const seatedArray = seatedData ? Object.values(seatedData) : [];
            seatedMembersRef.current = seatedArray as SeatedMember[];
            setSeatedMembers(seatedArray as SeatedMember[]);
        }));
        
        const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
        listeners.push(onValue(videoUrlRef, (snapshot) => setVideoUrl(snapshot.val() || '')));
        
        const backgroundUrlRef = ref(database, `rooms/${roomId}/backgroundUrl`);
        listeners.push(onValue(backgroundUrlRef, (snapshot) => setRoomBackground(snapshot.val() || null)));

        const playlistRef = ref(database, `rooms/${roomId}/playlist`);
        listeners.push(onValue(playlistRef, (snapshot) => setPlaylist(snapshot.exists() ? Object.values(snapshot.val()) : [])));

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

  const sendSystemMessage = useCallback((text: string) => {
    if (!roomId) return;
    const chatRef = ref(database, `rooms/${roomId}/chat`);
    const messageData: Message = {
      sender: 'System',
      text, // No user name prefix needed as it's passed from caller
      timestamp: Date.now(),
      isSystemMessage: true,
    };
    push(chatRef, messageData);
  }, [roomId]);


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
      const currentUserSeat = seatedMembersRef.current.find(m => m.name === user.name);

      runTransaction(seatRef, (currentData) => {
          if (currentData === null) {
              if (currentUserSeat) {
                 const oldSeatRef = ref(database, `rooms/${roomId}/seatedMembers/${currentUserSeat.seatId}`);
                 set(oldSeatRef, null);
              }
              return { name: user.name, avatarId: user.avatarId || 'avatar1', seatId: seatId };
          }
          return; 
      }).then((result) => {
          if (result.committed && !currentUserSeat) {
             sendSystemMessage(`${user.name}@ دخل الغرفة`);
          }
      }).catch((error) => {
          console.error("Transaction failed: ", error);
          toast({ title: "المقعد محجوز بالفعل", variant: "destructive" });
      });
  };

  const handleLeaveSeat = () => {
      if (!user) return;
      const currentUserSeat = seatedMembersRef.current.find(m => m.name === user.name);
      if (currentUserSeat) {
          const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${currentUserSeat.seatId}`);
          set(seatRef, null).then(() => {
            sendSystemMessage(`${user.name}@ غادر الغرفة`);
          });
      }
  };

  const handleToggleMute = () => {
    if (isSeated && user) {
        const participant = [localParticipant, ...participants].find(p => p.identity === user.name);
        if (participant) {
            const isEnabled = participant.isMicrophoneEnabled;
            participant.setMicrophoneEnabled(!isEnabled);
        }
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
  
  const onSetVideo = useCallback((videoIdentifier: string, startTime = 0) => {
    if (canControl) {
      set(ref(database, `rooms/${roomId}/videoUrl`), videoIdentifier);
      set(ref(database, `rooms/${roomId}/playerState`), { 
        isPlaying: !!videoIdentifier, 
        seekTime: startTime, 
        timestamp: serverTimestamp() 
      });
    }
  }, [canControl, roomId]);
  
  const handlePlayerStateChange = useCallback((newState: Partial<PlayerState>) => {
    if (canControl) {
        const playerStateRef = ref(database, `rooms/${roomId}/playerState`);
        runTransaction(playerStateRef, (currentState) => {
            const current = currentState || { isPlaying: false, seekTime: 0 };
            return { ...current, ...newState, timestamp: serverTimestamp() };
        });
    }
  }, [canControl, roomId]);


  const handleSetVideoFromPreview = () => {
    if (previewPlayerRef.current && previewVideo) {
      const currentTime = previewPlayerRef.current.getCurrentTime();
      onSetVideo(previewVideo.id.videoId, currentTime);
      setPreviewVideo(null); // Close preview dialog
      setIsSearchOpen(false); // Close search dialog
    }
  };

  const handleAddToPlaylistFromSearch = (video: YouTubeVideo) => {
      const newItem: PlaylistItem = {
        id: video.id.videoId,
        videoId: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
      };
      const playlistRef = ref(database, `rooms/${roomId}/playlist/${btoa(newItem.id)}`);
      set(playlistRef, newItem);
      toast({ title: "تمت الإضافة", description: `تمت إضافة "${video.snippet.title}" إلى قائمة التشغيل.` });
  };
  
  const handleAddUrlToPlaylist = async (url: string) => {
    if (!url.trim()) return;

    let videoId = null;
    let title = url;
    let thumbnail = `https://picsum.photos/seed/${Math.random()}/120/68`; // generic placeholder
    
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname === 'youtu.be') {
            videoId = parsedUrl.hostname === 'youtu.be'
                ? parsedUrl.pathname.slice(1)
                : parsedUrl.searchParams.get('v');
            
            if (videoId) {
                // Try to fetch title from youtube
                try {
                    const response = await fetch(`https://noembed.com/json?url=${encodeURIComponent(url)}`);
                    const data = await response.json();
                    if(data.title) title = data.title;
                    if(data.thumbnail_url) thumbnail = data.thumbnail_url;
                } catch(e) {
                    console.warn("Could not fetch oEmbed details for youtube URL", e);
                }
            }
        }
    } catch(e) { /* Not a URL, do nothing special */ }

    const newItem: PlaylistItem = {
        id: videoId || url, // Use URL as ID if not youtube
        videoId: videoId || url,
        title: title,
        thumbnail: thumbnail,
    };

    const playlistRef = ref(database, `rooms/${roomId}/playlist/${btoa(newItem.id)}`);
    set(playlistRef, newItem);
    toast({ title: "تمت الإضافة", description: `تمت إضافة فيديو إلى قائمة التشغيل.` });
    setUrlInput('');
  };

  const handlePlayFromPlaylist = (videoId: string) => {
    onSetVideo(videoId);
    setIsPlaylistOpen(false);
  };

  const handleRemoveFromPlaylist = (itemId: string) => {
      const playlistRef = ref(database, `rooms/${roomId}/playlist/${btoa(itemId)}`);
      remove(playlistRef);
  };

  const handleVideoEnded = () => {
    if (!canControl) return;

    const currentVideoId = videoUrl.includes('v=') ? new URL(videoUrl).searchParams.get('v') : null;
    
    if (playlist.length > 0) {
        let nextVideoIndex = 0;
        if (currentVideoId) {
            const currentIndex = playlist.findIndex(item => item.videoId === currentVideoId);
            if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
                nextVideoIndex = currentIndex + 1;
            } else {
                 // It was the last video, or not in playlist, so clear the screen.
                 onSetVideo('');
                 return;
            }
        }
        onSetVideo(playlist[nextVideoIndex].videoId);
    } else {
        onSetVideo('');
    }
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
    try {
      const friendsData = await getFriends(user.name);
      setFriends(friendsData);
      setInvitedFriends(new Set()); // Reset invited state on open
      setIsInviteOpen(true);
    } catch(error) {
      toast({ title: "خطأ", description: "فشل في جلب قائمة الأصدقاء.", variant: "destructive" });
    }
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
      if (!isHost || !userName) return;
      const updates: { [key: string]: any } = {};
      updates[`/rooms/${roomId}/host`] = userName;
      // Also make the old host a moderator
      const newModerators = [...moderators.filter(m => m !== userName), hostName];
      updates[`/rooms/${roomId}/moderators`] = newModerators;

      update(ref(database), updates);
      toast({ title: "تم نقل الملكية", description: `أصبحت الغرفة الآن ملك ${userName}.` });
  }

  const getAvatar = (user: AppUser | Member | SeatedMember) => {
    return PlaceHolderImages.find(p => p.id === user.avatarId) ?? PlaceHolderImages[0];
  }
  
  const handleSetBackground = (imageUrl: string) => {
    if (!canControl) return;
    set(ref(database, `rooms/${roomId}/backgroundUrl`), imageUrl);
    setIsBackgroundOpen(false);
  }
  
  const roomBackgrounds = useMemo(() => {
    return [...PlaceHolderImages.filter(p => p.id.startsWith('room-bg')), ...PlaceHolderImages.filter(p => p.id.startsWith('user-bg'))];
  }, []);

  if (!isUserLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen w-full bg-background items-center">
        {roomBackground && (
            <div className="absolute inset-0 z-0">
                <Image
                    src={roomBackground}
                    alt="Room background"
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            </div>
        )}
        <div className="relative z-10 w-full flex flex-col h-full items-center">
            <RoomHeader 
                onSearchClick={() => setIsSearchOpen(true)} 
                onPlaylistClick={() => setIsPlaylistOpen(true)}
                roomId={roomId}
                onLeaveRoom={handleLeaveRoom}
                onSwitchToVideo={handleSwitchToVideo}
                onSwitchToPlayer={handleSwitchToPlayer}
                videoMode={videoMode}
                onInviteClick={handleOpenInviteDialog}
                onBackgroundClick={() => setIsBackgroundOpen(true)}
                canControl={canControl}
            />
             <main className="w-full max-w-7xl mx-auto flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 px-4 pb-4 min-h-0">
                {videoMode ? (
                   <div className="md:col-span-3 rounded-lg overflow-hidden h-full">
                     <VideoConference />
                   </div>
                ) : (
                    <div className="md:col-span-3 flex flex-col gap-4 min-h-0">
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
                            hostName={hostName}
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
                        <div className="flex-grow flex flex-col gap-4 min-h-0">
                            <ViewerInfo members={viewers} />
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
        </div>
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
    
    <Dialog open={isPlaylistOpen} onOpenChange={setIsPlaylistOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>قائمة التشغيل</DialogTitle>
            <DialogDescription>طابور الفيديوهات التالية.</DialogDescription>
          </DialogHeader>
          <Playlist 
            items={playlist}
            canControl={canControl}
            onPlay={handlePlayFromPlaylist}
            onRemove={handleRemoveFromPlaylist}
            currentVideoUrl={videoUrl}
           />
           <DialogFooter>
                <Button variant="outline" onClick={() => setIsPlaylistOpen(false)}>إغلاق</Button>
           </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isBackgroundOpen} onOpenChange={setIsBackgroundOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>اختر خلفية للغرفة</DialogTitle>
                <DialogDescription>ستظهر الخلفية الجديدة لجميع المستخدمين في الغرفة.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {roomBackgrounds.map(bg => (
                    <div key={bg.id} className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group" onClick={() => handleSetBackground(bg.imageUrl)}>
                        <Image
                            src={bg.imageUrl}
                            alt={bg.description}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                         {roomBackground === bg.imageUrl && (
                            <div className="absolute top-2 right-2 bg-accent text-accent-foreground rounded-full p-1">
                                <Check className="w-4 h-4"/>
                            </div>
                         )}
                    </div>
                ))}
            </div>
        </DialogContent>
    </Dialog>


    <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>إضافة فيديو</DialogTitle>
            <DialogDescription>
                ابحث في يوتيوب أو الصق رابط فيديو من أي موقع.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4 space-y-4">
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="الصق رابط فيديو هنا..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="bg-input"
                />
                <Button onClick={() => handleAddUrlToPlaylist(urlInput)}><Plus/></Button>
            </div>
             <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-muted-foreground text-xs">أو</span>
              <div className="flex-grow border-t border-border"></div>
            </div>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="ابحث في يوتيوب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-input"
                disabled={isSearching}
              />
              <Button type="submit" disabled={isSearching}>
                {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
              </Button>
            </form>
          </div>
          <div className="px-6 pb-6 max-h-[50vh] overflow-y-auto">
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
                  <p>ابحث عن فيديو لإضافته إلى قائمة التشغيل.</p>
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
                    </div>
                     <div className="flex items-center gap-1">
                        <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPreviewVideo(video)}
                        >
                            <Play className="me-2 h-4 w-4" />
                            معاينة
                        </Button>
                        <Button size="sm" onClick={() => handleAddToPlaylistFromSearch(video)}>
                            <ListMusic className="me-2 h-4 w-4" />
                            إضافة
                        </Button>
                    </div>
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
                 <div className="flex gap-2">
                    <Button onClick={() => handleAddToPlaylistFromSearch(previewVideo)} variant="secondary" size="lg" className="w-full">
                        <ListMusic className="me-2" />
                        إضافة إلى القائمة
                    </Button>
                    <Button onClick={handleSetVideoFromPreview} size="lg" className="w-full">
                        <Clapperboard className="me-2" />
                        عرض للجميع الآن
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )}
</div>
  );
}


const RoomClient = ({ roomId, videoMode = false }: { roomId: string, videoMode?: boolean }) => {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUserSession();
  const [token, setToken] = useState('');
  const { toast } = useToast();
  
  const sendSystemMessage = useCallback((text: string) => {
    if (!roomId || !user) return;
    const chatRef = ref(database, `rooms/${roomId}/chat`);
    const messageData: Message = {
      sender: 'System',
      text,
      timestamp: Date.now(),
      isSystemMessage: true,
    };
    push(chatRef, messageData);
  }, [roomId, user]);


  useEffect(() => {
    if (!isUserLoaded) return;
    if (!user) {
        router.push('/');
        return;
    }

    let isMounted = true;
    const memberRef = ref(database, `rooms/${roomId}/members/${user.name}`);
    const hostRef = ref(database, `rooms/${roomId}/host`);

    const setupRoom = async () => {
        const roomSnapshot = await get(ref(database, `rooms/${roomId}`));

        if (!isMounted) return;
        
        if (!roomSnapshot.exists()) {
            toast({ title: 'الغرفة غير موجودة', description: 'تمت إعادة توجيهك إلى الردهة.', variant: 'destructive' });
            router.push('/lobby');
            return;
        }
        
        const currentHost = roomSnapshot.val().host;

        // Setup presence and fetch LiveKit token in parallel
        const presencePromise = (async () => {
            await goOnline(database);
            const memberData = { name: user.name, avatarId: user.avatarId || 'avatar1', joinedAt: serverTimestamp() };
            await set(memberRef, memberData);
            

            const disconnectRef = onDisconnect(memberRef);
            disconnectRef.remove();

            // If the current user is the host, set up automatic host transfer on disconnect
            if (user.name === currentHost) {
                const hostDisconnectRef = onDisconnect(hostRef);
                hostDisconnectRef.set(get(ref(database, `rooms/${roomId}`)).then(snapshot => {
                    if (!snapshot.exists()) return null; // Room was deleted

                    const membersData: Member[] = Object.values(snapshot.val().members || {});
                    const moderators: string[] = snapshot.val().moderators || [];

                    // Filter out the disconnecting host
                    const remainingMembers = membersData.filter(m => m.name !== user.name);
                    
                    if (remainingMembers.length === 0) {
                        // If no one is left, schedule room deletion
                        onDisconnect(ref(database, `rooms/${roomId}`)).remove();
                        return null; // No new host
                    }

                    // Prioritize moderators
                    const potentialModeratorHosts = remainingMembers.filter(m => moderators.includes(m.name));
                    if (potentialModeratorHosts.length > 0) {
                        // Sort by joinedAt to get the oldest moderator
                        potentialModeratorHosts.sort((a, b) => (a.joinedAt as number) - (b.joinedAt as number));
                        return potentialModeratorHosts[0].name;
                    }

                    // If no moderators, pick the oldest member
                    remainingMembers.sort((a, b) => (a.joinedAt as number) - (b.joinedAt as number));
                    return remainingMembers[0].name;
                }));
            }
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

    const handleBeforeUnload = () => {
      // This is a synchronous operation, so we can't reliably use async operations here.
      // The onDisconnect setup should handle the cleanup.
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        isMounted = false;
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Cleanup on component unmount (e.g., navigating away)
        const memberRefOnUnmount = ref(database, `rooms/${roomId}/members/${user.name}`);
        remove(memberRefOnUnmount);

        goOffline(database);
        
        onDisconnect(memberRef).cancel();
        onDisconnect(hostRef).cancel();
        onDisconnect(ref(database, `rooms/${roomId}`)).cancel();
    };
}, [isUserLoaded, user, roomId, router, toast, sendSystemMessage]);

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
