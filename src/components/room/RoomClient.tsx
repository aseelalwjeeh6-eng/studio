'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, get, goOnline, goOffline } from 'firebase/database';
import useUserSession from '@/hooks/use-user-session';
import Player from './Player';
import Chat from './Chat';
import ViewerInfo from './ViewerInfo';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AudioConference, LiveKitRoom, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import Seats from './Seats';

export type Member = { 
  name: string;
  joinedAt: object;
  // We will add audio state here later
  isMuted?: boolean;
  isSpeaking?: boolean;
};

const RoomClient = ({ roomId }: { roomId: string }) => {
  const router = useRouter();
  const { user, isLoaded } = useUserSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState('');

  const { toast } = useToast();

  const userName = useMemo(() => user?.name, [user]);

  const setupPresence = useCallback((name: string) => {
    goOnline(database);
    const userRef = ref(database, `rooms/${roomId}/members/${name}`);
    const onDisconnectUserRef = onDisconnect(userRef);
    onDisconnectUserRef.remove();
    set(userRef, { name, joinedAt: serverTimestamp() });
    return onDisconnectUserRef;
  }, [roomId]);
  
  useEffect(() => {
    if (!roomId || !userName) return;
    
    (async () => {
      try {
        const resp = await fetch(
          `/api/livekit?room=${roomId}&username=${userName}`
        );
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

    if (!userName) {
      return;
    }

    setIsLoading(true);
    let disconnectPresence: ReturnType<typeof onDisconnect> | null = null;
    
    const roomRef = ref(database, `rooms/${roomId}`);
    const membersRef = ref(database, `rooms/${roomId}/members`);
    const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
    
    get(roomRef).then((snapshot) => {
      if (!snapshot.exists()) {
        toast({
          title: 'الغرفة غير موجودة',
          description: 'الرمز الذي أدخلته غير صحيح أو أن الغرفة حُذفت.',
          variant: 'destructive',
        });
        router.push('/lobby');
        return;
      }
      
      const hostName = snapshot.val().host;
      setIsHost(hostName === userName);
      
      disconnectPresence = setupPresence(userName);
      
      setIsLoading(false);
    }).catch(error => {
      console.error("Failed to fetch room", error);
      toast({
          title: 'حدث خطأ',
          description: 'لم نتمكن من تحميل الغرفة. حاول مرة أخرى.',
          variant: 'destructive',
      });
      router.push('/lobby');
    });

    const onMembersValue = onValue(membersRef, (snapshot) => {
        const data = snapshot.val();
        setMembers(data ? Object.values(data) : []);
    });

    const onVideoUrlValue = onValue(videoUrlRef, (snapshot) => {
        setVideoUrl(snapshot.val() || '');
    });

    return () => {
      onValue(membersRef, () => {});
      onValue(videoUrlRef, () => {});
      
      if (disconnectPresence) {
          disconnectPresence.cancel();
      }
      
      const userRef = ref(database, `rooms/${roomId}/members/${userName}`);
      get(userRef).then(snapshot => {
          if (snapshot.exists()) {
              set(userRef, null);
          }
      });
      goOffline(database);
    };
  }, [isLoaded, userName, roomId, router, toast, setupPresence]);


  const handleShareRoom = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'تم نسخ رابط الغرفة!',
      description: 'يمكنك الآن مشاركته مع أصدقائك.',
    });
  };

  const handleSetVideo = (url: string) => {
    if (isHost && url) {
      const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
      set(videoUrlRef, url);
    }
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
      audio={true}
      video={false} // We don't need video, just audio
      connect={true}
      data-lk-theme="default"
    >
      <div className="h-screen w-full flex flex-col bg-background overflow-hidden p-2 sm:p-4 gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="bg-card/50 backdrop-blur-sm">
                  <Link href="/lobby">
                      <ArrowLeft className="h-4 w-4 me-2" />
                      العودة إلى الردهة
                  </Link>
              </Button>
              <Button variant="outline" size="sm" className="bg-card/50 backdrop-blur-sm" onClick={handleShareRoom}>
                  <Share2 className="h-4 w-4 me-2" />
                  مشاركة الغرفة
              </Button>
          </div>
          <ViewerInfo members={members} />
        </div>
        
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          <div className="lg:col-span-2 flex flex-col gap-4">
              <Player videoUrl={videoUrl} onSetVideo={handleSetVideo} isHost={isHost} />
              <Seats members={members} />
              {/* This component is hidden, it just handles the audio */}
              <div className="hidden">
                  <AudioConference />
              </div>
          </div>
          <div className="lg:col-span-1 flex flex-col min-h-0 h-full">
            <Chat roomId={roomId} user={user} />
          </div>
        </div>
      </div>
    </LiveKitRoom>
  );
};

export default RoomClient;
