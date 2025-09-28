'use client';

import { Armchair, Mic, MicOff, User, LogOut, ShieldX, MoreVertical } from 'lucide-react';
import { SeatedMember } from './RoomClient';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocalParticipant, useParticipant, useParticipants } from '@livekit/components-react';
import { Participant } from 'livekit-client';
import { cn } from '@/lib/utils';
import { User as UserSession } from '@/app/providers';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useState } from 'react';

const Seat = ({ 
    seatId,
    seatedMember, 
    participant,
    onTakeSeat,
    onLeaveSeat,
    currentUser,
    isHost,
    onKickUser,
}: { 
    seatId: number;
    seatedMember?: SeatedMember;
    participant?: Participant;
    onTakeSeat: (seatId: number) => void;
    onLeaveSeat: () => void;
    currentUser: UserSession;
    isHost: boolean;
    onKickUser: (userName: string) => void;
}) => {
    const isOccupied = !!seatedMember;
    const isCurrentUserSeatedHere = isOccupied && seatedMember.name === currentUser.name;
    const { localParticipant } = useLocalParticipant();

    // Local mute state for host controls, as remote mute is a premium feature.
    const [isLocallyMuted, setIsLocallyMuted] = useState(false);

    const isMuted = participant ? participant.isMicrophoneMuted : true;
    const isSpeaking = participant ? participant.isSpeaking : false;
    
    const avatar = PlaceHolderImages.find(p => p.id.startsWith('avatar'));

    const toggleMute = () => {
        if (isCurrentUserSeatedHere && localParticipant) {
            const isMuted = localParticipant.isMicrophoneMuted;
            localParticipant.setMicrophoneEnabled(!isMuted);
        }
    };
    
    const handleMuteToggleForUser = () => {
        if (!isHost || !seatedMember || isCurrentUserSeatedHere) return;
        // This is a UI-only mute for now, as remote muting requires more complex permissions.
        // A full implementation would require a server-side call to LiveKit.
        setIsLocallyMuted(!isLocallyMuted);
    }

    const hostControls = isHost && isOccupied && !isCurrentUserSeatedHere && (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-secondary/80 hover:bg-secondary">
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={handleMuteToggleForUser}>
                    {isLocallyMuted ? <Mic className="me-2" /> : <MicOff className="me-2" />}
                    {isLocallyMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onKickUser(seatedMember.name)} className="text-destructive">
                    <ShieldX className="me-2" />
                    طرد من الغرفة
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const seatContent = () => {
        if (isOccupied) {
            return (
                <div className="relative">
                    {hostControls}
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

    const name = isOccupied ? (isCurrentUserSeatedHere ? "أنت" : seatedMember.name) : "شاغر";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2">
                        {seatContent()}
                         <p className="text-sm font-semibold text-foreground truncate w-24 text-center">{name}</p>
                         {isCurrentUserSeatedHere && (
                            <Button onClick={onLeaveSeat} variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">
                                <LogOut className="me-1 w-3 h-3" />
                                مغادرة
                            </Button>
                         )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{seatedMember?.name || "شاغر"}</p>
                     {isOccupied && participant && (
                        <p className="text-xs text-muted-foreground">
                            { isSpeaking ? 'يتحدث...' : ((isMuted || isLocallyMuted) ? 'الصوت مكتوم' : 'الميكروفون مفتوح') }
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


const Seats = ({ 
    seatedMembers, 
    onTakeSeat, 
    onLeaveSeat, 
    currentUser,
    isHost,
    onKickUser
}: { 
    seatedMembers: SeatedMember[],
    onTakeSeat: (seatId: number) => void;
    onLeaveSeat: () => void;
    currentUser: UserSession;
    isHost: boolean;
    onKickUser: (userName: string) => void;
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
                        isHost={isHost}
                        onKickUser={onKickUser}
                    />
                ))}
            </div>
        </div>
  );
};

export default Seats;

    