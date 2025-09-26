'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import useUserSession from '@/hooks/use-user-session';
import Player from './Player';
import Seats, { Seat } from './Seats';
import Chat from './Chat';
import ViewerInfo from './ViewerInfo';
import { User as UserType } from '@/app/providers';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Member = { name: string; joinedAt: object };

const RoomClient = ({ roomId }: { roomId: string }) => {
  const router = useRouter();
  const { user, isLoaded } = useUserSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (!user || !roomId) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    const membersRef = ref(database, `rooms/${roomId}/members`);
    const userRef = ref(database, `rooms/${roomId}/members/${user.name}`);
    const seatsRef = ref(database, `rooms/${roomId}/seats`);
    const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
    const hostRef = ref(database, `rooms/${roomId}/host`);

    onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
            // New room, this user is the host
            setIsHost(true);
            set(hostRef, user.name);
            const initialSeats: Seat[] = Array(4).fill(null).map((_, i) => ({ id: i, user: null }));
            set(seatsRef, initialSeats);
            setSeats(initialSeats);
        } else {
             onValue(hostRef, (hostSnapshot) => {
                setIsHost(hostSnapshot.val() === user.name);
            });
        }
    });

    set(userRef, { name: user.name, joinedAt: serverTimestamp() });
    onDisconnect(userRef).remove();
    
    // Also remove user from seat on disconnect
    onValue(seatsRef, (snapshot) => {
        const currentSeats: Seat[] = snapshot.val() || [];
        const userSeat = currentSeats.find(s => s?.user?.name === user.name);
        if(userSeat) {
            const userSeatRef = ref(database, `rooms/${roomId}/seats/${userSeat.id}`);
            onDisconnect(userSeatRef).update({ user: null });
        }
    });


    onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      setMembers(data ? Object.values(data) : []);
    });

    onValue(seatsRef, (snapshot) => {
      setSeats(snapshot.val() || Array(4).fill(null).map((_, i) => ({ id: i, user: null })));
    });

    onValue(videoUrlRef, (snapshot) => {
      setVideoUrl(snapshot.val() || '');
    });

    return () => {
      set(userRef, null);
    };
  }, [user, roomId, router]);

  const handleSetVideo = (url: string) => {
    if (isHost && url) {
      const videoUrlRef = ref(database, `rooms/${roomId}/videoUrl`);
      set(videoUrlRef, url);
    }
  };

  const handleTakeSeat = (seatId: number) => {
    if (!user) return;
    const currentSeat = seats.find(s => s?.user?.name === user.name);
    if(currentSeat && currentSeat.id !== seatId) {
        // User is already seated, remove from old seat first
        const oldSeatRef = ref(database, `rooms/${roomId}/seats/${currentSeat.id}`);
        set(oldSeatRef, { id: currentSeat.id, user: null });
    }

    const seatRef = ref(database, `rooms/${roomId}/seats/${seatId}`);
    set(seatRef, { id: seatId, user: { name: user.name } });
  };


  if (!isLoaded || !user) {
    return <div className="flex h-screen items-center justify-center text-xl">جاري التحميل...</div>;
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden p-2 sm:p-4 gap-4">
       <div className="flex items-center justify-between">
         <Link href="/lobby" legacyBehavior>
            <Button variant="outline" size="sm" className="bg-card/50 backdrop-blur-sm">
                <ArrowLeft className="h-4 w-4 me-2" />
                العودة إلى الردهة
            </Button>
         </Link>
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
