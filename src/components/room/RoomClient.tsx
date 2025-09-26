'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, get } from 'firebase/database';
import useUserSession from '@/hooks/use-user-session';
import Player from './Player';
import Seats, { Seat } from './Seats';
import Chat from './Chat';
import ViewerInfo from './ViewerInfo';
import { User as UserType } from '@/app/providers';
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

  useEffect(() => {
    if (isLoaded && !userName) {
      router.push('/');
    }
  }, [isLoaded, userName, router]);

  useEffect(() => {
    if (!userName || !roomId) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    const hostRef = ref(database, `rooms/${roomId}/host`);
    
    const checkRoomExists = async () => {
      const roomSnapshot = await get(roomRef);
      if (!roomSnapshot.exists()) {
        console.warn('Room does not exist, redirecting to lobby.');
        toast({
          title: 'الغرفة غير موجودة',
          description: 'الرمز الذي أدخلته غير صحيح أو أن الغرفة حُذفت.',
          variant: 'destructive',
        });
        router.push('/lobby');
        return;
      }
      const hostSnapshot = await get(hostRef);
      setIsHost(hostSnapshot.val() === userName);
      setIsLoading(false);
    };

    checkRoomExists();
  }, [userName, roomId, router, toast]);

  useEffect(() => {
    if (!userName || !roomId || isLoading) return;

    const membersRef = ref(database, `rooms/${roomId}/members`);
    const userRef = ref(database, `rooms/${roomId}/members/${userName}`);
    const seatsRef = ref(database, `rooms/${roomId}/seats`);
    const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
    
    set(userRef, { name: userName, joinedAt: serverTimestamp() });
    onDisconnect(userRef).remove();
    
    const onDisconnectCallbacks: Function[] = [];

    const listeners = [
      onValue(membersRef, (snapshot) => {
        const data = snapshot.val();
        setMembers(data ? Object.values(data) : []);
      }),

      onValue(seatsRef, (snapshot) => {
        const currentSeats: Seat[] = snapshot.val() || Array(4).fill(null).map((_, i) => ({ id: i, user: null }));
        setSeats(currentSeats);
        
        onDisconnectCallbacks.forEach(cb => cb());
        onDisconnectCallbacks.length = 0;

        const userSeat = currentSeats.find(s => s?.user?.name === userName);
        if (userSeat) {
          const userSeatRef = ref(database, `rooms/${roomId}/seats/${userSeat.id}`);
          const disconnectCb = onDisconnect(userSeatRef).update({ user: null });
          onDisconnectCallbacks.push(() => disconnectCb.cancel());
        }
      }),

      onValue(videoUrlRef, (snapshot) => {
        setVideoUrl(snapshot.val() || '');
      }),
    ];

    return () => {
      listeners.forEach(unsubscribe => unsubscribe());
      onDisconnectCallbacks.forEach(cb => cb());
    };
  }, [userName, roomId, isLoading]);

  const handleShareRoom = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: 'تم نسخ رمز الغرفة!',
      description: 'يمكنك الآن مشاركته مع أصدقائك.',
    });
  };

  const handleSetVideo = (url: string) => {
    if (isHost && url) {
      const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
      set(videoUrlRef, url);
    }
  };

  const handleTakeSeat = (seatId: number) => {
    if (!userName) return;
    const currentSeat = seats.find(s => s?.user?.name === userName);
    if(currentSeat && currentSeat.id !== seatId) {
        const oldSeatRef = ref(database, `rooms/${roomId}/seats/${currentSeat.id}`);
        set(oldSeatRef, { id: currentSeat.id, user: null });
    }

    const seatRef = ref(database, `rooms/${roomId}/seats/${seatId}`);
    set(seatRef, { id: seatId, user: { name: userName } });
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
            <Link href="/lobby" legacyBehavior>
                <Button variant="outline" size="sm" className="bg-card/50 backdrop-blur-sm">
                    <ArrowLeft className="h-4 w-4 me-2" />
                    العودة إلى الردهة
                </Button>
            </Link>
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
          <Seats seats={seats} onTakeSeat={handleTakeSeat} />
        </div>
        <div className="flex flex-col min-h-0">
          <Chat roomId={roomId} user={user} />
        </div>
      </div>
    </div>
  );
};

export default RoomClient;
