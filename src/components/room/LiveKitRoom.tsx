'use client';

import {
  LiveKitRoom as LiveKitRoomComponent,
} from '@livekit/components-react';
import { Loader2 } from 'lucide-react';
import type { User } from '@/app/providers';

interface LiveKitRoomProps {
  token: string;
  serverUrl: string;
  user: User;
  isSeated: boolean;
  videoMode: boolean;
  children: React.ReactNode;
}

const LiveKitRoom = ({ token, serverUrl, user, isSeated, videoMode, children }: LiveKitRoomProps) => {
  
  if (!token || !serverUrl) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-accent" />
            <p className="ms-4 text-muted-foreground">Connecting to room...</p>
        </div>
    );
  }

  return (
    <LiveKitRoomComponent
      video={videoMode && isSeated}
      audio={isSeated}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      connectOptions={{ autoSubscribe: true }}
      data-lk-theme="default"
    >
        {children}
    </LiveKitRoomComponent>
  );
};

export default LiveKitRoom;
