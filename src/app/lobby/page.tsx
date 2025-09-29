'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, PlusCircle, LogIn, Loader2, Users, DoorOpen } from 'lucide-react';
import useUserSession from '@/hooks/use-user-session';
import { database } from '@/lib/firebase';
import { ref, set, onValue, off, goOnline } from 'firebase/database';
import Hearts from '@/components/shared/Hearts';

interface RoomData {
  id: string;
  host: string;
  memberCount: number;
}

export default function LobbyPage() {
  const [roomId, setRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [activeRooms, setActiveRooms] = useState<RoomData[]>([]);
  const router = useRouter();
  const { isLoaded, user } = useUserSession();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
    if (isLoaded && user) {
      // Connect to Firebase presence system when user is loaded
      goOnline(database);
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    const roomsRef = ref(database, 'rooms');
    const listener = onValue(roomsRef, (snapshot) => {
      const roomsData = snapshot.val();
      if (roomsData) {
        const loadedRooms = Object.keys(roomsData)
          .map(key => {
            const room = roomsData[key];
            const memberCount = room.members ? Object.keys(room.members).length : 0;
            return {
              id: key,
              host: room.host,
              memberCount: memberCount,
            };
          })
          .filter(room => room.memberCount > 0); // Only show rooms with members
        setActiveRooms(loadedRooms);
      } else {
        setActiveRooms([]);
      }
    });

    // Cleanup listener on component unmount
    return () => off(roomsRef, 'value', listener);
  }, []);

  const handleCreateRoom = () => {
    if (!user || isCreatingRoom) return;
    setIsCreatingRoom(true);
    const newRoomId = uuidv4();
    
    // Optimistic update: navigate immediately
    router.push(`/rooms/${newRoomId}`);

    // Create room in the background
    const roomRef = ref(database, `rooms/${newRoomId}`);
    set(roomRef, {
      host: user.name,
      createdAt: Date.now(),
      videoUrl: '',
      seatedMembers: {},
      members: {},
    }).catch(error => {
      console.error("Failed to create room in background:", error);
      // If creation fails, the user is already in the room page,
      // which will handle the "room not found" case.
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/rooms/${roomId.trim()}`);
    }
  };
  
  if (!isLoaded || !user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-accent" />
        </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-12 min-h-[calc(100vh-80px)]">
      <Hearts />
      <div className="w-full max-w-4xl space-y-8 z-10">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-headline font-bold text-foreground drop-shadow-lg">
            ردهة السينما
          </h1>
          <p className="mt-4 text-lg text-muted-foreground drop-shadow-md">
            أنشئ غرفة مشاهدة خاصة أو انضم إلى أصدقائك.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-8">
                <Card className="bg-card/50 backdrop-blur-lg border-accent/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        <PlusCircle className="text-accent" />
                        <span>إنشاء غرفة جديدة</span>
                        </CardTitle>
                        <CardDescription>
                        ابدأ تجربة مشاهدة جديدة واحصل على رمز لمشاركته.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleCreateRoom} className="w-full h-12 text-lg bg-accent text-accent-foreground hover:bg-accent/90" disabled={isCreatingRoom}>
                        {isCreatingRoom ? (
                            <Loader2 className="me-2 h-5 w-5 animate-spin" />
                        ) : (
                            <Film className="me-2 h-5 w-5" />
                        )}
                        {isCreatingRoom ? 'جاري الإنشاء...' : 'إنشاء وعرض'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-lg border-accent/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        <LogIn className="text-accent" />
                        <span>الانضمام إلى غرفة</span>
                        </CardTitle>
                        <CardDescription>
                        لديك رمز غرفة؟ أدخله أدناه للانضمام فورًا.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleJoinRoom} className="flex flex-col sm:flex-row gap-4">
                        <Input
                            type="text"
                            placeholder="أدخل رمز الغرفة..."
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="h-12 text-center text-lg bg-input/70 border-accent/30 focus:ring-accent flex-grow"
                            required
                        />
                        <Button type="submit" className="h-12 text-lg">
                            <LogIn className="me-2 h-5 w-5" />
                            دخول
                        </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <div>
                 <Card className="bg-card/50 backdrop-blur-lg border-accent/20 h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DoorOpen className="text-accent" />
                            <span>الغرف المتاحة</span>
                        </CardTitle>
                        <CardDescription>
                            انضم إلى الأصدقاء في إحدى الغرف النشطة حاليًا.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeRooms.length > 0 ? (
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                {activeRooms.map(room => (
                                    <div key={room.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                                        <div>
                                            <p className="font-bold text-foreground">غرفة {room.host}</p>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                {room.memberCount} {room.memberCount > 1 ? 'أعضاء' : 'عضو'}
                                            </p>
                                        </div>
                                        <Button size="sm" onClick={() => router.push(`/rooms/${room.id}`)}>
                                            <LogIn className="me-2 h-4 w-4" />
                                            دخول
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <p>لا توجد غرف نشطة حاليًا.</p>
                                <p>كن أول من ينشئ غرفة ويدعو أصدقائه!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
