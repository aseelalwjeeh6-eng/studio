'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye, User, Volume2 } from 'lucide-react';
import { Member } from './RoomClient';


interface ViewerInfoProps {
  members: Member[];
}

const ViewerInfo = ({ members }: ViewerInfoProps) => {
  const viewerCount = members.length;
  const firstViewer = members[0];

  return (
    <div className="w-full bg-card rounded-lg p-2 flex items-center justify-between text-sm">
        <div className='flex items-center gap-2'>
            {firstViewer ? (
                <Avatar className="w-6 h-6">
                    <AvatarFallback>{firstViewer.name.charAt(0)}</AvatarFallback>
                </Avatar>
            ) : (
                <div className='w-6 h-6 rounded-full bg-secondary flex items-center justify-center'>
                    <User className="w-4 h-4 text-muted-foreground"/>
                </div>
            )}
        </div>
      
        <div className="flex items-center gap-2 text-muted-foreground">
            <Volume2 className="h-4 w-4" />
            <span>{viewerCount} مشاهد</span>
        </div>
    </div>
  );
};

export default ViewerInfo;
