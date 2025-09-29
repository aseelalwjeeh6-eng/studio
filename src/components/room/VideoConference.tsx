'use client';

import {
  GridLayout,
  ParticipantTile,
  useParticipants,
} from '@livekit/components-react';
import { Participant } from 'livekit-client';

export default function VideoConference() {
  const participants = useParticipants();

  if (participants.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <GridLayout
      participants={participants}
      className="h-full w-full"
    >
      <ParticipantTile />
    </GridLayout>
  );
}
