'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import useUserSession from '@/hooks/use-user-session';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UserPlus, Users, Search, Mail, UserCheck, UserX } from 'lucide-react';
import { searchUsers, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriendRequests, getFriends, removeFriend, AppUser } from '@/lib/firebase-service';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function FriendsPage() {
  const { user, isLoaded } = useUserSession();
  const router = useRouter();
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AppUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [friends, setFriends] = useState<AppUser[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  
  const [requests, setRequests] = useState<AppUser[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
  }, [isLoaded, user, router]);

  const fetchFriendsAndRequests = async () => {
    if (!user) return;
    setIsLoadingFriends(true);
    setIsLoadingRequests(true);
    try {
      const friendsData = await getFriends(user.name);
      setFriends(friendsData);

      const requestsData = await getFriendRequests(user.name);
      setRequests(requestsData);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingFriends(false);
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriendsAndRequests();
    }
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;

    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim(), user.name);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (recipientName: string) => {
    if (!user) return;
    startTransition(async () => {
      try {
        await sendFriendRequest(user.name, recipientName);
        alert(`تم إرسال طلب صداقة إلى ${recipientName}.`);
        setSearchResults(prev => prev.filter(u => u.name !== recipientName));
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  const handleAccept = async (senderName: string) => {
    if (!user) return;
    startTransition(async () => {
      try {
        await acceptFriendRequest(senderName, user.name);
        alert(`أصبحت الآن صديقًا لـ ${senderName}.`);
        fetchFriendsAndRequests(); // Refresh lists
      } catch (error: any) {
        alert(error.message);
      }
    });
  };
  
  const handleReject = async (senderName: string) => {
    if (!user) return;
    startTransition(async () => {
      try {
        await rejectFriendRequest(senderName, user.name);
        alert(`تم رفض طلب الصداقة من ${senderName}.`);
        setRequests(prev => prev.filter(r => r.name !== senderName));
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  const handleRemoveFriend = async (friendName: string) => {
    if (!user) return;
    startTransition(async () => {
        try {
            await removeFriend(user.name, friendName);
            alert(`تم حذف ${friendName} من قائمة أصدقائك.`);
            setFriends(prev => prev.filter(f => f.name !== friendName));
        } catch (error: any) {
            alert(error.message);
        }
    });
};

  if (!isLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
      </div>
    );
  }

  const getAvatar = (user: AppUser) => {
    return PlaceHolderImages.find(p => p.id === user.avatarId) ?? PlaceHolderImages[0];
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
        <div className="space-y-8">
          <Card className="bg-card/50 backdrop-blur-lg border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-accent" />
                <span>قائمة الأصدقاء ({friends.length})</span>
              </CardTitle>
              <CardDescription>الأصدقاء الذين يمكنك دعوتهم للغرف.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFriends ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
              ) : friends.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {friends.map((friend) => (
                    <div key={friend.name} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                       <div className="flex items-center gap-3">
                         <Avatar className="h-10 w-10">
                           <AvatarImage src={getAvatar(friend)?.imageUrl} alt={friend.name} />
                           <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                         </Avatar>
                         <span className="font-semibold">{friend.name}</span>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => handleRemoveFriend(friend.name)} disabled={isPending}>
                           <UserX className="text-destructive h-5 w-5"/>
                       </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4 space-y-3">
                  <p>ليس لديك أصدقاء بعد. ابحث عن أصدقاء لإضافتهم!</p>
                  <Button onClick={() => searchInputRef.current?.focus()}>
                    <Search className="me-2"/>
                    ابحث عن أصدقاء الآن!
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-lg border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="text-accent" />
                <span>طلبات الصداقة الواردة ({requests.length})</span>
              </CardTitle>
              <CardDescription>قبول أو رفض طلبات الصداقة الجديدة.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRequests ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
              ) : requests.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {requests.map((request) => (
                    <div key={request.name} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={getAvatar(request)?.imageUrl} alt={request.name} />
                            <AvatarFallback>{request.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{request.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleAccept(request.name)} disabled={isPending}>
                            <UserCheck className="text-green-500"/>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleReject(request.name)} disabled={isPending}>
                            <UserX className="text-destructive"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p>لا توجد طلبات صداقة جديدة.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <Input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="ابحث بالاسم..." 
                  className="bg-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? <Loader2 className="me-2 animate-spin" /> : <Search className="me-2" />}
                  بحث
                </Button>
              </form>
              <div className="min-h-[100px]">
                {isSearching ? (
                   <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {searchResults.map((foundUser) => (
                       <div key={foundUser.name} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={getAvatar(foundUser)?.imageUrl} alt={foundUser.name} />
                            <AvatarFallback>{foundUser.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{foundUser.name}</span>
                        </div>
                        <Button size="sm" onClick={() => handleSendRequest(foundUser.name)} disabled={isPending}>
                            <UserPlus className="me-2 h-4 w-4"/>
                            إضافة
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <p>أدخل اسم مستخدم للبحث عنه.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
