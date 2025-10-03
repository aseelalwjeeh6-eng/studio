'use client';

import {
  GridLayout,
  ParticipantTile,
  useParticipants,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

export default function VideoConference() {
  const allParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const participants = useMemo(() => {
    return [localParticipant, ...allParticipants];
  }, [localParticipant, allParticipants]);

  if (!participants || participants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <p className="ms-4">يتم تحميل المشاركين...</p>
      </div>
    );
  }

  return (
    <>
      <RoomAudioRenderer />
      <GridLayout participants={participants} className="h-full w-full">
        <ParticipantTile />
      </GridLayout>
    </>
  );
}
