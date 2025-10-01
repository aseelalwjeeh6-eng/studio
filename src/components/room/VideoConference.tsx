'use client';

import {
  GridLayout,
  ParticipantTile,
  useParticipants,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { Participant } from 'livekit-client';
import { Loader2 } from 'lucide-react';
import useUserSession from '@/hooks/use-user-session';
import { useMemo } from 'react';
import { useLocalParticipant } from '@livekit/components-react';


export default function VideoConference() {
  const allParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const participants = useMemo(() => {
    // We need to ensure allParticipants is an array before spreading it.
    if (!allParticipants) return [localParticipant];
    return [localParticipant, ...allParticipants];
  }, [localParticipant, allParticipants]);

  // Add a specific check to ensure the hook has returned a valid array.
  if (!allParticipants) {
    return <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <p className="ms-4">يتم تحميل المشاركين...</p>
    </div>;
  }

  return (
    <>
        <RoomAudioRenderer />
        <GridLayout
            participants={participants}
            className="h-full w-full"
        >
            <ParticipantTile />
        </GridLayout>
    </>
  );
}
