'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SosoIcon } from '@/components/icons/SosoIcon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useUserSession from '@/hooks/use-user-session';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [name, setName] = useState('');
  const { user, setUser, isLoaded } = useUserSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user?.name) {
      router.push('/lobby');
    }
  }, [isLoaded, user, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setUser({ name: name.trim() });
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
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-lg border-accent/20">
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
            <Button type="submit" className="w-full h-12 text-lg bg-accent text-accent-foreground hover:bg-accent/90">
              دخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
