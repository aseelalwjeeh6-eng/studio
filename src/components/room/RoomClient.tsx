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
    const userRef = ref(database, `rooms/${roomId}/members/${name}`);
    set(userRef, { name, joinedAt: serverTimestamp() });
    onDisconnect(userRef).remove();
  }, [roomId]);

  const handleSeatDisconnect = useCallback((seatId: number) => {
    const seatRef = ref(database, `rooms/${roomId}/seats/${seatId}`);
    onDisconnect(seatRef).update({ user: null });
  }, [roomId]);

  useEffect(() => {
    if (isLoaded && !userName) {
      router.push('/');
    }
  }, [isLoaded, userName, router]);

  useEffect(() => {
    if (!userName || !roomId) return;

    setIsLoading(true);
    const roomRef = ref(database, `rooms/${roomId}`);

    const checkRoomAndSetup = async () => {
      try {
        const roomSnapshot = await get(roomRef);
        if (!roomSnapshot.exists()) {
          toast({
            title: 'الغرفة غير موجودة',
            description: 'الرمز الذي أدخلته غير صحيح أو أن الغرفة حُذفت.',
            variant: 'destructive',
          });
          router.push('/lobby');
          return;
        }

        const hostName = roomSnapshot.val().host;
        setIsHost(hostName === userName);
        
        // Setup presence and listeners
        goOnline(database);
        setupPresence(userName);

        const membersRef = ref(database, `rooms/${roomId}/members`);
        const seatsRef = ref(database, `rooms/${roomId}/seats`);
        const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);

        const unsubscribers = [
          onValue(membersRef, (snapshot) => setMembers(snapshot.val() ? Object.values(snapshot.val()) : [])),
          onValue(seatsRef, (snapshot) => setSeats(snapshot.val() || [])),
          onValue(videoUrlRef, (snapshot) => setVideoUrl(snapshot.val() || '')),
        ];

        setIsLoading(false);

        return () => {
          unsubscribers.forEach(unsub => unsub());
          const userRef = ref(database, `rooms/${roomId}/members/${userName}`);
          const userSeat = seats.find(s => s?.user?.name === userName);
          if (userSeat) {
            const seatRef = ref(database, `rooms/${roomId}/seats/${userSeat.id}`);
            set(seatRef, { id: userSeat.id, user: null });
          }
          set(userRef, null);
          goOffline(database);
        };
      } catch (error) {
        console.error("Error setting up room:", error);
        toast({ title: 'حدث خطأ', description: 'لم نتمكن من تحميل الغرفة. حاول مرة أخرى.', variant: 'destructive' });
        router.push('/lobby');
      }
    };

    const cleanupPromise = checkRoomAndSetup();

    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };

  }, [userName, roomId, router, toast, setupPresence]);


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
  
    const currentSeatIndex = seats.findIndex(s => s?.user?.name === userName);
    
    // Clear old seat first if it exists and is different
    if (currentSeatIndex !== -1 && seats[currentSeatIndex].id !== seatId) {
      const oldSeatRef = ref(database, `rooms/${roomId}/seats/${seats[currentSeatIndex].id}`);
      await set(oldSeatRef, { id: seats[currentSeatIndex].id, user: null });
      onDisconnect(oldSeatRef).cancel(); // Cancel previous onDisconnect
    }
  
    // Take new seat
    const newSeatRef = ref(database, `rooms/${roomId}/seats/${seatId}`);
    await set(newSeatRef, { id: seatId, user: { name: userName } });
    handleSeatDisconnect(seatId); // Setup new onDisconnect
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
