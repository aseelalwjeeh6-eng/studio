'use client';

import useUserSession from '@/hooks/use-user-session';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages, ImagePlaceholder } from '@/lib/placeholder-images';
import { User as UserIcon, Loader2, CheckCircle, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { upsertUser, getUserData } from '@/lib/firebase-service';
import { generateAvatar } from '@/ai/flows/generate-avatar-flow';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppUser } from '@/lib/firebase-service';

export default function ProfilePage() {
  const { user, setUser, isLoaded } = useUserSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(user?.avatarId);
  const [isPending, startTransition] = useTransition();

  const [generatedAvatars, setGeneratedAvatars] = useState<ImagePlaceholder[]>([]);
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);


  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
      return;
    }
    if (user) {
      setSelectedAvatarId(user.avatarId);
      // Fetch full user data to get generated avatars
      getUserData(user.name).then(fullUser => {
        if (fullUser?.generatedAvatars) {
          setGeneratedAvatars(fullUser.generatedAvatars);
        }
      });
    }
  }, [isLoaded, user, router]);

  const handleAvatarSelect = (avatarId: string) => {
    if (!user) return;
    startTransition(async () => {
      setSelectedAvatarId(avatarId);
      const updatedUser = { ...user, avatarId };
      setUser(updatedUser);
      await upsertUser(updatedUser);
    });
  };

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim() || !user) return;
    setIsGenerating(true);
    try {
        const { imageUrl } = await generateAvatar({ prompt: avatarPrompt });
        const newAvatar: ImagePlaceholder = {
            id: `gen-${Date.now()}`,
            description: avatarPrompt,
            imageUrl: imageUrl,
            imageHint: 'generated avatar'
        };

        // Update local state immediately for responsiveness
        setGeneratedAvatars(prev => [newAvatar, ...prev]);
        setSelectedAvatarId(newAvatar.id);
        
        // Update user session context
        const updatedUser = { ...user, avatarId: newAvatar.id };
        setUser(updatedUser);
        
        // Persist changes to Firebase
        await upsertUser({ name: user.name, avatarId: newAvatar.id, newAvatar: newAvatar });
        
        setAvatarPrompt('');
        toast({ title: "تم إنشاء الصورة الرمزية!", description: "تم تحديد صورتك الرمزية الجديدة." });

    } catch (error) {
        console.error("Avatar generation failed:", error);
        toast({ title: "فشل إنشاء الصورة", description: "حدث خطأ أثناء محاولة إنشاء صورتك الرمزية. يرجى المحاولة مرة أخرى.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };


  const currentAvatar = [...generatedAvatars, ...PlaceHolderImages].find(p => p.id === user?.avatarId) ?? PlaceHolderImages.find(p => p.id === 'avatar1');
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
            <Sparkles className="text-accent" />
            <span>اصنع صورتك الرمزية بالذكاء الاصطناعي</span>
          </CardTitle>
          <CardDescription>
            اكتب وصفًا للصورة التي تتخيلها، ودع الذكاء الاصطناعي يصنعها لك.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="مثال: رجل فضاء يرتدي خوذة زهرية..."
                    value={avatarPrompt}
                    onChange={(e) => setAvatarPrompt(e.target.value)}
                    disabled={isGenerating}
                    className="bg-input"
                />
                <Button onClick={handleGenerateAvatar} disabled={isGenerating || !avatarPrompt.trim()}>
                    {isGenerating ? <Loader2 className="me-2 animate-spin" /> : <Wand2 className="me-2" />}
                    إنشاء
                </Button>
            </div>
        </CardContent>
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
             {[...generatedAvatars, ...avatarPlaceholders].map((avatar) => {
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
