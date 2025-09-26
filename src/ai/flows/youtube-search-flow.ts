'use server';

/**
 * @fileOverview A flow for searching YouTube videos.
 *
 * - searchYoutube - A function that searches YouTube for videos.
 * - YoutubeSearchInput - The input type for the searchYoutube function.
 * - YoutubeSearchOutput - The return type for the searchYoutube function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const YoutubeSearchInputSchema = z.object({
  query: z.string().describe('The search query for YouTube.'),
});
export type YoutubeSearchInput = z.infer<typeof YoutubeSearchInputSchema>;

const YoutubeVideoSchema = z.object({
  id: z.object({
    videoId: z.string(),
  }),
  snippet: z.object({
    title: z.string(),
    thumbnails: z.object({
      default: z.object({
        url: z.string(),
      }),
    }),
  }),
});

const YoutubeSearchOutputSchema = z.object({
  items: z.array(YoutubeVideoSchema),
});
export type YoutubeSearchOutput = z.infer<typeof YoutubeSearchOutputSchema>;

async function doYoutubeSearch(query: string): Promise<YoutubeSearchOutput> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set');
  }
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(
    query
  )}&key=${apiKey}&type=video`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`YouTube API request failed with status ${response.status}: ${errorBody}`);
    }
    const data = await response.json();
    return YoutubeSearchOutputSchema.parse(data);
  } catch (error) {
    console.error('Error searching YouTube:', error);
    throw new Error('Failed to search YouTube.');
  }
}

export const searchYoutubeTool = ai.defineTool(
    {
      name: 'searchYoutubeTool',
      description: 'Searches YouTube for videos based on a query.',
      inputSchema: YoutubeSearchInputSchema,
      outputSchema: YoutubeSearchOutputSchema,
    },
    async (input) => doYoutubeSearch(input.query),
);


const youtubeSearchFlow = ai.defineFlow(
  {
    name: 'youtubeSearchFlow',
    inputSchema: YoutubeSearchInputSchema,
    outputSchema: YoutubeSearchOutputSchema,
  },
  async (input) => {
    return await doYoutubeSearch(input.query);
  }
);

export async function searchYoutube(input: YoutubeSearchInput): Promise<YoutubeSearchOutput> {
  return youtubeSearchFlow(input);
}
