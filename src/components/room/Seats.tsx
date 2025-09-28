'use client';

import { Armchair, Mic, MicOff, User } from 'lucide-react';
import { Member } from './RoomClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useParticipants, useTracks } from '@livekit/components-react';
import { Participant, Track } from 'livekit-client';
import { cn } from '@/lib/utils';

const getAvatar = (name: string) => {
    const images = PlaceHolderImages.filter(p => p.id.startsWith('avatar'));
    // Simple hash function to get a consistent avatar for a user
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return images[hash % images.length];
};

const Seat = ({ member, participant }: { member: Member, participant?: Participant }) => {
    const avatar = getAvatar(member.name);
    const isMuted = participant ? participant.isMicrophoneMuted : true;
    const isSpeaking = participant ? participant.isSpeaking : false;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 relative">
                        <div className={cn("absolute -top-2 -right-2 p-1 bg-background rounded-full transition-all duration-300", isSpeaking ? 'opacity-100 scale-100' : 'opacity-0 scale-50')}>
                             {isMuted ? <MicOff className="w-4 h-4 text-destructive" /> : <Mic className="w-4 h-4 text-green-500" />}
                        </div>
                        <Avatar className={cn("w-20 h-20 border-4", isSpeaking ? 'border-accent' : 'border-transparent')}>
                             <AvatarImage src={avatar?.imageUrl} alt={member.name} data-ai-hint={avatar?.imageHint} />
                            <AvatarFallback>
                                <User />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                            <Armchair className="w-8 h-8 text-accent/50" />
                        </div>
                         <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                        { isMuted ? 'الصوت مكتوم' : 'يتحدث' }
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


const Seats = ({ members }: { members: Member[] }) => {
    const participants = useParticipants();

    const getParticipant = (name: string) => {
        return participants.find(p => p.identity === name);
    }
  
    return (
    <Card className="bg-card/50 backdrop-blur-lg border-accent/20 p-4 h-full">
      <CardHeader className="p-2 text-center">
        <CardTitle>المقاعد</CardTitle>
        <CardDescription>الأعضاء المتواجدون في الغرفة</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {members.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {members.map((member) => (
              <Seat key={member.name} member={member} participant={getParticipant(member.name)} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">لا يوجد أحد في الغرفة بعد.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default Seats;
