"use client";
import {
  LiveKitRoom as LiveKitRoomComponent,
  VideoConference,
} from '@livekit/components-react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LiveKitRoomProps {
  token: string;
  serverUrl: string;
  children: React.ReactNode;
}

const LiveKitRoom = ({ token, serverUrl, children }: LiveKitRoomProps) => {
  const [connect, setConnect] = useState(false);
  useEffect(() => {
    // This is a workaround to defer connection to LiveKit until the client is hydrated
    // and to prevent connection errors with React 18's strict mode.
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
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connect={connect}
      data-lk-theme="default"
    >
        {children}
    </LiveKitRoomComponent>
  );
};

export default LiveKitRoom;
