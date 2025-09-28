'use client';

import { Armchair, Mic, MicOff, User } from 'lucide-react';
import { Member } from './RoomClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useParticipants } from '@livekit/components-react';
import { Participant } from 'livekit-client';
import { cn } from '@/lib/utils';

const Seat = ({ member, participant }: { member?: Member, participant?: Participant }) => {
    const isOccupied = !!member;
    const name = member?.name || "فارغ";
    const isMuted = participant ? participant.isMicrophoneMuted : true;
    const isSpeaking = participant ? participant.isSpeaking : false;
    const isSelf = participant?.isLocal ?? false;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-20 h-20 rounded-full bg-secondary flex items-center justify-center border-2",
                            isOccupied ? "border-primary" : "border-dashed border-border",
                            isSpeaking ? "border-accent animate-pulse" : "",
                            isSelf ? "border-accent ring-2 ring-accent" : ""
                        )}>
                            <Armchair className={cn("w-10 h-10", isOccupied ? "text-primary" : "text-muted-foreground")} />
                        </div>
                         {isOccupied && <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{name}</p>
                    {isOccupied && 
                        <p className="text-xs text-muted-foreground">
                            { isMuted ? 'الصوت مكتوم' : 'يتحدث' }
                        </p>
                    }
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


const Seats = ({ members }: { members: Member[] }) => {
    const participants = useParticipants();
    const totalSeats = 8;

    const getParticipant = (name: string) => {
        return participants.find(p => p.identity === name);
    }
  
    const filledSeats = members.map(member => ({
        member,
        participant: getParticipant(member.name)
    }));

    const emptySeats = Array(totalSeats - filledSeats.length).fill(null);
  
    return (
        <div className="w-full py-4">
            <div className="grid grid-cols-4 gap-x-4 gap-y-6">
                {filledSeats.map(({ member, participant }) => (
                    <Seat key={member.name} member={member} participant={participant} />
                ))}
                {emptySeats.map((_, index) => (
                    <Seat key={`empty-${index}`} />
                ))}
            </div>
        </div>
  );
};

export default Seats;
