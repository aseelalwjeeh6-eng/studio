'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, PlusCircle, LogIn, Loader2 } from 'lucide-react';
import useUserSession from '@/hooks/use-user-session';
import { useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, set } from 'firebase/database';

export default function LobbyPage() {
  const [roomId, setRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const router = useRouter();
  const { isLoaded, user } = useUserSession();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
  }, [isLoaded, user, router]);

  const handleCreateRoom = async () => {
    if (!user) return;
    setIsCreatingRoom(true);
    const newRoomId = uuidv4();
    try {
      const roomRef = ref(database, `rooms/${newRoomId}`);
      await set(roomRef, {
        host: user.name,
        createdAt: Date.now(),
        videoUrl: '',
        seatedMembers: {},
      });
      router.push(`/rooms/${newRoomId}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      setIsCreatingRoom(false);
    }
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
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-headline font-bold text-foreground">
            ردهة السينما
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            أنشئ غرفة جديدة أو انضم إلى أصدقائك
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-lg border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="text-accent" />
              <span>إنشاء غرفة جديدة</span>
            </CardTitle>
            <CardDescription>
              ابدأ تجربة مشاهدة جديدة مع من تحب.
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
              لديك رمز غرفة؟ أدخله أدناه للانضمام.
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
    </div>
  );
}
