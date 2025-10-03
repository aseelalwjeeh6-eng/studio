'use client';

import {
  LiveKitRoom as LiveKitRoomComponent,
  useRoomContext,
} from '@livekit/components-react';
import { Loader2 } from 'lucide-react';
import type { User } from '@/app/providers';
import { ConnectionState } from 'livekit-client';

interface LiveKitRoomProps {
  token: string;
  serverUrl: string;
  user: User;
  isSeated: boolean;
  videoMode: boolean;
  children: React.ReactNode;
}

const RoomLayoutWithConnectivity = ({ isSeated, videoMode, children }: Pick<LiveKitRoomProps, 'isSeated' | 'videoMode' | 'children'>) => {
    const room = useRoomContext();
    const isConnected = room.connectionState === ConnectionState.Connected;

    // Enable audio/video only when the user is seated AND the room is connected.
    room.localParticipant.setCameraEnabled(videoMode && isSeated && isConnected);
    room.localParticipant.setMicrophoneEnabled(isSeated && isConnected);

    return <>{children}</>;
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
      token={token}
      serverUrl={serverUrl}
      connect={true}
      connectOptions={{ autoSubscribe: true }}
      data-lk-theme="default"
    >
      <RoomLayoutWithConnectivity isSeated={isSeated} videoMode={videoMode}>
        {children}
      </RoomLayoutWithConnectivity>
    </LiveKitRoomComponent>
  );
};

export default LiveKitRoom;
