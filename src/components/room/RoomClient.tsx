'use client';

import { useEffect, useState, useMemo, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, get, goOnline, goOffline, runTransaction, update, off } from 'firebase/database';
import useUserSession from '@/hooks/use-user-session';
import Player from './Player';
import Chat from './Chat';
import ViewerInfo from './ViewerInfo';
import { Button } from '../ui/button';
import { Loader2, MoreVertical, Search, History, X, Youtube, LogOut, Video, Film, Users, Send, ListPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioConference, useLiveKitRoom, useLocalParticipant } from '@livekit/components-react';
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
import Playlist, { PlaylistItem } from './Playlist';


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

const RoomClient = ({ roomId, videoMode = false }: { roomId: string, videoMode?: boolean }) => {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUserSession();
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [seatedMembers, setSeatedMembers] = useState<SeatedMember[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [hostName, setHostName] = useState('');
  const [moderators, setModerators] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState('');
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [friends, setFriends] = useState<AppUser[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  
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
    if (isUserLoaded && !user) {
      router.push('/');
      return;
    }
    if (!isUserLoaded) {
      return;
    }

    const roomRef = ref(database, `rooms/${roomId}`);

    const setupRoom = async () => {
      // 1. Pre-check room existence and authorization
      const snapshot = await get(roomRef);
      if (!snapshot.exists()) {
        toast({ title: 'الغرفة غير موجودة', description: 'تمت إعادة توجيهك إلى الردهة.', variant: 'destructive' });
        router.push('/lobby');
        return;
      }
      
      const roomData = snapshot.val();

      // If checks pass, proceed to set up the room
      setHostName(roomData.host);
      setIsLoading(false); // Stop loading, now we can render the room

      try {
        await goOnline(database);
        const userRef = ref(database, `rooms/${roomId}/members/${user!.name}`);
        const memberData = { name: user!.name, avatarId: user!.avatarId, joinedAt: serverTimestamp() };
        await set(userRef, memberData);
        onDisconnect(userRef).remove();
        
        const userSeat = seatedMembers.find(m => m.name === user!.name);
        if(userSeat) {
            const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${userSeat.seatId}`);
            onDisconnect(seatRef).remove();
        }

        const tokenResp = await fetch(`/api/livekit?room=${roomId}&username=${user!.name}`);
        const tokenData = await tokenResp.json();
        setToken(tokenData.token);
      } catch (e) {
        console.error("Failed to setup room or fetch LiveKit token", e);
        toast({ title: 'خطأ في الاتصال', description: 'فشل الاتصال بالغرفة.', variant: 'destructive' });
        router.push('/lobby');
      }
    };

    setupRoom();

    const membersRef = ref(database, `rooms/${roomId}/members`);
    const seatedMembersRef = ref(database, `rooms/${roomId}/seatedMembers`);
    const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
    const playerStateRef = ref(database, `rooms/${roomId}/playerState`);
    const hostRef = ref(database, `rooms/${roomId}/host`);
    const moderatorsRef = ref(database, `rooms/${roomId}/moderators`);
    const playlistRef = ref(database, `rooms/${roomId}/playlist`);
    
    const onMembersValue = onValue(membersRef, (snapshot) => setAllMembers(snapshot.exists() ? Object.values(snapshot.val()) : []));
    const onSeatedMembersValue = onValue(seatedMembersRef, (snapshot) => {
        const seatedData = snapshot.val();
        const seatedArray = seatedData ? Object.values(seatedData) : [];
        setSeatedMembers(seatedArray as SeatedMember[]);
    });
    const onVideoUrlValue = onValue(videoUrlRef, (snapshot) => setVideoUrl(snapshot.val() || ''));
    const onPlayerStateValue = onValue(playerStateRef, (snapshot) => setPlayerState(snapshot.val()));
    const onHostValue = onValue(hostRef, (snapshot) => setHostName(snapshot.val() || ''));
    const onModeratorsValue = onValue(moderatorsRef, (snapshot) => setModerators(snapshot.val() || []));
    const onPlaylistValue = onValue(playlistRef, (snapshot) => setPlaylist(snapshot.val() ? Object.values(snapshot.val()) : []));

    return () => {
      off(membersRef, 'value', onMembersValue);
      off(seatedMembersRef, 'value', onSeatedMembersValue);
      off(videoUrlRef, 'value', onVideoUrlValue);
      off(playerStateRef, 'value', onPlayerStateValue);
      off(hostRef, 'value', onHostValue);
      off(moderatorsRef, 'value', onModeratorsValue);
      off(playlistRef, 'value', onPlaylistValue);
      
      if (user) {
        const memberRef = ref(database, `rooms/${roomId}/members/${user.name}`);
        const userSeat = seatedMembers.find(m => m.name === user.name);
        if (userSeat) {
            const seatRef = ref(database, `rooms/${roomId}/seatedMembers/${userSeat.seatId}`);
            set(seatRef, null);
        }
        set(memberRef, null);
      }
      goOffline(database);
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
    // When avatar changes, update RTDB
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
          if (error instanceof Error && error.message.includes('YOUTUBE_API_KEY is not set')) {
              setSearchError("مفتاح واجهة برمجة تطبيقات YouTube غير مهيأ. يرجى إضافته إلى ملف .env للمتابعة.");
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
  
  const handleAddToPlaylist = (video: YouTubeVideo) => {
    if (!canControl) return;
    const newPlaylistItem: PlaylistItem = {
      id: video.id.videoId,
      videoId: video.id.videoId,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.medium.url,
    };

    const playlistRef = ref(database, `rooms/${roomId}/playlist`);
    const newPlaylist = [...playlist, newPlaylistItem];
    set(playlistRef, newPlaylist);
    
    // If nothing is playing, start playing the new video
    if (!videoUrl) {
      onSetVideo(`https://www.youtube.com/watch?v=${video.id.videoId}`);
    }

    toast({ title: "أضيف إلى الطابور", description: video.snippet.title });
  };


  const handleHistoryClick = (query: string) => {
      setSearchQuery(query);
      performSearch(query);
  };

  const onSetVideo = useCallback((url: string) => {
    if (canControl) {
      const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
      set(videoUrlRef, url);
      // Reset player state for new video
      const playerStateRef = ref(database, `rooms/${roomId}/playerState`);
      set(playerStateRef, { isPlaying: true, seekTime: 0, timestamp: serverTimestamp() });
    }
  }, [canControl, roomId]);
  
  const handlePlayerStateChange = (newState: Partial<PlayerState>) => {
    if (canControl) {
      const playerStateRef = ref(database, `rooms/${roomId}/playerState`);
      runTransaction(playerStateRef, (currentState) => {
        return { ...currentState, ...newState, timestamp: serverTimestamp() };
      });
    }
  };

  const handleVideoEnded = () => {
    if (!canControl) return;
  
    const currentVideoId = videoUrl.includes('v=') ? new URL(videoUrl).searchParams.get('v') : null;
  
    const currentVideoIndex = playlist.findIndex(item => item.videoId === currentVideoId);
    const isLastVideo = currentVideoIndex === playlist.length - 1;
  
    // Remove the video that just ended from the playlist
    const playlistRef = ref(database, `rooms/${roomId}/playlist`);
    const newPlaylist = playlist.filter(item => item.videoId !== currentVideoId);
    set(playlistRef, newPlaylist.length > 0 ? newPlaylist : null);
  
    if (newPlaylist.length > 0 && !isLastVideo) {
      // Find the next video to play, which is now at the same index
      const nextVideo = newPlaylist[currentVideoIndex];
      if (nextVideo) {
        onSetVideo(`https://www.youtube.com/watch?v=${nextVideo.videoId}`);
      }
    } else {
      // If it was the last video or playlist is now empty, clear the player
      onSetVideo('');
    }
  };
  
  const handlePlayPlaylistItem = (videoId: string) => {
    if (!canControl) return;
    onSetVideo(`https://www.youtube.com/watch?v=${videoId}`);
  };

  const handleRemovePlaylistItem = (videoId: string) => {
      if (!canControl) return;
      const playlistRef = ref(database, `rooms/${roomId}/playlist`);
      const newPlaylist = playlist.filter(item => item.videoId !== videoId);
      set(playlistRef, newPlaylist);
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


  if (isLoading || !isUserLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
      user={user}
      isSeated={isSeated}
      videoMode={videoMode}
    >
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
                            <div className="grid grid-cols-2 gap-4">
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
                                <Playlist
                                    items={playlist}
                                    canControl={canControl}
                                    onPlay={handlePlayPlaylistItem}
                                    onRemove={handleRemovePlaylistItem}
                                    currentVideoUrl={videoUrl}
                                />
                            </div>
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
                    {!isSearching && !searchError && searchResults.length === 0 && searchHistory.length > 0 && (
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground"><History/> سجل البحث</h2>
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
                        </div>
                    )}
                     {!isSearching && !searchError && searchResults.length === 0 && searchHistory.length === 0 && (
                         <div className="p-6 text-center text-muted-foreground">
                            <p>لا يوجد سجل بحث حتى الآن. ابدأ البحث للعثور على مقاطع الفيديو المفضلة لديك.</p>
                        </div>
                    )}
                    {searchResults.length > 0 && (
                        <div className="max-w-4xl mx-auto p-4">
                            <div className="flex flex-col gap-4">
                                {searchResults.map((video) => (
                                    <div
                                    key={video.id.videoId}
                                    className="flex items-center gap-4 p-3 rounded-lg bg-card/50"
                                    >
                                    <Image
                                        src={video.snippet.thumbnails.default.url}
                                        alt={video.snippet.title}
                                        width={120}
                                        height={68}
                                        className="rounded-lg aspect-video object-cover"
                                    />
                                    <div className="flex-grow">
                                        <h3 className="text-md font-semibold text-foreground line-clamp-2">{video.snippet.title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-1">{video.snippet.description}</p> 
                                    </div>
                                    <div className="flex flex-col gap-2">
                                         <Button size="sm" variant="secondary" onClick={() => onSetVideo(`https://www.youtube.com/watch?v=${video.id.videoId}`)}>
                                            <Play className="me-2 h-4 w-4" />
                                            تشغيل الآن
                                        </Button>
                                        <Button size="sm" onClick={() => handleAddToPlaylist(video)}>
                                            <ListPlus className="me-2 h-4 w-4" />
                                            إضافة للطابور
                                        </Button>
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
