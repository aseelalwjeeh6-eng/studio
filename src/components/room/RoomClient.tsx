'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, get, goOnline, goOffline } from 'firebase/database';
import useUserSession from '@/hooks/use-user-session';
import Player from './Player';
import Seats, { Seat } from './Seats';
import Chat from './Chat';
import ViewerInfo from './ViewerInfo';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

type Member = { name: string; joinedAt: object };

const RoomClient = ({ roomId }: { roomId: string }) => {
  const router = useRouter();
  const { user, isLoaded } = useUserSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
  
  const handleSeatDisconnect = useCallback((seatId: number) => {
    const seatRef = ref(database, `rooms/${roomId}/seats/${seatId}`);
    const onDisconnectSeatRef = onDisconnect(seatRef);
    onDisconnectSeatRef.update({ user: null });
    return onDisconnectSeatRef;
  }, [roomId]);

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
    let disconnectSeat: ReturnType<typeof onDisconnect> | null = null;

    const roomRef = ref(database, `rooms/${roomId}`);
    const membersRef = ref(database, `rooms/${roomId}/members`);
    const seatsRef = ref(database, `rooms/${roomId}/seats`);
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

      const userSeat = (snapshot.val().seats || []).find((s: Seat | null) => s?.user?.name === userName);
      if (userSeat) {
        disconnectSeat = handleSeatDisconnect(userSeat.id);
      }

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

    const onSeatsValue = onValue(seatsRef, (snapshot) => {
      setSeats(snapshot.val() || []);
    });

    const onVideoUrlValue = onValue(videoUrlRef, (snapshot) => {
        setVideoUrl(snapshot.val() || '');
    });

    return () => {
      onValue(membersRef, () => {});
      onValue(seatsRef, () => {});
      onValue(videoUrlRef, () => {});
      
      if (disconnectPresence) {
          disconnectPresence.cancel();
      }
      if (disconnectSeat) {
          disconnectSeat.cancel();
      }
      
      const userRef = ref(database, `rooms/${roomId}/members/${userName}`);
      get(userRef).then(snapshot => {
          if (snapshot.exists()) {
              set(userRef, null);
          }
      });
      
      get(seatsRef).then(seatsSnapshot => {
        const currentSeats: (Seat | null)[] = seatsSnapshot.val() || [];
        const userSeat = currentSeats.find(s => s?.user?.name === userName);
        if (userSeat) {
          const seatRef = ref(database, `rooms/${roomId}/seats/${userSeat.id}`);
          set(seatRef, {id: userSeat.id, user: null});
        }
      });
      
      goOffline(database);
    };
  }, [isLoaded, userName, roomId, router, toast, setupPresence, handleSeatDisconnect]);


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

  const handleTakeSeat = async (seatId: number) => {
    if (!userName) return;
    
    const currentSeatsSnapshot = await get(ref(database, `rooms/${roomId}/seats`));
    const currentSeats: (Seat | null)[] = currentSeatsSnapshot.val() || [];
  
    const oldSeatIndex = currentSeats.findIndex(s => s?.user?.name === userName);
    const newSeatIsTaken = currentSeats[seatId]?.user !== null;
  
    if (newSeatIsTaken) {
      toast({ title: "المقعد محجوز", description: "هذا المقعد занято кем-то другим.", variant: "destructive" });
      return;
    }
  
    if (oldSeatIndex !== -1) {
      const oldSeatRef = ref(database, `rooms/${roomId}/seats/${oldSeatIndex}`);
      onDisconnect(oldSeatRef).cancel();
      await set(oldSeatRef, { ...currentSeats[oldSeatIndex], user: null });
    }
  
    const newSeatRef = ref(database, `rooms/${roomId}/seats/${seatId}`);
    await set(newSeatRef, { id: seatId, user: { name: userName } });
    handleSeatDisconnect(seatId);
  };

  if (!isLoaded || !user || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  return (
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
        <div className="lg:col-span-2 flex flex-col gap-2">
          <Player videoUrl={videoUrl} onSetVideo={handleSetVideo} isHost={isHost} />
          <Seats seats={seats} onTakeSeat={handleTakeSeat} />
        </div>
        <div className="lg:col-span-1 flex flex-col min-h-0">
          <Chat roomId={roomId} user={user} />
        </div>
      </div>
    </div>
  );
};

export default RoomClient;
