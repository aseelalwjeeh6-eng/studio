'use client';
import {
  LiveKitRoom as LiveKitRoomComponent,
  VideoConference,
} from '@livekit/components-react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LiveKitRoomProps {
  token: string;
  serverUrl: string;
}

const LiveKitRoom = ({ token, serverUrl }: LiveKitRoomProps) => {
  const [connect, setConnect] = useState(false);
  useEffect(() => {
    // This is a workaround to defer connection to LiveKit until the client is hydrated
    // and to prevent connection errors with React 18's strict mode.
    setConnect(true);
  }, []);

  return (
    <LiveKitRoomComponent
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connect={connect}
      data-lk-theme="default"
      style={{ height: '100%' }}
    >
      <VideoConference />
    </LiveKitRoomComponent>
  );
};

export default LiveKitRoom;
