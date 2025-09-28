'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, User, Users } from 'lucide-react';
import { Member } from './RoomClient';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface ViewerInfoProps {
  members: Member[];
}

const ViewerInfo = ({ members }: ViewerInfoProps) => {
  const viewerCount = members.length;
  const displayedViewers = members.slice(0, 5);
  const hiddenViewersCount = Math.max(0, viewerCount - displayedViewers.length);

  return (
    <TooltipProvider>
    <div className="w-full bg-card rounded-lg p-2 flex items-center justify-between text-sm">
        <div className='flex items-center -space-x-2'>
            {displayedViewers.map(member => (
                <Tooltip key={member.name}>
                    <TooltipTrigger>
                        <Avatar className="w-6 h-6 border-2 border-background">
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{member.name}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
             {hiddenViewersCount > 0 && (
                <Tooltip>
                    <TooltipTrigger>
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs border-2 border-background">
                            +{hiddenViewersCount}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{hiddenViewersCount} مشاهدين آخرين</p>
                    </TooltipContent>
                </Tooltip>
            )}
            {viewerCount === 0 && (
                 <div className='flex items-center text-muted-foreground gap-2 ps-2'>
                    <User className="w-4 h-4"/>
                    <span>لا يوجد مشاهدين حاليًا</span>
                </div>
            )}
        </div>
      
        <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{viewerCount} مشاهد</span>
        </div>
    </div>
    </TooltipProvider>
  );
};

export default ViewerInfo;
