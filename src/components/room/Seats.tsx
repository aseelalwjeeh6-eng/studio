'use client';

import { Armchair, Mic, MicOff, User, LogOut } from 'lucide-react';
import { SeatedMember } from './RoomClient';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocalParticipant, useParticipant, useParticipants, useTracks } from '@livekit/components-react';
import { LocalParticipant, Participant, Track } from 'livekit-client';
import { cn } from '@/lib/utils';
import { User as UserSession } from '@/app/providers';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const Seat = ({ 
    seatId,
    seatedMember, 
    participant,
    onTakeSeat,
    onLeaveSeat,
    currentUser,
}: { 
    seatId: number;
    seatedMember?: SeatedMember;
    participant?: Participant;
    onTakeSeat: (seatId: number) => void;
    onLeaveSeat: () => void;
    currentUser: UserSession;
}) => {
    const isOccupied = !!seatedMember;
    const isCurrentUserSeatedHere = isOccupied && seatedMember.name === currentUser.name;
    const { localParticipant } = useLocalParticipant();

    const isMuted = participant ? participant.isMicrophoneMuted : true;
    const isSpeaking = participant ? participant.isSpeaking : false;
    
    const avatar = PlaceHolderImages.find(p => p.id.startsWith('avatar'));

    const toggleMute = () => {
        if (isCurrentUserSeatedHere && localParticipant) {
            const isMuted = localParticipant.isMicrophoneMuted;
            localParticipant.setMicrophoneEnabled(!isMuted);
        }
    };

    const seatContent = () => {
        if (isOccupied) {
            return (
                <div className="relative">
                    <Avatar className={cn(
                        "w-20 h-20 border-2",
                        isSpeaking ? "border-accent animate-pulse" : "border-primary",
                        isCurrentUserSeatedHere ? "border-accent ring-2 ring-accent" : ""
                    )}>
                        <AvatarImage src={avatar?.imageUrl} />
                        <AvatarFallback>
                            <User className="w-10 h-10" />
                        </AvatarFallback>
                    </Avatar>
                     {participant && (
                        <div className="absolute -bottom-2 -right-2">
                             <Button size="icon" onClick={toggleMute} className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80">
                                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-accent" />}
                            </Button>
                        </div>
                    )}
                </div>
            )
        }
        return (
            <button onClick={() => onTakeSeat(seatId)} className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-border hover:border-accent transition-colors">
                <Armchair className="w-10 h-10 text-muted-foreground" />
            </button>
        )
    };

    const name = isOccupied ? (isCurrentUserSeatedHere ? "أنت" : seatedMember.name) : "فارغ";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2">
                        {seatContent()}
                         <p className="text-sm font-semibold text-foreground truncate w-24 text-center">{seatedMember?.name || "شاغر"}</p>
                         {isCurrentUserSeatedHere && (
                            <Button onClick={onLeaveSeat} variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">
                                <LogOut className="me-1 w-3 h-3" />
                                مغادرة
                            </Button>
                         )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{name}</p>
                     {isOccupied && participant && (
                        <p className="text-xs text-muted-foreground">
                            { isSpeaking ? 'يتحدث...' : (isMuted ? 'الصوت مكتوم' : 'الميكروفون مفتوح') }
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


const Seats = ({ seatedMembers, onTakeSeat, onLeaveSeat, currentUser }: { 
    seatedMembers: SeatedMember[],
    onTakeSeat: (seatId: number) => void;
    onLeaveSeat: () => void;
    currentUser: UserSession;
}) => {
    const participants = useParticipants();
    const totalSeats = 8;

    const getParticipant = (name: string) => {
        return participants.find(p => p.identity === name);
    }
  
    const seats = Array.from({ length: totalSeats }, (_, index) => {
        const seatId = index + 1;
        const seatedMember = seatedMembers.find(m => m.seatId === seatId);
        return {
            seatId,
            seatedMember,
            participant: seatedMember ? getParticipant(seatedMember.name) : undefined,
        };
    });
  
    return (
        <div className="w-full py-4">
            <div className="grid grid-cols-4 gap-x-4 gap-y-8">
                {seats.map(({ seatId, seatedMember, participant }) => (
                    <Seat 
                        key={seatId} 
                        seatId={seatId}
                        seatedMember={seatedMember} 
                        participant={participant}
                        onTakeSeat={onTakeSeat}
                        onLeaveSeat={onLeaveSeat}
                        currentUser={currentUser}
                    />
                ))}
            </div>
        </div>
  );
};

export default Seats;
