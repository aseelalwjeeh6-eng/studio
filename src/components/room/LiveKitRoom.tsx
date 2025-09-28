'use client';

import {
  LiveKitRoom as LiveKitRoomComponent,
  useLocalParticipant,
} from '@livekit/components-react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { User } from '@/app/providers';
import type { SeatedMember } from './RoomClient';

interface LiveKitRoomProps {
  token: string;
  serverUrl: string;
  user: User;
  seatedMembers: SeatedMember[];
  children: React.ReactNode;
}

const LiveKitRoom = ({ token, serverUrl, user, seatedMembers, children }: LiveKitRoomProps) => {
  const [connect, setConnect] = useState(false);
  const isSeated = seatedMembers.some(m => m.name === user.name);

  useEffect(() => {
    setConnect(true);
  }, []);
  
  if (!token || !serverUrl) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-accent" />
            <p className="ms-4 text-muted-foreground">Connecting to audio...</p>
        </div>
    );
  }

  return (
    <LiveKitRoomComponent
      video={false}
      audio={isSeated} // Only connect audio if the user is seated
      token={token}
      serverUrl={serverUrl}
      connect={connect}
      connectOptions={{ autoSubscribe: true }}
      data-lk-theme="default"
    >
        {children}
    </LiveKitRoomComponent>
  );
};

export default LiveKitRoom;
