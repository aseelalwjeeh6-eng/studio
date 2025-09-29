'use client';

import { useState, useEffect } from 'react';
import useUserSession from '@/hooks/use-user-session';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UserPlus, Users, Search, Mail, UserCheck, UserX } from 'lucide-react';

// Mock data - replace with Firebase data later
const mockFriends = [
  { name: 'soso', avatarId: 'avatar2' },
  { name: 'Aseel', avatarId: 'avatar1' },
];

const mockRequests = [
  { name: 'Misk', avatarId: 'avatar3' },
];

export default function FriendsPage() {
  const { user, isLoaded } = useUserSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-foreground drop-shadow-lg">
          الأصدقاء
        </h1>
        <p className="mt-4 text-lg text-muted-foreground drop-shadow-md">
          إدارة الأصدقاء، طلبات الصداقة، والبحث عن مستخدمين جدد.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column: Friends and Requests */}
        <div className="space-y-8">
          <Card className="bg-card/50 backdrop-blur-lg border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-accent" />
                <span>قائمة الأصدقاء</span>
              </CardTitle>
              <CardDescription>الأصدقاء الذين يمكنك دعوتهم للغرف.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for friends list */}
              <div className="text-center text-muted-foreground py-4">
                <p>سيتم عرض قائمة الأصدقاء هنا قريبًا.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-lg border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="text-accent" />
                <span>طلبات الصداقة الواردة</span>
              </CardTitle>
              <CardDescription>قبول أو رفض طلبات الصداقة الجديدة.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for friend requests */}
              <div className="text-center text-muted-foreground py-4">
                <p>سيتم عرض طلبات الصداقة هنا قريبًا.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Search */}
        <div className="space-y-8">
          <Card className="bg-card/50 backdrop-blur-lg border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="text-accent" />
                <span>البحث عن مستخدمين</span>
              </CardTitle>
              <CardDescription>ابحث عن أصدقاء جدد لإضافتهم.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input type="text" placeholder="ابحث بالاسم..." className="bg-input"/>
                <Button>
                  <Search className="me-2" />
                  بحث
                </Button>
              </div>
               {/* Placeholder for search results */}
               <div className="text-center text-muted-foreground py-4">
                <p>سيتم عرض نتائج البحث هنا قريبًا.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
