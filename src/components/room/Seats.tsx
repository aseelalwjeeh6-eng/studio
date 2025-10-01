'use client';

import { Armchair, MicOff, User, LogOut, ShieldX, Crown, ShieldCheck, ArrowDownUp } from 'lucide-react';
import { SeatedMember } from './RoomClient';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { Participant, Room } from 'livekit-client';
import { cn } from '@/lib/utils';
import { User as UserSession } from '@/app/providers';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const Seat = ({ 
    seatId,
    seatedMember, 
    participant,
    moderators,
    onTakeSeat,
    currentUser,
    isHost,
    onKickUser,
    isCurrentUserSeated,
    onLeaveSeat,
    onPromote,
    onDemote,
    onTransferHost,
    room,
}: { 
    seatId: number;
    seatedMember?: SeatedMember;
    participant?: Participant;
    moderators: string[];
    onTakeSeat: (seatId: number) => void;
    currentUser: UserSession;
    isHost: boolean;
    onKickUser: (userName: string) => void;
    isCurrentUserSeated: boolean;
    onLeaveSeat: () => void;
    onPromote: (userName: string) => void;
    onDemote: (userName: string) => void;
    onTransferHost: (userName: string) => void;
    room?: Room;
}) => {
    const isOccupied = !!seatedMember;
    const isCurrentUserSeatedHere = isOccupied && seatedMember.name === currentUser.name;
    
    const isMemberModerator = seatedMember ? moderators.includes(seatedMember.name) : false;
    const isCurrentUserModerator = moderators.includes(currentUser.name);
    
    const isMuted = participant ? participant.isMicrophoneMuted : true;
    const isSpeaking = participant ? participant.isSpeaking : false;
    
    const avatar = PlaceHolderImages.find(p => p.id === seatedMember?.avatarId) ?? PlaceHolderImages[0];

    const canKick = (isHost || isCurrentUserModerator) && seatedMember && seatedMember.name !== currentUser.name && (!moderators.includes(seatedMember.name) || isHost);
    
    const handleRemoteMute = () => {
        if (!participant || !room) return;
        if (isHost || (isCurrentUserModerator && !isMemberModerator)) {
            const micTrack = participant.getTrackPublication(Participant.Source.Microphone);
            if (micTrack?.track) {
                room.localParticipant.setTrackMuted(micTrack.trackSid, true);
            }
        }
    };

    const controls = (isHost || (isCurrentUserModerator && !isMemberModerator)) && participant && !isCurrentUserSeatedHere && (
        <DropdownMenuContent>
            {isHost && (
                <>
                    {isMemberModerator ? (
                        <DropdownMenuItem onClick={() => onDemote(seatedMember!.name)}>
                            <ArrowDownUp className="me-2" /> تخفيض إلى عضو
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={() => onPromote(seatedMember!.name)}>
                            <ShieldCheck className="me-2" /> ترقية إلى مشرف
                        </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Crown className="me-2" /> نقل الملكية
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل تريد نقل ملكية الغرفة؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                   سيتم منح {seatedMember!.name} جميع صلاحيات المضيف، وستفقد صلاحياتك كمضيف. لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onTransferHost(seatedMember!.name)}>
                                    نعم، قم بنقل الملكية
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    
                    <DropdownMenuSeparator />
                </>
            )}

            {!isMuted && (
              <DropdownMenuItem onClick={handleRemoteMute}>
                  <MicOff className="me-2" /> كتم الصوت
              </DropdownMenuItem>
            )}
            
            {canKick && (
                <DropdownMenuItem onClick={() => onKickUser(seatedMember!.name)} className="text-destructive">
                    <ShieldX className="me-2" /> طرد من الغرفة
                </DropdownMenuItem>
            )}
        </DropdownMenuContent>
    );
    
    const canTakeSeat = !isOccupied && !isCurrentUserSeated;

    const seatContent = () => {
        if (isOccupied) {
            return (
                <div className="relative">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!controls}>
                             <Avatar className={cn(
                                "w-16 h-16 border-2 cursor-pointer",
                                isSpeaking ? "border-accent animate-pulse" : "border-transparent",
                                isCurrentUserSeatedHere ? "border-accent ring-2 ring-accent" : ""
                            )}>
                                <AvatarImage src={avatar?.imageUrl} alt={seatedMember!.name} />
                                <AvatarFallback>
                                    <User className="w-8 h-8" />
                                </AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        {controls}
                    </DropdownMenu>
                </div>
            )
        }
        return (
            <button 
                onClick={() => onTakeSeat(seatId)} 
                className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-border hover:border-accent transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canTakeSeat}
            >
                <Armchair className="w-8 h-8 text-muted-foreground" />
            </button>
        )
    };
    
    const nameText = isOccupied ? (isCurrentUserSeatedHere ? "أنت" : seatedMember.name) : "شاغر";
    const getRoleIcon = () => {
        if(!seatedMember) return null;
        if(isHost && seatedMember.name === currentUser.name) return <Crown className='w-4 h-4 text-yellow-400' />;
        if(isMemberModerator) return <ShieldCheck className='w-4 h-4 text-blue-400' />;
        return null;
    }
    const roleIcon = getRoleIcon();

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2">
                        {seatContent()}
                         <div className="flex items-center gap-1">
                             {roleIcon}
                             <p className="text-sm font-semibold text-foreground truncate w-20 text-center">{nameText}</p>
                         </div>
                         {isCurrentUserSeatedHere && (
                            <Button onClick={onLeaveSeat} variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">
                                <LogOut className="me-1 w-3 h-3" />
                                مغادرة
                            </Button>
                         )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{seatedMember?.name || (canTakeSeat ? "خذ مقعدًا" : "شاغر")}</p>
                     {isOccupied && (
                        <p className="text-xs text-muted-foreground">
                            { isSpeaking ? 'يتحدث...' : (isMuted ? 'الصوت مكتوم' : 'الميكروفون مفتوح') }
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const Seats = ({ 
    seatedMembers, 
    moderators,
    onTakeSeat, 
    onLeaveSeat, 
    currentUser,
    isHost,
    onKickUser,
    onPromote,
    onDemote,
    onTransferHost,
    room,
}: { 
    seatedMembers: SeatedMember[],
    moderators: string[],
    onTakeSeat: (seatId: number) => void;
    onLeaveSeat: () => void;
    currentUser: UserSession;
    isHost: boolean;
    onKickUser: (userName: string) => void;
    onPromote: (userName: string) => void;
    onDemote: (userName: string) => void;
    onTransferHost: (userName: string) => void;
    room?: Room;
}) => {
    const totalSeats = 8;
  
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
  
    const allParticipants = [localParticipant, ...participants];

    const getParticipant = (name: string): Participant | undefined => {
      return allParticipants.find(p => p.identity === name);
    };

    const isCurrentUserSeated = seatedMembers.some(m => m.name === currentUser.name);
  
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
        <div className="w-full bg-card rounded-lg p-4">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-4 gap-y-6">
                {seats.map(({ seatId, seatedMember, participant }) => (
                    <Seat 
                        key={seatId} 
                        seatId={seatId}
                        seatedMember={seatedMember} 
                        participant={participant}
                        moderators={moderators}
                        onTakeSeat={onTakeSeat}
                        currentUser={currentUser}
                        isHost={isHost || seatedMember?.name === currentUser.name}
                        onKickUser={onKickUser}
                        isCurrentUserSeated={isCurrentUserSeated}
                        onLeaveSeat={onLeaveSeat}
                        onPromote={onPromote}
                        onDemote={onDemote}
                        onTransferHost={onTransferHost}
                        room={room}
                    />
                ))}
            </div>
        </div>
  );
};

export default Seats;
