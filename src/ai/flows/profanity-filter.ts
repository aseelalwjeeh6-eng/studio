'use server';

/**
 * @fileOverview AI-powered profanity filter for real-time chat.
 *
 * - filterProfanity - A function that filters profanity from text input.
 * - ProfanityFilterInput - The input type for the filterProfanity function.
 * - ProfanityFilterOutput - The return type for the filterProfanity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProfanityFilterInputSchema = z.object({
  text: z.string().describe('The text to check for profanity.'),
});
export type ProfanityFilterInput = z.infer<typeof ProfanityFilterInputSchema>;

const ProfanityFilterOutputSchema = z.object({
  isProfane: z.boolean().describe('Whether the text contains profanity.'),
  filteredText: z.string().describe('The filtered text, with profanity replaced by asterisks.'),
});
export type ProfanityFilterOutput = z.infer<typeof ProfanityFilterOutputSchema>;

export async function filterProfanity(input: ProfanityFilterInput): Promise<ProfanityFilterOutput> {
  return profanityFilterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'profanityFilterPrompt',
  input: {schema: ProfanityFilterInputSchema},
  output: {schema: ProfanityFilterOutputSchema},
  prompt: `You are a profanity filter that checks if the given text contains offensive language.

  Analyze the following text:
  {{{text}}}

  Determine if the text is profane. If it is, replace the profane words with asterisks.

  Return a JSON object with the following format:
  {
    "isProfane": true or false,
    "filteredText": "The filtered text with profanity replaced by asterisks."
  }`,
});

const profanityFilterFlow = ai.defineFlow(
  {
    name: 'profanityFilterFlow',
    inputSchema: ProfanityFilterInputSchema,
    outputSchema: ProfanityFilterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
