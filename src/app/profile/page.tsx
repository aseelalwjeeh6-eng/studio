'use client';

import useUserSession from '@/hooks/use-user-session';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages, ImagePlaceholder } from '@/lib/placeholder-images';
import { User as UserIcon, Loader2, CheckCircle, Image as ImageIcon, Sparkles, Wand2, User, Wallpaper } from 'lucide-react';
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
  
  const [currentAvatarId, setCurrentAvatarId] = useState<string | undefined>(user?.avatarId);
  const [selectedImage, setSelectedImage] = useState<ImagePlaceholder | null>(null);
  const [isAvatarUpdatePending, startAvatarUpdateTransition] = useTransition();

  const [generatedAvatars, setGeneratedAvatars] = useState<ImagePlaceholder[]>([]);
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);


  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
      return;
    }
    if (user) {
      setCurrentAvatarId(user.avatarId);
      // Fetch full user data to get generated avatars
      getUserData(user.name).then(fullUser => {
        if (fullUser?.generatedAvatars) {
          setGeneratedAvatars(fullUser.generatedAvatars);
        }
      });
    }
  }, [isLoaded, user, router]);

  const handleUpdateAvatar = (imageToUpdate: ImagePlaceholder) => {
    if (!user || !imageToUpdate) return;
    startAvatarUpdateTransition(async () => {
      setCurrentAvatarId(imageToUpdate.id);
      const updatedUser = { ...user, avatarId: imageToUpdate.id };
      setUser(updatedUser);
      await upsertUser(updatedUser);
      toast({ title: 'تم تحديث الصورة الرمزية بنجاح!' });
    });
  };
  
  const handleSetBackground = (imageToSet: ImagePlaceholder) => {
    if (!imageToSet) return;
    document.body.style.setProperty('--app-background-image', `url(${imageToSet.imageUrl})`);
    localStorage.setItem('app-background-image', imageToSet.imageUrl);
    toast({ title: 'تم تعيين الخلفية الجديدة!' });
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
        setSelectedImage(newAvatar);
        
        // Persist new generated avatar to user's collection in Firebase
        await upsertUser({ name: user.name, newAvatar: newAvatar });
        
        setAvatarPrompt('');
        toast({ title: "تم إنشاء الصورة الرمزية!", description: "يمكنك الآن تعيينها كصورة رمزية أو خلفية." });

    } catch (error) {
        toast({ title: "فشل إنشاء الصورة", description: "حدث خطأ أثناء محاولة إنشاء صورتك الرمزية. يرجى المحاولة مرة أخرى.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };


  const currentAvatarDetails = [...generatedAvatars, ...PlaceHolderImages].find(p => p.id === user?.avatarId) ?? PlaceHolderImages.find(p => p.id === 'avatar1');
  const allSelectableImages = [...generatedAvatars, ...PlaceHolderImages];

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
            <AvatarImage src={currentAvatarDetails?.imageUrl} alt={user.name} data-ai-hint={currentAvatarDetails?.imageHint} />
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
            <span>اختر صورتك</span>
          </CardTitle>
          <CardDescription>
            اختر صورة لتعيينها كصورة رمزية أو كخلفية للتطبيق.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {selectedImage && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 mb-6 bg-secondary/30 rounded-lg">
                <Image
                  src={selectedImage.imageUrl}
                  alt={selectedImage.description}
                  width={100}
                  height={100}
                  className="rounded-lg aspect-square object-cover border-4 border-accent"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => handleUpdateAvatar(selectedImage)} disabled={isAvatarUpdatePending}>
                    {isAvatarUpdatePending ? <Loader2 className="animate-spin me-2" /> : <User className="me-2" />}
                    تعيين كصورة رمزية
                  </Button>
                  <Button onClick={() => handleSetBackground(selectedImage)} variant="secondary">
                     <Wallpaper className="me-2" />
                    تعيين كخلفية
                  </Button>
                </div>
              </div>
            )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
             {allSelectableImages.map((img) => {
              const isSelectedForAction = selectedImage?.id === img.id;
              const isCurrentAvatar = currentAvatarId === img.id;
              const isAvatar = img.id.startsWith('avatar') || img.id.startsWith('gen');

              return (
                <div
                  key={img.id}
                  className="relative cursor-pointer group"
                  onClick={() => setSelectedImage(img)}
                >
                  <Image
                    src={img.imageUrl}
                    alt={img.description}
                    width={100}
                    height={100}
                    className={cn(
                      "w-full h-full aspect-square object-cover border-4 transition-all",
                      isAvatar ? "rounded-full" : "rounded-lg",
                      isSelectedForAction ? "border-accent ring-4 ring-accent/50" : "border-transparent group-hover:border-accent/50"
                    )}
                    data-ai-hint={img.imageHint}
                  />
                  {isCurrentAvatar && isAvatar && !isSelectedForAction && (
                    <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1 text-primary-foreground" title="الصورة الرمزية الحالية">
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
