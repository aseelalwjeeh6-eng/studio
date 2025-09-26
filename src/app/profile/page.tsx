'use client';

import useUserSession from '@/hooks/use-user-session';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { User as UserIcon, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoaded } = useUserSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
  }, [isLoaded, user, router]);

  const avatarImage = PlaceHolderImages.find(p => p.id === 'avatar1');

  if (!isLoaded || !user) {
     return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-accent" />
        </div>
    );
  }

  return (
    <div className="flex justify-center items-start pt-16">
      <Card className="w-full max-w-sm bg-card/50 backdrop-blur-lg border-accent/20 text-center shadow-lg">
        <CardHeader className="flex flex-col items-center">
          <Avatar className="w-32 h-32 border-4 border-accent mb-4">
            <AvatarImage src={avatarImage?.imageUrl} alt={user.name} data-ai-hint={avatarImage?.imageHint} />
            <AvatarFallback className="bg-muted">
              <UserIcon className="w-16 h-16" />
            </AvatarFallback>
          </Avatar>
          <h1 className="text-4xl font-headline font-bold text-foreground">{user.name}</h1>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground">"عشاق السينما"</p>
        </CardContent>
      </Card>
    </div>
  );
}
