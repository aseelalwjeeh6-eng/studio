'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SosoIcon } from '@/components/icons/SosoIcon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useUserSession from '@/hooks/use-user-session';
import { Loader2, CheckCircle } from 'lucide-react';
import { upsertUser } from '@/lib/firebase-service';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('avatar1');
  const { user, setUser, isLoaded } = useUserSession();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const avatarPlaceholders = PlaceHolderImages.filter(p => p.id.startsWith('avatar')).slice(0, 6);


  useEffect(() => {
    if (isLoaded && user?.name) {
      router.push('/lobby');
    }
  }, [isLoaded, user, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isLoggingIn) {
      setIsLoggingIn(true);
      const newUser = { name: name.trim(), avatarId: selectedAvatarId };
      // Do not await this. Let it run in the background.
      upsertUser(newUser); 
      setUser(newUser);
      router.push('/lobby');
    }
  };

  if (!isLoaded || user?.name) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg bg-card/50 backdrop-blur-lg border-accent/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <SosoIcon className="h-20 w-20 text-accent" />
          </div>
          <CardTitle className="font-headline text-4xl text-foreground">اصيل سينما</CardTitle>
          <CardDescription className="text-muted-foreground text-lg">
            مكان خاص للعشاق
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Input
                id="name"
                type="text"
                placeholder="ادخل اسمك..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 text-center text-lg bg-input/70 border-accent/30 focus:ring-accent"
                aria-label="ادخل اسمك"
              />
            </div>

            <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">اختر صورتك الرمزية</p>
                <div className="flex justify-center gap-3 sm:gap-4">
                    {avatarPlaceholders.map((avatar) => {
                        const isSelected = selectedAvatarId === avatar.id;
                        return (
                             <div
                                key={avatar.id}
                                className="relative cursor-pointer group"
                                onClick={() => setSelectedAvatarId(avatar.id)}
                            >
                                <Image
                                    src={avatar.imageUrl}
                                    alt={avatar.description}
                                    width={64}
                                    height={64}
                                    className={cn(
                                        "rounded-full aspect-square object-cover border-4 transition-all duration-200",
                                        isSelected ? "border-accent ring-2 ring-accent/50" : "border-transparent group-hover:border-accent/50 scale-95 group-hover:scale-100"
                                    )}
                                    data-ai-hint={avatar.imageHint}
                                />
                                {isSelected && (
                                    <div className="absolute -top-1 -right-1 bg-accent rounded-full p-0.5 text-accent-foreground">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoggingIn || !name.trim()}>
              {isLoggingIn ? <Loader2 className="animate-spin" /> : 'دخول'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
