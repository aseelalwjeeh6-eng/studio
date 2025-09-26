'use client';

import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { User } from '@/app/providers';

interface ViewerInfoProps {
  members: Partial<User & { joinedAt: object }>[];
}

const ViewerInfo = ({ members }: ViewerInfoProps) => {
  const viewerCount = members.length;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-2 text-lg py-2 px-4 bg-card/50 backdrop-blur-sm border-accent/30">
        <Eye className="h-5 w-5 text-accent" />
        <span>{viewerCount}</span>
      </Badge>
    </div>
  );
};

export default ViewerInfo;
