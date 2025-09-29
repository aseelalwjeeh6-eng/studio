'use server';

/**
 * @fileOverview A flow for creating a new room.
 *
 * - createRoom - A function that handles the room creation process.
 * - RoomCreationInput - The input type for the createRoom function.
 * - RoomCreationOutput - The return type for the createRoom function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { database } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

const RoomCreationInputSchema = z.object({
  hostName: z.string().describe('The name of the user hosting the room.'),
  avatarId: z.string().describe('The avatar ID of the host.'),
  isPrivate: z.boolean().describe('Whether the room should be private.'),
});
export type RoomCreationInput = z.infer<typeof RoomCreationInputSchema>;

const RoomCreationOutputSchema = z.object({
  roomId: z.string().describe('The ID of the newly created room.'),
});
export type RoomCreationOutput = z.infer<typeof RoomCreationOutputSchema>;

export async function createRoom(input: RoomCreationInput): Promise<RoomCreationOutput> {
  return roomCreationFlow(input);
}

const roomCreationFlow = ai.defineFlow(
  {
    name: 'roomCreationFlow',
    inputSchema: RoomCreationInputSchema,
    outputSchema: RoomCreationOutputSchema,
  },
  async ({ hostName, avatarId, isPrivate }) => {
    const newRoomId = uuidv4();
    const roomRef = ref(database(), `rooms/${newRoomId}`);
    const roomData = {
      host: hostName,
      createdAt: Date.now(),
      videoUrl: '',
      seatedMembers: {},
      members: {},
      isPrivate: isPrivate,
      authorizedMembers: isPrivate ? { [hostName]: true } : {},
      moderators: [],
      playlist: [],
    };

    await set(roomRef, roomData);

    return { roomId: newRoomId };
  }
);
