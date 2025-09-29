'use client';

import useUserSession from '@/hooks/use-user-session';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { User as UserIcon, Loader2, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, setUser, isLoaded } = useUserSession();
  const router = useRouter();
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(user?.avatarId);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
    if (user?.avatarId) {
      setSelectedAvatarId(user.avatarId);
    }
  }, [isLoaded, user, router]);

  const handleAvatarSelect = (avatarId: string) => {
    if (!user) return;
    startTransition(() => {
      setSelectedAvatarId(avatarId);
      setUser({ ...user, avatarId });
    });
  };

  const currentAvatar = PlaceHolderImages.find(p => p.id === user?.avatarId) ?? PlaceHolderImages.find(p => p.id === 'avatar1');
  const avatarPlaceholders = PlaceHolderImages.filter(p => p.id.startsWith('avatar'));

  if (!isLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center pt-8 gap-12">
      <Card className="w-full max-w-sm bg-card/50 backdrop-blur-lg border-accent/20 text-center shadow-lg">
        <CardHeader className="flex flex-col items-center">
          <Avatar className="w-32 h-32 border-4 border-accent mb-4">
            <AvatarImage src={currentAvatar?.imageUrl} alt={user.name} data-ai-hint={currentAvatar?.imageHint} />
            <AvatarFallback className="bg-muted">
              <UserIcon className="w-16 h-16" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-4xl font-headline font-bold text-foreground">{user.name}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">"عشاق السينما"</CardDescription>
        </CardHeader>
      </Card>

      <Card className="w-full max-w-4xl bg-card/50 backdrop-blur-lg border-accent/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="text-accent" />
            <span>اختر صورتك الرمزية</span>
          </CardTitle>
          <CardDescription>
            اختر الصورة التي تمثلك. ستظهر هذه الصورة للآخرين في غرف المشاهدة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {avatarPlaceholders.map((avatar) => {
              const isSelected = selectedAvatarId === avatar.id;
              return (
                <div
                  key={avatar.id}
                  className="relative cursor-pointer group"
                  onClick={() => handleAvatarSelect(avatar.id)}
                >
                  <Image
                    src={avatar.imageUrl}
                    alt={avatar.description}
                    width={100}
                    height={100}
                    className={cn(
                      "rounded-full aspect-square object-cover border-4 transition-all",
                      isSelected ? "border-accent ring-4 ring-accent/50" : "border-transparent group-hover:border-accent/50"
                    )}
                    data-ai-hint={avatar.imageHint}
                  />
                  {isPending && selectedAvatarId === avatar.id && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                   {isSelected && !isPending && (
                    <div className="absolute -top-1 -right-1 bg-accent rounded-full p-1 text-accent-foreground">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                   )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
